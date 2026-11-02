const mongoose = require('mongoose');

const ONE_DAY_SECONDS = 60 * 60 * 24;

// Cached "Best of the Bay" results for one region (sf, marin, eastbay).
// Building a ranking takes several Yelp calls, so we save the result and
// reuse it for 24 hours instead of calling Yelp on every page load.
const BestCacheSchema = new mongoose.Schema({
    region: { type: String, required: true, unique: true },
    businesses: { type: [mongoose.Schema.Types.Mixed], default: [] },
    // `expires` creates a MongoDB TTL index: MongoDB deletes the document
    // automatically about 24 hours after fetchedAt.
    fetchedAt: { type: Date, default: Date.now, expires: ONE_DAY_SECONDS },
});

module.exports = mongoose.model('BestCache', BestCacheSchema);
module.exports.ONE_DAY_MS = ONE_DAY_SECONDS * 1000;
