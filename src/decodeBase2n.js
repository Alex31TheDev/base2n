import CharUtil from "./util/CharUtil.js";
import Base2nError from "./errors/Base2nError.js";

import Base2nTableTypes from "./enums/Base2nTableTypes.js";

function decodeBase2n(str, table, options = {}) {
    if (typeof table.lookupD === "undefined") {
        throw new Base2nError("Can't decode, lookup table wasn't generated");
    }

    if (typeof str !== "string") {
        throw new Base2nError("Invalid input data");
    }

    const predictSize = options.predictSize ?? false;

    let decoded,
        expandDecoded,
        k = 0;

    if (predictSize) {
        const approxSize = table._approximateDecodedSize(str);
        decoded = new Uint8Array(approxSize);

        expandDecoded = perc => {
            const oldBuf = decoded,
                newSize = Math.ceil(decoded.length * (1 + perc / 100));

            decoded = new Uint8Array(newSize);
            decoded.set(oldBuf);
        };
    } else {
        decoded = [];
    }

    const mask = 0xff;

    let buffer = 0,
        bufferBits = 0;

    let leftoverBits = 0;

    let lastChar, lastIndex;

    if (table.needsExtraChar) {
        ({ lastChar, lastIndex } = CharUtil.getLastChar_(str));
    }

    switch (table.type) {
        case Base2nTableTypes.map: {
            for (const char of str.slice(0, lastIndex)) {
                const val = table.lookupD.get(char);

                if (typeof val === "undefined") {
                    const codepoint = CharUtil.getCodepoint_(char);
                    throw new Base2nError(`Invalid character in encoded string: ${char} (${codepoint})`);
                }

                buffer = (buffer << table.bitsPerChar) | val;
                bufferBits += table.bitsPerChar;

                while (bufferBits >= 8) {
                    bufferBits -= 8;
                    const decodedByte = (buffer >> bufferBits) & mask;

                    if (predictSize) {
                        if (k >= decoded.length) expandDecoded(5);
                        decoded[k++] = decodedByte;
                    } else decoded.push(decodedByte);
                }
            }

            if (table.needsExtraChar) {
                leftoverBits = table.lookupD.get(lastChar);
            }

            break;
        }
        case Base2nTableTypes.typedarray: {
            lastIndex ??= 0;

            for (let i = 0; i < str.length + lastIndex; ) {
                const codepoint = str.codePointAt(i);
                i += codepoint > 0xffff ? 2 : 1;

                const val = table.lookupD[codepoint - table.firstCodepoint];

                if (typeof val === "undefined") {
                    const char = String.fromCharCode(codepoint);
                    throw new Base2nError(`Invalid character in encoded string: ${char} (${codepoint})`);
                }

                buffer = (buffer << table.bitsPerChar) | val;
                bufferBits += table.bitsPerChar;

                while (bufferBits >= 8) {
                    bufferBits -= 8;
                    const decodedByte = (buffer >> bufferBits) & mask;

                    if (predictSize) {
                        if (k >= decoded.length) expandDecoded(5);
                        decoded[k++] = decodedByte;
                    } else decoded.push(decodedByte);
                }
            }

            if (table.needsExtraChar) {
                const lastCodepoint = CharUtil.getCodepoint_(lastChar);
                leftoverBits = table.lookupD[lastCodepoint - table.firstCodepoint];
            }

            break;
        }

        default:
            throw new Base2nError("Invalid table type");
    }

    let zeros = 0;

    if (table.needsExtraChar) {
        const extraBits = leftoverBits > 0 ? table.bitsPerChar - leftoverBits : 0;
        zeros = Math.floor(extraBits / 8);
    }

    if (predictSize) {
        k -= zeros;
        decoded = decoded.slice(0, k);
    } else {
        while (zeros--) decoded.pop();
        decoded = new Uint8Array(decoded);
    }

    return decoded;
}

export default decodeBase2n;
