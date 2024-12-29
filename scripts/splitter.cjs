const fs = require("fs");
const path = require("path");

const defaultSplitCount = 20 * 1024,
    defaultEncoding = "utf8";

function split(str, count) {
    const chars = Array.from(str),
        chunks = [];

    for (let i = 0; i < chars.length; i += count) {
        const chunk = chars.slice(i, i + count).join("");
        chunks.push(chunk);
    }

    return chunks;
}

const Util = {
    regexEscapeExp: /[.*+?^${}()|[\]\\]/g,
    escapeRegex: str => {
        return str.replace(Util.regexEscapeExp, "\\$&");
    }
};

const usage = 'Usage: node splitter.cjs filePath [outputDir = fileDir/split ("default")] [charSplitCount = 20 * 1024]';

function parseArgs() {
    const args = process.argv.slice(2);

    const filePath = args[0];

    let outputDir = args[1] ?? "default",
        charSplitCount = args[2] ?? defaultSplitCount;

    if (typeof filePath === "undefined") {
        console.error("ERROR: No file path provided.", "\n");
        console.log(usage);

        process.exit(1);
    }

    if (typeof charSplitCount === "string") {
        const charSplitCountStr = charSplitCount;
        charSplitCount = Number.parseInt(charSplitCountStr, 10);

        if (Number.isNaN(charSplitCount)) {
            console.error("ERROR: Invalid split count:", charSplitCountStr, "\n");
            console.log(usage);

            process.exit(1);
        }
    }

    const inputDir = path.dirname(filePath),
        inputExt = path.extname(filePath),
        inputName = path.basename(filePath, inputExt);

    if (outputDir === "default") {
        outputDir = path.resolve(inputDir, "split");
    } else {
        outputDir = path.resolve(outputDir);
    }

    return {
        filePath,
        inputExt,
        inputName,
        outputDir,

        charSplitCount
    };
}

function deleteExistingFiles(args) {
    const outputExp = new RegExp(Util.escapeRegex(args.inputName) + "_part\\d+?" + Util.escapeRegex(args.inputExt)),
        files = fs.readdirSync(args.outputDir).filter(name => outputExp.test(name));

    try {
        files.forEach(name => {
            const filePath = path.join(args.outputDir, name);
            fs.unlinkSync(filePath);
        });
    } catch (err) {
        console.error(`ERROR: Occured while trying to delete existing files:`, err);
        process.exit(1);
    }

    console.log("Deleted existing files.", "\n");
}

function createOutputDir(args) {
    try {
        fs.mkdirSync(args.outputDir, { recursive: true });
    } catch (err) {
        console.error(`ERROR: Occured while trying to create directory ${args.outputDir}:`, err);
        process.exit(1);
    }

    console.log("Created output directory.", "\n");
}

function readInputFile(args) {
    let data;

    try {
        data = fs.readFileSync(args.filePath, {
            encoding: defaultEncoding
        });
    } catch (err) {
        console.error(`ERROR: Occured while reading file ${args.filePath}:`, err);
        process.exit(1);
    }

    return data;
}

function writeChunks(data, args) {
    function getPartName(num) {
        return `${args.inputName}_part${num + 1}` + args.inputExt;
    }

    const chunks = split(data, args.charSplitCount);

    chunks.forEach((chunk, num) => {
        const outputPath = path.join(args.outputDir, getPartName(num));

        try {
            fs.writeFileSync(outputPath, chunk, {
                encoding: defaultEncoding
            });

            console.log(`Written: ${outputPath}`);
        } catch (err) {
            console.error(`ERROR: Occured while writing file ${outputPath}:`, err);
            process.exit(1);
        }
    });
}

function main() {
    const args = parseArgs();

    if (fs.existsSync(args.outputDir)) {
        deleteExistingFiles(args);
    } else {
        createOutputDir(args);
    }

    const data = readInputFile(args);
    writeChunks(data, args);

    console.log("\nFinished splitting file.");
}

main();
