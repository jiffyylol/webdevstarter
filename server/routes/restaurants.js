// /api/restaurants/... routes: search, best-of lists, and restaurant details.
const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { searchBusinesses, simplifyBusiness, getRestaurantDetail } = require('../services/yelp');
const { getBestOfRegion } = require('../services/best');

const router = express.Router();

const PAGE_SIZE = 20;
const MAX_RESULTS = 240; // Yelp won't return results past limit + offset = 240
const SORTS = ['best_match', 'rating', 'review_count', 'distance'];

// GET /api/restaurants/search?term=ramen&location=Berkeley,CA&price=1,2&minRating=4&sortBy=rating&offset=0
router.get(
    '/search',
    asyncHandler(async (req, res) => {
        const term = String(req.query.term || '').trim() || 'restaurants';
        const location = String(req.query.location || '').trim() || 'San Francisco, CA';
        const sortBy = SORTS.includes(req.query.sortBy) ? req.query.sortBy : 'best_match';
        // Price comes in as "1,2,3"; keep only valid values 1-4.
        const price = String(req.query.price || '')
            .split(',')
            .filter((p) => ['1', '2', '3', '4'].includes(p))
            .join(',');
        const minRating = Number(req.query.minRating) || 0;
        const offset = Math.min(Math.max(parseInt(req.query.offset, 10) || 0, 0), MAX_RESULTS - PAGE_SIZE);

        const params = {
            term,
            location,
            categories: 'restaurants,food', // comma means "restaurants OR food" (so boba, bakeries, etc. show up)
            limit: PAGE_SIZE,
            offset,
            sort_by: sortBy,
        };
        if (price) params.price = price;

        const data = await searchBusinesses(params);

        // Yelp has no "minimum rating" filter, so we filter each page ourselves.
        const businesses = data.businesses.map(simplifyBusiness).filter((b) => b.rating >= minRating);
        const nextOffset = offset + PAGE_SIZE;

        res.json({
            total: data.total,
            businesses,
            nextOffset,
            hasMore: nextOffset < Math.min(data.total, MAX_RESULTS),
        });
    })
);

// GET /api/restaurants/best?region=sf|marin|eastbay
router.get(
    '/best',
    asyncHandler(async (req, res) => {
        const region = String(req.query.region || 'sf');
        res.json(await getBestOfRegion(region));
    })
);

// GET /api/restaurants/:id  (details + recent reviews)
// This route goes last so "/search" and "/best" aren't treated as ids.
router.get(
    '/:id',
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        if (!/^[\w-]+$/.test(id)) {
            throw new ApiError(400, 'Invalid restaurant id.');
        }
        res.json(await getRestaurantDetail(id));
    })
);

module.exports = router;
