// An Error that also carries an HTTP status code.
// Routes and services `throw new ApiError(404, 'Not found')`, and the error
// handler in index.js turns it into a JSON response with that status.
class ApiError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

module.exports = ApiError;
