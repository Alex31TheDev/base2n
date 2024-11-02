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
    charSplitCount = parseInt(charSplitCountStr, 10);

    if (isNaN(charSplitCount)) {
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

if (fs.existsSync(outputDir)) {
    const outputExp = new RegExp(Util.escapeRegex(inputName) + "_part\\d+?" + Util.escapeRegex(inputExt)),
        files = fs.readdirSync(outputDir).filter(name => outputExp.test(name));

    try {
        files.forEach(name => {
            const filePath = path.join(outputDir, name);
            fs.unlinkSync(filePath);
        });
    } catch (err) {
        console.error(`ERROR: Occured while trying to delete existing files:`, err);
        process.exit(1);
    }

    console.log("Deleted existing files.", "\n");
} else {
    try {
        fs.mkdirSync(outputDir, { recursive: true });
    } catch (err) {
        console.error(`ERROR: Occured while trying to create directory ${outputDir}:`, err);
        process.exit(1);
    }

    console.log("Created output directory.", "\n");
}

let data;

try {
    data = fs.readFileSync(filePath, {
        encoding: defaultEncoding
    });
} catch (err) {
    console.error(`ERROR: Occured while reading file ${filePath}:`, err);
    process.exit(1);
}

const chunks = split(data, charSplitCount);

chunks.forEach((chunk, index) => {
    const outputPath = path.join(outputDir, `${inputName}_part${index + 1}` + inputExt);

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

console.log("\nFinished splitting file.");
