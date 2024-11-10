import crypto from "crypto";

const DataGenerator = {
    zeroData: len => {
        return new Uint8Array(len);
    },

    sequentialData: len => {
        return new Uint8Array(Array.from({ length: len }, (_, i) => i % 256));
    },

    randomData: len => {
        return new Uint8Array(crypto.randomBytes(len).buffer);
    }
};

export default DataGenerator;
