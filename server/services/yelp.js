// All communication with the Yelp Fusion API lives in this file.
// Routes call these functions instead of talking to Yelp directly.
const axios = require('axios');
const ApiError = require('../utils/ApiError');

// An axios "instance" with Yelp's base URL already set,
// so we can write yelp.get('/businesses/search') instead of the full URL.
const yelp = axios.create({
    baseURL: 'https://api.yelp.com/v3',
    timeout: 10000,
});

// The key is read from server/.env and sent as a Bearer token.
// It never goes to the browser.
function authHeaders() {
    const key = process.env.YELP_API_KEY;
    if (!key) {
        throw new ApiError(500, 'YELP_API_KEY is missing. Add it to server/.env and restart the server.');
    }
    return { Authorization: `Bearer ${key}` };
}

// Turn an axios/Yelp error into an ApiError with a clear message.
function toApiError(err) {
    if (err instanceof ApiError) return err;
    if (err.response) {
        const { status, data } = err.response;
        const code = data && data.error && data.error.code;
        const description = data && data.error && data.error.description;
        if (status === 401) return new ApiError(502, 'Yelp rejected the API key. Check YELP_API_KEY in server/.env.');
        if (status === 403) return new ApiError(502, `Yelp denied access${description ? `: ${description}` : ''}. Your Yelp API plan may not include this feature.`);
        if (status === 429) return new ApiError(429, 'Yelp rate limit reached. Wait a minute and try again.');
        if (status === 404) return new ApiError(404, 'That restaurant was not found on Yelp.');
        if (code === 'LOCATION_NOT_FOUND') {
            return new ApiError(400, 'Yelp couldn\'t find that location. Try a city like "Oakland, CA".');
        }
        return new ApiError(502, `Yelp error: ${description || `status ${status}`}`);
    }
    return new ApiError(502, 'Could not reach Yelp. Check your internet connection.');
}

// Yelp's responses have many fields in snake_case. We convert each business
// into a smaller camelCase object, which is what our frontend expects
// (see the Restaurant type in client/src/types.ts).
function simplifyBusiness(b) {
    return {
        id: b.id,
        name: b.name,
        imageUrl: b.image_url || null,
        url: b.url,
        rating: typeof b.rating === 'number' ? b.rating : 0,
        reviewCount: b.review_count || 0,
        price: b.price || null,
        categories: (b.categories || []).map((c) => c.title),
        address: b.location && b.location.display_address ? b.location.display_address.join(', ') : '',
        city: (b.location && b.location.city) || '',
        phone: b.display_phone || '',
        distance: typeof b.distance === 'number' ? b.distance : null, // meters
    };
}

function simplifyReview(r) {
    return {
        id: r.id,
        text: r.text,
        rating: r.rating,
        timeCreated: r.time_created,
        userName: (r.user && r.user.name) || 'Yelp user',
        userImage: (r.user && r.user.image_url) || null,
        url: r.url,
    };
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Yelp gives times like "1130" → we show "11:30 AM".
function formatTime(hhmm) {
    const hours = parseInt(hhmm.slice(0, 2), 10);
    const minutes = hhmm.slice(2);
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 === 0 ? 12 : hours % 12;
    return `${hours12}:${minutes} ${suffix}`;
}

// Yelp hours: [{ open: [{ day: 0, start: "1100", end: "2200" }, ...], is_open_now }]
// where day 0 = Monday. We turn that into one entry per day of the week.
function formatHours(hours) {
    if (!hours || !hours[0] || !hours[0].open) return [];
    const open = hours[0].open;
    return DAY_NAMES.map((day, index) => ({
        day,
        ranges: open
            .filter((slot) => slot.day === index)
            .map((slot) => `${formatTime(slot.start)} – ${formatTime(slot.end)}${slot.is_overnight ? ' (next day)' : ''}`),
    }));
}

// ---------- Functions used by the routes ----------

async function searchBusinesses(params) {
    try {
        const res = await yelp.get('/businesses/search', { headers: authHeaders(), params });
        return res.data; // { businesses: [...], total: number }
    } catch (err) {
        throw toApiError(err);
    }
}

async function getBusiness(id) {
    try {
        const res = await yelp.get(`/businesses/${encodeURIComponent(id)}`, { headers: authHeaders() });
        return res.data;
    } catch (err) {
        throw toApiError(err);
    }
}

async function getReviews(id) {
    const url = `/businesses/${encodeURIComponent(id)}/reviews`;
    try {
        const res = await yelp.get(url, { headers: authHeaders(), params: { sort_by: 'newest' } });
        return res.data.reviews.map(simplifyReview);
    } catch (err) {
        // Some API plans reject sort_by; try again without it before giving up.
        if (err.response && err.response.status === 400) {
            const res = await yelp.get(url, { headers: authHeaders() });
            return res.data.reviews.map(simplifyReview);
        }
        throw toApiError(err);
    }
}

// Details + reviews for one restaurant. Both requests run at the same time
// with Promise.all. If only the reviews fail (for example, the API plan doesn't
// include them), we still return the details with an empty review list.
async function getRestaurantDetail(id) {
    const [business, reviewResult] = await Promise.all([
        getBusiness(id),
        getReviews(id)
            .then((reviews) => ({ reviews, unavailable: false }))
            .catch(() => ({ reviews: [], unavailable: true })),
    ]);

    const hours = business.hours;
    return {
        ...simplifyBusiness(business),
        photos: business.photos || [],
        hours: formatHours(hours),
        isOpenNow: hours && hours[0] ? Boolean(hours[0].is_open_now) : null,
        transactions: business.transactions || [], // e.g. ["delivery", "pickup"]
        reviews: reviewResult.reviews,
        reviewsUnavailable: reviewResult.unavailable,
    };
}

module.exports = {
    searchBusinesses,
    getRestaurantDetail,
    simplifyBusiness,
};
