import { describe, test } from "@jest/globals";

import assert from "assert";

import { Base2nTable, Base2nTableTypes, encodeBase2n, decodeBase2n } from "../index.js";
import DataGenerator from "./DataGenerator.js";

function generateTable(tableType, bpc, firstChar = 0x10000) {
    const rangeSize = 2 ** bpc,
        charRanges = String.fromCodePoint(firstChar, firstChar + rangeSize - 1);

    return Base2nTable.generate(charRanges, { tableType });
}

function runTest(data, table, predictSize) {
    const errInfo = `Table Type: ${table.type}, BPC: ${table.bitsPerChar}, Predict Size: ${predictSize}, Length: ${data.length}`;

    const encoded1 = encodeBase2n(data, table, { predictSize }),
        encoded2 = new TextDecoder().decode(new TextEncoder().encode(encoded1));

    assert.equal(encoded1, encoded2, "Encoded data didn't survive re-encoding for " + errInfo);

    const decoded = decodeBase2n(encoded2, table, { predictSize });

    assert.deepEqual(data, decoded, "Decoded data wasn't the same as original data for " + errInfo);
}

function runTests(table, predictSize) {
    test(`Zero bytes 1-${maxLength}`, () => {
        for (let len = 1; len <= maxLength; len++) {
            const data = DataGenerator.zeroData(len);
            runTest(data, table, predictSize);
        }
    });

    test(`Sequential bytes 1-${maxLength}`, () => {
        for (let len = 1; len <= maxLength; len++) {
            const data = DataGenerator.sequentialData(len);
            runTest(data, table, predictSize);
        }
    });

    test(`Random bytes 1-${maxLength}`, () => {
        for (let len = 1; len <= maxLength; len++) {
            const data = DataGenerator.randomData(len);
            runTest(data, table, predictSize);
        }
    });
}

const maxBpc = 20,
    maxLength = 2048;

describe("Base 2^n Encoding Tests", () => {
    for (const tableType of Object.values(Base2nTableTypes)) {
        describe(`Table Type: ${tableType}`, () => {
            for (let bpc = 2; bpc <= maxBpc; bpc++) {
                const table = generateTable(tableType, bpc);

                describe(`BPC: ${bpc}`, () => {
                    for (const predictSize of [false, true]) {
                        describe(`Predict size: ${predictSize}`, () => {
                            runTests(table, predictSize);
                        });
                    }
                });
            }
        });
    }
});
