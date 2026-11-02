const mongoose = require('mongoose');

// One saved restaurant for one browser session.
// We copy the restaurant's basic info from Yelp so the Favorites page can
// load from our own database without calling Yelp again.
const FavoriteSchema = new mongoose.Schema(
    {
        sessionId: { type: String, required: true, index: true },
        yelpId: { type: String, required: true },
        name: { type: String, required: true },
        imageUrl: String,
        url: String,
        rating: Number,
        reviewCount: Number,
        price: String,
        categories: [String],
        address: String,
        city: String,
        phone: String,
    },
    { timestamps: true } // adds createdAt / updatedAt automatically
);

// The same session can't save the same restaurant twice.
FavoriteSchema.index({ sessionId: 1, yelpId: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', FavoriteSchema);
