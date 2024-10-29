import fs from "fs";
import path from "path";

import assert from "assert";
import crypto from "crypto";

import { Base2nTable, Base2nTableTypes, encodeBase2n, decodeBase2n } from "../index.js";

const defaultCharset = String.fromCodePoint(0x0021, 0xd7ff, 0xe000, 0xe000 - (0xd7ff - 0x0021 + 1) + 2 ** 20 - 1),
    tableType = Base2nTableTypes.buffer,
    predictSize = true;

const outEncoding = "utf8";

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

const filePath = process.argv[2],
    charset = process.argv[4] ?? defaultCharset;

let outPath = process.argv[3];

if (typeof outPath === "undefined") {
    const parsed = path.parse(filePath);
    outPath = path.resolve(parsed.dir, parsed.name + "_encoded.txt");
} else {
    outPath = path.resolve(outPath);
}

if (typeof filePath === "undefined") {
    console.error("ERROR: No file path provided.");
    process.exit(1);
}

const fileBytes = fs.readFileSync(filePath),
    fileHash1 = await HashUtil.hashFile(filePath);

const t1 = performance.now(),
    table = Base2nTable.generate(charset, { tableType }),
    t2 = performance.now();

const t3 = performance.now(),
    encoded = encodeBase2n(fileBytes, table, { predictSize }),
    t4 = performance.now();

const encodedHash1 = HashUtil.hashData(encoded);

fs.writeFileSync(outPath, encoded, {
    encoding: outEncoding
});

console.log("Wrote encoded data to:", outPath, "\n");

const encodedRead = fs.readFileSync(outPath, {
        encoding: outEncoding
    }),
    encodedHash2 = HashUtil.hashData(encodedRead);

assert.equal(
    encodedHash1,
    encodedHash2,
    "Encoded data didn't survive re-encoding. Check that your charset doesn't contain any characters that can't be encoded."
);

const t5 = performance.now(),
    decoded = decodeBase2n(encodedRead, table, { predictSize }),
    t6 = performance.now();

const fileHash2 = HashUtil.hashData(decoded),
    successful = fileHash1 === fileHash2;

if (!successful) {
    const parsed = path.parse(outPath),
        decodedPath = path.resolve(parsed.dir, "decoded" + path.extname);

    fs.writeFileSync(decodedPath, decoded);
}

console.log("Original data hash:", fileHash1);
console.log("Decoded data hash: ", fileHash2);

if (successful) {
    console.log("OK: Hashes match.");
} else {
    console.error("ERROR: Hashes don't match.");
}

const d1 = Math.floor((t2 - t1) * 1000),
    d2 = Math.floor((t4 - t3) * 1000),
    d3 = Math.floor((t6 - t5) * 1000);

console.log(`\nGenerating table took: ${d1.toLocaleString()} us
Encoding took: ${d2.toLocaleString()} us
Decoding took: ${d3.toLocaleString()} us`);

process.exit(successful ? 0 : 1);
