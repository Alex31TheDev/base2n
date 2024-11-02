import fs from "fs";
import path from "path";

import assert from "assert";
import crypto from "crypto";

import { Base2nTable, Base2nTableTypes, encodeBase2n, decodeBase2n } from "../index.js";

const defaultCharset = String.fromCodePoint(0x0021, 0xd7ff, 0xe000, 0xe000 - (0xd7ff - 0x0021 + 1) + 2 ** 20 - 1),
    tableType = Base2nTableTypes.buffer,
    predictSize = true;

const outputEncoding = "utf8";

const Util = {
    round: (num, digits) => {
        const exp = 10 ** digits;
        return Math.round((num + Number.EPSILON) * exp) / exp;
    },

    parseBool: str => {
        str = String(str).toLowerCase();

        switch (str) {
            case "false":
                return false;
            case "true":
                return true;
        }
    },

    formatRange: (range, size) => {
        let format = `${range.map(x => String.fromCodePoint(x)).join("-")} (${range.join("-")}`;

        if (typeof size !== "undefined") {
            const s = size !== 1 ? "s" : "";
            format += `, ${size} char${s}`;
        }

        format += ")";
        return format;
    }
};

class HashUtil {
    static hashData(data, hashType = "sha1") {
        const hash = crypto.createHash(hashType);
        hash.setEncoding("hex");

        hash.write(data);
        hash.end();

        return hash.read();
    }

    static hashFile(path, hashType = "sha1") {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash(hashType),
                stream = fs.createReadStream(path);

            hash.setEncoding("hex");

            stream.once("error", err => reject(err));
            stream.pipe(hash);

            stream.once("end", _ => {
                hash.end();
                resolve(hash.read());
            });
        });
    }
}

const usage =
        'Usage: node ./examples/encode.js filePath [outputPath = fileDir/fileName_encoded.txt ("default")] [charset = 20 bpc] [sortRanges = true]',
    charsetHelp = `Charsets are defined by ranges starting with a character and ending with another. For example, the charset "09af" contains the ranges 0-9 and a-f, inclusive on both ends.
To include a single character, type it twice. For example, the charset containing "a" and "c" is written as "aacc"`;

const args = process.argv.slice(2);

const filePath = args[0],
    charset = args[2] ?? defaultCharset,
    sortRanges = Util.parseBool(args[3]) ?? true;

let outputPath = args[1] ?? "default";

if (typeof filePath === "undefined") {
    console.error("ERROR: No file path provided.", "\n");
    console.log(usage);

    process.exit(1);
}

if (outputPath === "default") {
    const parsed = path.parse(filePath);
    outputPath = path.resolve(parsed.dir, parsed.name + "_encoded.txt");
} else {
    outputPath = path.resolve(outputPath);
}

let fileBytes;

try {
    fileBytes = fs.readFileSync(filePath);
} catch (err) {
    if (err.code === "ENOENT") {
        console.error("ERROR: Couldn't find the file at path: " + filePath);
        process.exit(1);
    }

    throw err;
}
const fileHash1 = await HashUtil.hashFile(filePath);

let table, t1, t2;

try {
    t1 = performance.now();
    table = Base2nTable.generate(charset, {
        tableType,
        sortRanges
    });
    t2 = performance.now();
} catch (err) {
    if (err.name === "Base2nError") {
        switch (err.message) {
            case "Invalid charset ranges": {
                const length = err.ref;

                const errMsg = length ? `Length (${length}) must be an even number.` : "";
                console.error("ERROR: Invalid charset.", errMsg);

                console.log("\n" + charsetHelp);
                break;
            }
            case "Non-ascending charset ranges": {
                const range = err.ref,
                    sortedRange = range.sort((a, b) => a - b);

                const errMsg = `Range ${Util.formatRange(range)} must be in ascending order: ${Util.formatRange(sortedRange)}`;
                console.error("ERROR: Invalid charset.", errMsg);

                console.log("\n" + charsetHelp);
                break;
            }
            case "Overlapping charset ranges": {
                const ranges = err.ref,
                    rangesFormat = ranges.map(range => Util.formatRange(range)).join(", ");

                console.error("ERROR: Charset has overlapping ranges:", rangesFormat);

                console.log("\n" + charsetHelp);
                break;
            }
            case "Charset length must be a power of 2": {
                const { ranges, sizes, size } = err.ref,
                    rangesFormat = ranges.map((range, i) => Util.formatRange(range, sizes[i])).join(", ");

                console.error(`ERROR: Charset size (${size}) must be a power of 2.`);
                console.log("Ranges:", rangesFormat);

                console.log("\n" + charsetHelp);
                break;
            }
            default:
                console.error(`ERROR: ${err.message}.`);
                break;
        }

        console.log("\n" + usage);
        process.exit(1);
    }

    throw err;
}

let encoded, t3, t4;

try {
    t3 = performance.now();
    encoded = encodeBase2n(fileBytes, table, { predictSize });
    t4 = performance.now();
} catch (err) {
    if (err.name === "Base2nError") {
        console.error(`ERROR: ${err.message}.`);
        process.exit(1);
    }

    throw err;
}

const encodedHash1 = HashUtil.hashData(encoded);

fs.writeFileSync(outputPath, encoded, {
    encoding: outputEncoding
});

console.log("Wrote encoded data to:", outputPath, "\n");

const encodedRead = fs.readFileSync(outputPath, {
        encoding: outputEncoding
    }),
    encodedHash2 = HashUtil.hashData(encodedRead);

assert.equal(
    encodedHash1,
    encodedHash2,
    "Encoded data didn't survive re-encoding. Check that your charset doesn't contain any characters that can't be encoded."
);

let decoded, t5, t6;

try {
    t5 = performance.now();
    decoded = decodeBase2n(encodedRead, table, { predictSize });
    t6 = performance.now();
} catch (err) {
    if (err.name === "Base2nError") {
        console.error(`ERROR: ${err.message}.`);
        process.exit(1);
    }

    throw err;
}

const fileHash2 = HashUtil.hashData(decoded),
    successful = fileHash1 === fileHash2;

console.log("Original data hash:", fileHash1);
console.log("Decoded data hash: ", fileHash2);

if (successful) {
    console.log("OK: Hashes match.", "\n");

    const originalSize = fileBytes.length,
        encodedLength = [...encoded].length,
        compressionRatio = Util.round((encodedLength / originalSize) * 100, 2);

    console.log("Original data size: ", originalSize);
    console.log("Encoded data length:", encodedLength);
    console.log('"Compression" ratio:', compressionRatio + "%", "\n");
} else {
    console.error("ERROR: Hashes don't match.", "\n");

    const parsed = path.parse(outputPath),
        decodedPath = path.resolve(parsed.dir, "decoded" + path.extname);

    fs.writeFileSync(decodedPath, decoded);
    console.log("Wrote decoded data to:", decodedPath, "\n");
}

const d1 = Math.floor((t2 - t1) * 1000),
    d2 = Math.floor((t4 - t3) * 1000),
    d3 = Math.floor((t6 - t5) * 1000);

console.log(`Generating table took: ${d1.toLocaleString()} us
Encoding took: ${d2.toLocaleString()} us
Decoding took: ${d3.toLocaleString()} us`);

process.exit(successful ? 0 : 1);
