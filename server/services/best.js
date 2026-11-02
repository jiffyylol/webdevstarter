// Builds the "Best of the Bay" rankings and caches them in MongoDB.
const ApiError = require('../utils/ApiError');
const BestCache = require('../models/BestCache');
const { searchBusinesses, simplifyBusiness } = require('./yelp');

// Each region searches a few cities. pages = how many pages of 50 results
// to pull per city. minReviews keeps places with only a handful of 5-star
// reviews from ranking above long-time favorites.
const REGIONS = {
    sf: {
        label: 'San Francisco',
        cities: ['San Francisco'],
        pages: 3,
        minReviews: 200,
    },
    marin: {
        label: 'Sausalito & Marin',
        cities: ['Sausalito', 'Mill Valley', 'Tiburon'],
        pages: 1,
        minReviews: 75,
    },
    eastbay: {
        label: 'East Bay',
        cities: ['Berkeley', 'Oakland', 'Richmond', 'Emeryville', 'Albany', 'El Cerrito'],
        pages: 1,
        minReviews: 75,
    },
};

const PAGE_SIZE = 50; // Yelp's maximum per request
const TOP_N = 40;

function formatResult(regionKey, doc) {
    const region = REGIONS[regionKey];
    return {
        region: regionKey,
        label: region.label,
        cities: region.cities,
        businesses: doc.businesses,
        cachedAt: doc.fetchedAt,
    };
}

async function getBestOfRegion(regionKey) {
    const region = REGIONS[regionKey];
    if (!region) {
        throw new ApiError(400, `Unknown region "${regionKey}". Use sf, marin, or eastbay.`);
    }

    // 1. Use the cached ranking if it's less than a day old.
    const cached = await BestCache.findOne({ region: regionKey }).lean();
    if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < BestCache.ONE_DAY_MS) {
        return formatResult(regionKey, cached);
    }

    // 2. Otherwise ask Yelp: one request per city per page, all in parallel.
    const requests = [];
    for (const city of region.cities) {
        for (let page = 0; page < region.pages; page++) {
            requests.push(
                searchBusinesses({
                    location: `${city}, CA`,
                    categories: 'restaurants',
                    sort_by: 'rating',
                    limit: PAGE_SIZE,
                    offset: page * PAGE_SIZE,
                })
            );
        }
    }
    const responses = await Promise.all(requests);

    // 3. Merge everything, removing duplicates (a place can show up for two cities).
    const byId = new Map();
    for (const data of responses) {
        for (const business of data.businesses) {
            if (!byId.has(business.id)) byId.set(business.id, simplifyBusiness(business));
        }
    }
    const all = [...byId.values()];

    // 4. Keep well-reviewed places. If that leaves too few, relax the cutoff.
    let ranked = all.filter((b) => b.reviewCount >= region.minReviews);
    if (ranked.length < 12) {
        ranked = all.filter((b) => b.reviewCount >= Math.floor(region.minReviews / 4));
    }

    // 5. Sort by rating, then by number of reviews as the tie-breaker.
    ranked.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    const businesses = ranked.slice(0, TOP_N);

    // 6. Save to MongoDB (upsert = insert if missing, otherwise update).
    const doc = await BestCache.findOneAndUpdate(
        { region: regionKey },
        { businesses, fetchedAt: new Date() },
        { upsert: true, new: true }
    ).lean();

    return formatResult(regionKey, doc);
}

module.exports = { getBestOfRegion };
