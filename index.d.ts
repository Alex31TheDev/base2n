declare module "base2n" {
    export const enum Base2nTableNames {
        encode = "encode",
        decode = "decode",
        cpp = "cpp"
    }

    export const enum Base2nTableTypes {
        map = "map",
        typedarray = "buffer"
    }

    type DistinctPairs<T extends string | number> = {
        [K1 in T]: {
            [K2 in T]: K1 extends K2 ? never : [K1, K2];
        }[T];
    }[T];

    type tableName = Base2nTableNames | `${Base2nTableNames}`;
    type tableNames = DistinctPairs<tableName>;

    type tableType = Base2nTableTypes | `${Base2nTableTypes}`;

    export interface IBase2nTableOptions {
        sortRanges: boolean;
        generateTables: tableNames;
        tableType: tableType;
    }

    type codepointRanges = [number, number][];

    type lookupE = Map<number, string> | Uint32Array;
    type lookupD = Map<string, number> | Uint32Array;

    export class Base2nTable {
        static generate(charsetRanges: string, options?: IBase2nTableOptions): Base2nTable;
        private constructor();

        type: tableType;

        charsetRanges: string;
        codepointRanges: codepointRanges;
        base: number;
        sortedRanges: boolean;

        bitsPerChar: number;
        needsExtraChar: boolean;
        averageLength: number;

        firstCodepoint: number;
        lastCodepoint: number;
        rangeSpan: number;

        lookupE: lookupE;
        lookupD: lookupD;

        getEquivalentCode(): string;
    }

    export interface IEncoderOptions {
        predictSize?: boolean;
    }

    export function encodeBase2n(data: Uint8Array, table: Base2nTable, options?: IEncoderOptions): string;
    export function decodeBase2n(str: string, table: Base2nTable, options?: IEncoderOptions): Uint8Array;
}
