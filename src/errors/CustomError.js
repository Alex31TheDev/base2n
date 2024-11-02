class CustomError extends Error {
    constructor(message = "", ref, ...args) {
        super(message, ...args);

        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);

        this.ref = ref;
    }
}

export default CustomError;
