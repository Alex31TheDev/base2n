export enum Base2nTableNames {
    encode = "encode",
    decode = "decode"
}

export enum Base2nTableTypes {
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

interface Base2nTableOptions {
    sortRanges: boolean;
    generateTables: tableNames;
    tableType: tableType;
}

type codepointRanges = [number, number][];

type lookupE = Map<number, string> | Uint32Array;
type lookupD = Map<string, number> | Uint32Array;

export class Base2nTable {
    static generate(charsetRanges: string, options?: Base2nTableOptions): Base2nTable;
    private constructor();

    tableType: tableType;

    charsetRanges: string;
    codepointRanges: codepointRanges;
    rangeSize: number;
    sortedRanges: boolean;

    bitsPerChar: number;
    needsExtraChar: boolean;
    averageLength: number;

    firstCodepoint: number;
    lastCodepoint: number;
    rangeSpan: number;

    lookupE: lookupE;
    lookupD: lookupD;
}

interface EncoderOptions {
    predictSize?: boolean;
}

export function encodeBase2n(data: Uint8Array, table: Base2nTable, options?: EncoderOptions): string;
export function decodeBase2n(str: string, table: Base2nTable, options?: EncoderOptions): Uint8Array;
