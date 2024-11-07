import CharUtil from "./util/CharUtil.js";
import Base2nError from "./errors/Base2nError.js";

import Base2nTableNames from "./enums/Base2nTableNames.js";
import Base2nTableTypes from "./enums/Base2nTableTypes.js";

const extraCharNotNeeded = [1, 2, 4, 8];

function hasOverlappingRanges(ranges) {
    for (let i = 0; i < ranges.length; i++) {
        for (let j = i + 1; j < ranges.length; j++) {
            const [first_1, last_1] = ranges[i],
                [first_2, last_2] = ranges[j];

            if (first_1 <= last_2 && first_2 <= last_1) {
                return [ranges[i], ranges[j]];
            }
        }
    }

    return false;
}

class Base2nTable {
    static _getRanges(charsetRanges, sortRanges) {
        if (typeof charsetRanges !== "string") {
            throw new Base2nError("Invalid charset ranges");
        }

        const charsetLength = [...charsetRanges].length;

        if (charsetLength === 0 || charsetLength % 2 === 1) {
            throw new Base2nError("Invalid charset ranges", charsetLength);
        }

        const codepointRanges = charsetRanges
            .match(/../gu)
            .map(pair => [...pair].map(char => CharUtil.getCodepoint_(char)));

        const overlap = hasOverlappingRanges(codepointRanges);

        if (overlap) {
            throw new Base2nError("Overlapping charset ranges", overlap);
        }

        const rangeSizes = codepointRanges.map(([first, last]) => last - first + 1),
            rangeSize = rangeSizes.reduce((a, b, i) => {
                if (b <= 0) {
                    throw new Base2nError("Non-ascending charset ranges", codepointRanges[i]);
                }

                return a + b;
            }, 0);

        if (rangeSize <= 1) {
            throw new Base2nError("Invalid range size", rangeSize);
        }

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
            codepointRanges_: codepointRanges,
            rangeSizes_: rangeSizes,
            rangeSize_: rangeSize,

            firstCodepoint_: firstCodepoint,
            lastCodepoint_: lastCodepoint,
            rangeSpan_: rangeSpan
        };
    }

    static generate(charsetRanges, options = {}) {
        const sortRanges = options.sortRanges ?? true;

        const {
            codepointRanges_: codepointRanges,
            rangeSizes_: rangeSizes,
            rangeSize_: rangeSize,

            firstCodepoint_: firstCodepoint,
            lastCodepoint_: lastCodepoint,
            rangeSpan_: rangeSpan
        } = this._getRanges(charsetRanges, sortRanges);

        const bitsPerChar = Math.log2(rangeSize);

        if (!Number.isInteger(bitsPerChar)) {
            throw new Base2nError("Charset length must be a power of 2", {
                ranges: codepointRanges,

                sizes: rangeSizes,
                size: rangeSize
            });
        }

        let lookupE, lookupD;

        const generateTables = options.generateTables ?? Object.values(Base2nTableNames),
            generateEncode = generateTables.includes(Base2nTableNames.encode),
            generateDecode = generateTables.includes(Base2nTableNames.decode);

        if (!generateEncode && !generateDecode) {
            throw new Base2nError("You must specify at least one type of table to be generated", generateTables);
        }

        const tableType = options.tableType ?? Base2nTableTypes.map;

        switch (tableType) {
            case Base2nTableTypes.map:
                if (generateEncode) lookupE = new Map();
                if (generateDecode) lookupD = new Map();

                break;
            case Base2nTableTypes.typedarray:
                if (generateEncode) lookupE = new Uint32Array(rangeSpan).fill(-1);
                if (generateDecode) lookupD = new Uint32Array(rangeSpan).fill(-1);

                break;
            default:
                throw new Base2nError("Invalid table type: " + tableType, tableType);
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

        const needsExtraChar = !extraCharNotNeeded.includes(bitsPerChar),
            averageLength = rangeCodeUnits / rangeSize;

        return new Base2nTable({
            type_: tableType,

            charsetRanges_: charsetRanges,
            codepointRanges_: codepointRanges,
            base_: rangeSize,
            sortedRanges_: sortRanges,

            bitsPerChar_: bitsPerChar,
            needsExtraChar_: needsExtraChar,
            averageLength_: averageLength,

            firstCodepoint_: firstCodepoint,
            lastCodepoint_: lastCodepoint,
            rangeSpan_: rangeSpan,

            lookupE_: lookupE,
            lookupD_: lookupD
        });
    }

    constructor(data) {
        this.type = data.type_;

        this.charsetRanges = data.charsetRanges_;
        this.codepointRanges = data.codepointRanges_;
        this.base = data.base_;
        this.sortedRanges = data.sortedRanges_;

        this.bitsPerChar = data.bitsPerChar_;
        this.needsExtraChar = data.needsExtraChar_;
        this.averageLength = data.averageLength_;

        this.firstCodepoint = data.firstCodepoint_;
        this.lastCodepoint = data.lastCodepoint_;
        this.rangeSpan = data.rangeSpan_;

        this.lookupE = data.lookupE_;
        this.lookupD = data.lookupD_;
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
