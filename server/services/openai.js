// Calls the OpenAI Chat Completions API with axios.
const axios = require('axios');
const ApiError = require('../utils/ApiError');

// messages: [{ role: 'system' | 'user' | 'assistant', content: string }]
// Returns the AI's reply as a string.
async function chatCompletion(messages) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
        throw new ApiError(500, 'OPENAI_API_KEY is missing. Add it to server/.env and restart the server.');
    }
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    try {
        const res = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            { model, messages },
            {
                headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
                timeout: 30000,
            }
        );
        const reply = res.data.choices && res.data.choices[0] && res.data.choices[0].message.content;
        return reply ? reply.trim() : "Sorry, I couldn't come up with an answer.";
    } catch (err) {
        if (err.response) {
            const { status, data } = err.response;
            const code = data && data.error && data.error.code;
            if (status === 401) throw new ApiError(502, 'OpenAI rejected the API key. Check OPENAI_API_KEY in server/.env.');
            if (status === 429 && code === 'insufficient_quota') {
                throw new ApiError(502, 'Your OpenAI account is out of credits. Add billing at platform.openai.com.');
            }
            if (status === 429) throw new ApiError(429, 'OpenAI rate limit reached. Wait a moment and try again.');
            if (status === 404 || code === 'model_not_found') {
                throw new ApiError(502, `The model "${model}" isn't available on your account. Change OPENAI_MODEL in server/.env.`);
            }
            const message = data && data.error && data.error.message;
            throw new ApiError(502, `OpenAI error: ${message || `status ${status}`}`);
        }
        throw new ApiError(502, 'Could not reach OpenAI. Check your internet connection.');
    }
}

module.exports = { chatCompletion };
