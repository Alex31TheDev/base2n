const CharUtil = {
    getCodepoint: char => {
        return char.codePointAt(0);
    },

    isHighSurrogate: char => {
        const codepoint = char.codePointAt(0);
        return codepoint >= 0xd800 && codepoint <= 0xdb7f;
    },

    isLowSurrogate: char => {
        const codepoint = char.codePointAt(0);
        return codepoint >= 0xdc00 && codepoint <= 0xdfff;
    },

    getLastChar: str => {
        let lastIndex = -1,
            lastChar = str.at(lastIndex);

        if (CharUtil.isLowSurrogate(lastChar)) {
            lastIndex--;
            lastChar = str.at(lastIndex) + lastChar;
        }

        return { lastChar, lastIndex };
    }
};

export default CharUtil;
