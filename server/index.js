// Entry point for the Express server. Run with: npm run dev
require('dotenv').config(); // load server/.env into process.env first

const express = require('express');
const mongoose = require('mongoose');

const restaurantRoutes = require('./routes/restaurants');
const favoriteRoutes = require('./routes/favorites');
const chatRoutes = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 5001; // not 5000: macOS uses 5000 for AirPlay
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/baybites';

// Parse JSON request bodies into req.body
app.use(express.json({ limit: '200kb' }));

// Quick check that the server is up: http://localhost:5001/api/health
app.get('/api/health', (req, res) => {
    res.json({ ok: true, mongoConnected: mongoose.connection.readyState === 1 });
});

// Our API routes
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/chat', chatRoutes);

// Unknown /api route → 404 JSON
app.use('/api', (req, res) => {
    res.status(404).json({ error: `No API route for ${req.method} ${req.originalUrl}` });
});

// Error handler: Express sends any error passed to next(err) here.
// The 4 arguments are how Express knows this is an error handler.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: err.status ? err.message : 'Something went wrong on the server.' });
});

// Warn early if a key is missing, so it's obvious in the terminal.
['YELP_API_KEY', 'OPENAI_API_KEY'].forEach((name) => {
    if (!process.env[name]) console.warn(`⚠️  ${name} is not set in server/.env`);
});

// Connect to MongoDB first, then start listening for requests.
mongoose
    .connect(MONGODB_URI)
    .then(() => {
        console.log('MongoDB connected');
        app.listen(PORT, () => console.log(`API server running on http://localhost:${PORT}`));
    })
    .catch((err) => {
        console.error(`Could not connect to MongoDB at ${MONGODB_URI}. Is mongod running?`);
        console.error(err.message);
        process.exit(1);
    });
