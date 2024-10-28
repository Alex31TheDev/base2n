import Base2nError from "./errors/Base2nError.js";

import Base2nTableTypes from "./enums/Base2nTableTypes.js";

function encodeBase2n(data, table, options = {}) {
    if (typeof table.lookupE === "undefined") {
        throw new Base2nError("Can't encode, lookup table wasn't generated");
    }

    if (!Array.isArray(data) && !ArrayBuffer.isView(data)) {
        throw new Base2nError("Invalid input data");
    }

    const predictSize = options.predictSize ?? false;

    let arr,
        str,
        k = 0;

    if (predictSize) {
        const approxSize = table._approximateEncodedSize(data);
        arr = new Array(approxSize);
    } else {
        str = "";
    }

    const mask = table.base - 1;

    let buffer = 0,
        bufferBits = 0;

    let leftoverBitsChar;

    switch (table.type) {
        case Base2nTableTypes.map: {
            for (let i = 0; i < data.length; i++) {
                buffer = (buffer << 8) | data[i];
                bufferBits += 8;

                while (bufferBits >= table.bitsPerChar) {
                    bufferBits -= table.bitsPerChar;

                    const val = (buffer >> bufferBits) & mask,
                        char = table.lookupE.get(val);

                    if (predictSize) arr[k++] = char;
                    else str += char;
                }
            }

            if (bufferBits > 0) {
                const extraBits = table.bitsPerChar - bufferBits,
                    val = (buffer << extraBits) & mask,
                    char = table.lookupE.get(val);

                if (predictSize) arr[k++] = char;
                else str += char;
            }

            if (table.needsExtraChar) {
                leftoverBitsChar = table.lookupE.get(bufferBits);
            }

            break;
        }
        case Base2nTableTypes.typedarray: {
            for (let i = 0; i < data.length; i++) {
                buffer = (buffer << 8) | data[i];
                bufferBits += 8;

                while (bufferBits >= table.bitsPerChar) {
                    bufferBits -= table.bitsPerChar;

                    const val = (buffer >> bufferBits) & mask,
                        char = String.fromCodePoint(table.lookupE[val]);

                    if (predictSize) arr[k++] = char;
                    else str += char;
                }
            }

            if (bufferBits > 0) {
                const extraBits = table.bitsPerChar - bufferBits,
                    val = (buffer << extraBits) & mask,
                    char = String.fromCodePoint(table.lookupE[val]);

                if (predictSize) arr[k++] = char;
                else str += char;
            }

            if (table.needsExtraChar) {
                leftoverBitsChar = String.fromCodePoint(table.lookupE[bufferBits]);
            }

            break;
        }
        default:
            throw new Base2nError("Invalid table type");
    }

    if (table.needsExtraChar) {
        if (predictSize) arr[k++] = leftoverBitsChar;
        else str += leftoverBitsChar;
    }

    if (predictSize) {
        arr = arr.slice(0, k);
        str = arr.join("");
    }

    return str;
}

export default encodeBase2n;
