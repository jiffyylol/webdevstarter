// /api/favorites routes: saved restaurants, stored in MongoDB.
const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const requireSession = require('../utils/requireSession');
const Favorite = require('../models/Favorite');

const router = express.Router();
router.use(requireSession); // every route below has req.sessionId

// Convert a database document back into the Restaurant shape the frontend uses.
function toRestaurant(doc) {
    return {
        id: doc.yelpId,
        name: doc.name,
        imageUrl: doc.imageUrl || null,
        url: doc.url,
        rating: doc.rating || 0,
        reviewCount: doc.reviewCount || 0,
        price: doc.price || null,
        categories: doc.categories || [],
        address: doc.address || '',
        city: doc.city || '',
        phone: doc.phone || '',
        distance: null,
    };
}

// GET /api/favorites → this session's saved restaurants, newest first
router.get(
    '/',
    asyncHandler(async (req, res) => {
        const docs = await Favorite.find({ sessionId: req.sessionId }).sort({ createdAt: -1 }).lean();
        res.json(docs.map(toRestaurant));
    })
);

// POST /api/favorites  body: a Restaurant object
router.post(
    '/',
    asyncHandler(async (req, res) => {
        const r = req.body || {};
        if (!r.id || !r.name) {
            throw new ApiError(400, 'A favorite needs at least an id and a name.');
        }
        // Upsert so saving twice doesn't create a duplicate.
        const doc = await Favorite.findOneAndUpdate(
            { sessionId: req.sessionId, yelpId: String(r.id) },
            {
                name: r.name,
                imageUrl: r.imageUrl,
                url: r.url,
                rating: r.rating,
                reviewCount: r.reviewCount,
                price: r.price,
                categories: Array.isArray(r.categories) ? r.categories.slice(0, 10) : [],
                address: r.address,
                city: r.city,
                phone: r.phone,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        ).lean();
        res.status(201).json(toRestaurant(doc));
    })
);

// DELETE /api/favorites/:yelpId
router.delete(
    '/:yelpId',
    asyncHandler(async (req, res) => {
        const result = await Favorite.deleteOne({ sessionId: req.sessionId, yelpId: req.params.yelpId });
        res.json({ deleted: result.deletedCount });
    })
);

module.exports = router;
