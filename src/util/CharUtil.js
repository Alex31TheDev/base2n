const CharUtil = {
    getCodepoint_: char => {
        return char.codePointAt(0);
    },

    isHighSurrogate_: char => {
        const codepoint = char.codePointAt(0);
        return codepoint >= 0xd800 && codepoint <= 0xdb7f;
    },

    isLowSurrogate_: char => {
        const codepoint = char.codePointAt(0);
        return codepoint >= 0xdc00 && codepoint <= 0xdfff;
    },

    getLastChar_: str => {
        let lastIndex = -1,
            lastChar = str.at(lastIndex);

        if (CharUtil.isLowSurrogate_(lastChar)) {
            lastIndex--;
            lastChar = str.at(lastIndex) + lastChar;
        }

        return { lastChar, lastIndex };
    }
};

export default CharUtil;
