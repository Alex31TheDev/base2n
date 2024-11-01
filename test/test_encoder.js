import assert from "assert";

import { Base2nTable, Base2nTableTypes, encodeBase2n, decodeBase2n } from "../index.js";
import DataGenerator from "./DataGenerator.js";

const testTypes = Object.values(Base2nTableTypes),
    testPredict = [false, true];

const minBpc = 3,
    maxBpc = 20;

const minLength = 1,
    maxLength = 50;

const printInfo = false,
    printData = false;

function test() {
    const testCount = maxLength - minLength + 1;

    for (const tableType of testTypes) {
        console.log("tableType:", tableType, "\n");

        for (let bpc = minBpc; bpc <= maxBpc; bpc++) {
            const charRanges = String.fromCodePoint(0x10000, 0x10000 + 2 ** bpc - 1),
                table = Base2nTable.generate(charRanges, { tableType });

            console.log("bpc:", table.bitsPerChar);

            let max_nr = 0;

            for (const predictSize of testPredict) {
                console.log("predict:", predictSize);

                for (let i = minLength; i <= maxLength; i++) {
                    const data = DataGenerator.sequentialData(i);

                    const encoded1 = encodeBase2n(data, table, { predictSize }),
                        encoded2 = new TextDecoder().decode(new TextEncoder().encode(encoded1));

                    assert.equal(encoded1, encoded2, `Wrong re-encoding. bpc: ${bpc}, i: ${i}`);

                    const decoded = decodeBase2n(encoded2, table, { predictSize });
                    assert.deepEqual(data, decoded, `Wrong data. bpc: ${bpc}, i: ${i}`);

                    if (!printInfo) {
                        continue;
                    }

                    const r = (data.length * 8) % table.bitsPerChar,
                        nr = r === 0 ? 0 : table.bitsPerChar - r,
                        s = nr >= 8;

                    max_nr = Math.max(max_nr);

                    console.log("data_len:", data.length, "enc_len:", [...encoded1].length, "dec_len:", decoded.length);
                    console.log("r:", r, "nr:", nr, "s:", s, "\n");

                    if (!printData) {
                        continue;
                    }

                    console.log(data);
                    console.log(decoded);
                    console.log(encoded1, "\n");
                }

                console.log(`tested ${minLength}-${maxLength} (${testCount}): correct`);

                if (printInfo) {
                    console.log("max_nr:", max_nr);
                }
            }

            console.log();
        }
    }

    console.log("Test completed successfully.");
}

test();
