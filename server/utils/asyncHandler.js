// Express 4 doesn't catch errors thrown inside async route handlers.
// Wrapping a handler with asyncHandler(...) catches any rejected promise
// and passes the error to next(), so our error-handling middleware sends
// a proper JSON error instead of the request hanging forever.
module.exports = function asyncHandler(fn) {
    return function (req, res, next) {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
