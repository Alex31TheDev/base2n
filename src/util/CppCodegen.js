function intToHex(int) {
    return "0x" + int.toString(16);
}

class CppCodegen {
    static indentation = 4;
    static statementExp = /[\s\S]*[\w\d$_)\]]$/;

    static get spaces() {
        return " ".repeat(this.indentation);
    }

    static indent(code, times = 1) {
        const spaces = this.spaces.repeat(times);

        if (typeof code === "undefined" || code.length < 1) {
            return spaces;
        }

        code = code.trim();

        let lines = code.split("\n");
        lines = lines.map(line => spaces + line);

        return lines.join("\n");
    }

    static statement(code) {
        if (typeof code === "undefined" || code.length < 1) {
            return ";";
        }

        code = code.trim();

        let replaced;
        const last_nl = code.lastIndexOf("\n");

        if (last_nl === -1) {
            replaced = code.replaceAll(" ", "");
        } else {
            replaced = code.slice(last_nl);
        }

        if (this.statementExp.test(replaced)) {
            return code + ";";
        }

        return code;
    }

    static block(body) {
        const header = "{\n",
            footer = "\n}";

        body = this.indent(this.statement(body));
        return header + body + footer;
    }

    static return(value) {
        const name = "return";

        if (typeof value === "undefined" || value.length < 1) {
            return this.statement(name);
        }

        value = value.toString().trim();
        return this.statement(`${name} ${value}`);
    }

    static if(condition, body) {
        condition = condition.toString().trim();
        const header = `if (${condition}) `;

        const lines = body.split("\n").length;

        if (lines === 1) {
            body = this.statement(body);
            return header + body;
        }

        const block = this.block(body);
        return header + block;
    }

    static function(ret, name, args, body) {
        if (!Array.isArray(args[0])) {
            args = [args];
        }

        const argsList = args.map(([type, argName]) => `${type} ${argName}`);

        let header = `${ret} ${name}`;
        header += `(${argsList.join(", ")}) `;

        const block = this.block(body);
        return header + block;
    }

    static generateCppCode(table) {
        const stack = [];
        let body = table.codepointRanges
            .map(([first, last]) => {
                const firstHex = intToHex(first),
                    lastHex = intToHex(last);

                let retOp = `- 0x${first.toString(16)}`;
                if (stack.length > 0) retOp += ` ${stack.join(" ")}`;
                stack.push(`+ ${lastHex}`, `- ${firstHex}`, `+ 1`);

                const condition = `codepoint >= ${firstHex} && codepoint <= ${lastHex}`,
                    body = this.return(`codepoint ${retOp}`);

                return this.if(condition, body);
            })
            .join("\n");

        body += "\n" + this.return(-1);
        return this.function("uint32_t", "get_value", ["uint32_t", "codepoint"], body);
    }
}

export default CppCodegen;
