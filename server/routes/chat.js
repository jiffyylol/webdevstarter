// /api/chat routes: the AI assistant. Conversations are saved in MongoDB.
const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const requireSession = require('../utils/requireSession');
const ChatSession = require('../models/ChatSession');
const { getRestaurantDetail } = require('../services/yelp');
const { chatCompletion } = require('../services/openai');

const router = express.Router();
router.use(requireSession);

const MAX_HISTORY = 10; // how many recent messages we send to OpenAI
const MAX_MESSAGE_LENGTH = 1000;

// Which conversation is this? A restaurant page always uses "restaurant:<id>".
// Other pages pass their own key (like "search" or "best:sf").
function resolveContextKey(restaurantId, contextKey) {
    if (restaurantId) return `restaurant:${restaurantId}`;
    if (typeof contextKey === 'string' && /^[\w:-]{1,80}$/.test(contextKey)) return contextKey;
    return 'search';
}

// Turn one restaurant's details + reviews into plain text for the AI.
function describeRestaurant(d) {
    const lines = [
        `Name: ${d.name}`,
        `Rating: ${d.rating}/5 from ${d.reviewCount} Yelp reviews`,
        `Price: ${d.price || 'unknown'}`,
        `Categories: ${d.categories.join(', ') || 'unknown'}`,
        `Address: ${d.address || 'unknown'}`,
        `Phone: ${d.phone || 'unknown'}`,
        `Open right now: ${d.isOpenNow === null ? 'unknown' : d.isOpenNow ? 'yes' : 'no'}`,
        `Ordering options: ${d.transactions.join(', ') || 'none listed'}`,
        'Hours:',
        ...(d.hours.length
            ? d.hours.map((h) => `  ${h.day}: ${h.ranges.length ? h.ranges.join(', ') : 'Closed'}`)
            : ['  not listed']),
        'Recent review excerpts (Yelp only shares a few short excerpts, not full reviews):',
        ...(d.reviews.length
            ? d.reviews.map((r) => `  - ${r.rating}/5 on ${r.timeCreated.slice(0, 10)} by ${r.userName}: "${r.text}"`)
            : ['  none available']),
    ];
    return lines.join('\n');
}

// Turn a list of restaurants (from the Search or Best page) into plain text.
// We only pick known fields and cut long strings, because this data comes
// from the browser and we don't want huge or weird input in our prompt.
function describeList(restaurants) {
    return restaurants
        .slice(0, 25)
        .map((r, i) => {
            const name = String(r.name || 'Unknown').slice(0, 100);
            const categories = Array.isArray(r.categories) ? r.categories.slice(0, 3).join(', ') : '';
            return `${i + 1}. ${name} | ${Number(r.rating) || '?'}/5 (${Number(r.reviewCount) || 0} reviews) | ${
                String(r.price || 'price unknown').slice(0, 4)
            } | ${categories.slice(0, 100)} | ${String(r.city || '').slice(0, 50)}`;
        })
        .join('\n');
}

function buildSystemPrompt(contextText) {
    return [
        'You are Bay Bites Assistant, a friendly guide to restaurants in the San Francisco Bay Area.',
        'Use ONLY the restaurant data below for facts about specific restaurants (ratings, prices, hours, what reviewers said).',
        "If the data doesn't answer a question, say you don't know and suggest checking the restaurant's Yelp page.",
        'You may use general food knowledge, like explaining what a dish is.',
        'Keep answers short (under about 150 words) and write in plain text without markdown.',
        '',
        '--- RESTAURANT DATA ---',
        contextText,
    ].join('\n');
}

// GET /api/chat?contextKey=search → saved messages for this conversation
router.get(
    '/',
    asyncHandler(async (req, res) => {
        const contextKey = resolveContextKey(null, req.query.contextKey);
        const session = await ChatSession.findOne({ sessionId: req.sessionId, contextKey }).lean();
        res.json({ messages: session ? session.messages : [] });
    })
);

// DELETE /api/chat?contextKey=search → clear a conversation
router.delete(
    '/',
    asyncHandler(async (req, res) => {
        const contextKey = resolveContextKey(null, req.query.contextKey);
        await ChatSession.deleteOne({ sessionId: req.sessionId, contextKey });
        res.json({ messages: [] });
    })
);

// POST /api/chat  body: { message, restaurantId?, restaurants?, contextKey? }
router.post(
    '/',
    asyncHandler(async (req, res) => {
        const { message, restaurantId, restaurants, contextKey: requestedKey } = req.body || {};

        if (typeof message !== 'string' || !message.trim()) {
            throw new ApiError(400, 'Message cannot be empty.');
        }
        if (message.length > MAX_MESSAGE_LENGTH) {
            throw new ApiError(400, `Message is too long (max ${MAX_MESSAGE_LENGTH} characters).`);
        }
        if (restaurantId && !/^[\w-]+$/.test(restaurantId)) {
            throw new ApiError(400, 'Invalid restaurant id.');
        }

        // 1. Gather the data the AI is allowed to use.
        let contextText;
        if (restaurantId) {
            // Fetch fresh details + reviews from Yelp on the server.
            contextText = describeRestaurant(await getRestaurantDetail(restaurantId));
        } else if (Array.isArray(restaurants) && restaurants.length > 0) {
            contextText = 'Restaurants currently shown to the user:\n' + describeList(restaurants);
        } else {
            contextText = 'No specific restaurants are loaded on this page right now.';
        }

        // 2. Load (or start) this conversation and add the new message.
        const contextKey = resolveContextKey(restaurantId, requestedKey);
        let session = await ChatSession.findOne({ sessionId: req.sessionId, contextKey });
        if (!session) session = new ChatSession({ sessionId: req.sessionId, contextKey, messages: [] });
        session.messages.push({ role: 'user', content: message.trim() });

        // 3. Send the system prompt + the last few messages to OpenAI.
        const history = session.messages.slice(-MAX_HISTORY).map((m) => ({ role: m.role, content: m.content }));
        const reply = await chatCompletion([{ role: 'system', content: buildSystemPrompt(contextText) }, ...history]);

        // 4. Save the reply. (If OpenAI failed above, we never reach this,
        //    so failed messages aren't saved.)
        session.messages.push({ role: 'assistant', content: reply });
        await session.save();

        res.json({
            reply,
            messages: session.messages.map((m) => ({ role: m.role, content: m.content })),
        });
    })
);

module.exports = router;
