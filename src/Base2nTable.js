import CharUtil from "./util/CharUtil.js";
import Base2nError from "./errors/Base2nError.js";

import Base2nTableNames from "./enums/Base2nTableNames.js";
import Base2nTableTypes from "./enums/Base2nTableTypes.js";

class Base2nTable {
    static _getRanges(charsetRanges, sortRanges) {
        if (typeof charsetRanges !== "string") {
            throw new Base2nError("Invalid charset ranges");
        }

        if (charsetRanges.length === 0 || [...charsetRanges].length % 2 === 1) {
            throw new Base2nError("Invalid charset ranges");
        }

        const codepointRanges = charsetRanges
            .match(/../gu)
            .map(pair => [...pair].map(char => CharUtil.getCodepoint(char)));

        const rangeSize = codepointRanges.map(([first, last]) => last - first + 1).reduce((a, b) => a + b, 0);

        let firstCodepoint, lastCodepoint;

        if (sortRanges) {
            codepointRanges.sort((a, b) => a[0] - b[0]);

            firstCodepoint = codepointRanges[0][0];
            lastCodepoint = codepointRanges[codepointRanges.length - 1][1];
        } else {
            const firstChars = codepointRanges.map(x => x[0]),
                lastChars = codepointRanges.map(x => x[1]);

            firstCodepoint = Math.min(...firstChars);
            lastCodepoint = Math.max(...lastChars);
        }

        const rangeSpan = lastCodepoint - firstCodepoint + 1;

        return {
            codepointRanges,
            rangeSize,

            firstCodepoint,
            lastCodepoint,
            rangeSpan
        };
    }

    static generate(charsetRanges, options = {}) {
        const sortRanges = options.sortRanges ?? true;

        const {
            codepointRanges,
            rangeSize,

            firstCodepoint,
            lastCodepoint,
            rangeSpan
        } = this._getRanges(charsetRanges, sortRanges);

        const bitsPerChar = Math.log2(rangeSize);

        if (!Number.isInteger(bitsPerChar)) {
            throw new Base2nError("Charset length must be a power of 2");
        }

        let lookupE, lookupD;

        const generateTables = options.generateTables ?? Object.values(Base2nTableNames),
            generateEncode = generateTables.includes(Base2nTableNames.encode),
            generateDecode = generateTables.includes(Base2nTableNames.decode);

        if (!generateEncode && !generateDecode) {
            throw new Base2nError("You must specify at least one type of table to be generated");
        }

        const tableType = options.tableType ?? Base2nTableTypes.map;

        switch (tableType) {
            case Base2nTableTypes.map:
                lookupE = new Map();
                lookupD = new Map();

                break;
            case Base2nTableTypes.typedarray:
                lookupE = new Uint32Array(rangeSpan).fill(-1);
                lookupD = new Uint32Array(rangeSpan).fill(-1);

                break;
            default:
                throw new Base2nError("Invalid table type: " + tableType);
        }

        let val = 0,
            rangeCodeUnits = 0;

        const incrementValues = codepoint => {
            rangeCodeUnits += codepoint >= 0xffff ? 2 : 1;
            val++;
        };

        switch (tableType) {
            case Base2nTableTypes.map: {
                codepointRanges.forEach(([first, last]) => {
                    for (let codepoint = first; codepoint <= last; codepoint++) {
                        const char = String.fromCodePoint(codepoint);

                        if (generateEncode) lookupE.set(val, char);
                        if (generateDecode) lookupD.set(char, val);

                        incrementValues(codepoint);
                    }
                });

                break;
            }
            case Base2nTableTypes.typedarray: {
                codepointRanges.forEach(([first, last]) => {
                    for (let codepoint = first; codepoint <= last; codepoint++) {
                        if (generateEncode) lookupE[val] = codepoint;
                        if (generateDecode) lookupD[codepoint - firstCodepoint] = val;

                        incrementValues(codepoint);
                    }
                });

                break;
            }
        }

        const needsExtraChar = ![2, 8, 4].includes(bitsPerChar),
            averageLength = rangeCodeUnits / rangeSize;

        return new Base2nTable({
            tableType,

            charsetRanges,
            codepointRanges,
            rangeSize,
            sortRanges,

            bitsPerChar,
            needsExtraChar,
            averageLength,

            firstCodepoint,
            lastCodepoint,
            rangeSpan,

            lookupE,
            lookupD
        });
    }

    constructor(data) {
        this.type = data.tableType;

        this.charsetRanges = data.charsetRanges;
        this.codepointRanges = data.codepointRanges;
        this.base = data.rangeSize;
        this.sortedRanges = data.sortRanges;

        this.bitsPerChar = data.bitsPerChar;
        this.needsExtraChar = data.needsExtraChar;
        this.averageLength = data.averageLength;

        this.firstCodepoint = data.firstCodepoint;
        this.lastCodepoint = data.lastCodepoint;
        this.rangeSpan = data.rangeSpan;

        this.lookupE = data.lookupE;
        this.lookupD = data.lookupD;
    }

    _approximateEncodedSize(data) {
        const dataBits = data.length * 8;
        return Math.ceil(dataBits / this.bitsPerChar) + 1;
    }

    _approximateDecodedSize(str) {
        let approxLength = Math.ceil(str.length / this.averageLength);
        return Math.ceil((approxLength * this.bitsPerChar) / 8);
    }
}

export default Base2nTable;
