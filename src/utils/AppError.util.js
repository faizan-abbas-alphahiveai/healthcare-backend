class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.success = false;

        // Ensures stack trace is preserved
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;
