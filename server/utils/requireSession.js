const ApiError = require('./ApiError');

// We don't have user accounts, so the browser makes up a random id once,
// saves it in localStorage, and sends it on every request in the
// "x-session-id" header (see client/src/api.ts). Favorites and chats are
// stored under that id, so each browser gets its own data.
module.exports = function requireSession(req, res, next) {
    const sessionId = req.get('x-session-id');
    if (!sessionId || sessionId.length > 100) {
        return next(new ApiError(400, 'Missing or invalid x-session-id header.'));
    }
    req.sessionId = sessionId;
    next();
};
