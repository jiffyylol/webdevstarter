const mongoose = require('mongoose');

// A single chat message. role is "user" (the person) or "assistant" (the AI),
// which is the same format the OpenAI API expects.
const MessageSchema = new mongoose.Schema(
    {
        role: { type: String, enum: ['user', 'assistant'], required: true },
        content: { type: String, required: true },
    },
    { _id: false }
);

// One conversation. contextKey says what the chat is about, for example
// "restaurant:<yelpId>" for a restaurant page or "search" for the Search page,
// so each page keeps its own conversation.
const ChatSessionSchema = new mongoose.Schema(
    {
        sessionId: { type: String, required: true },
        contextKey: { type: String, required: true },
        messages: { type: [MessageSchema], default: [] },
    },
    { timestamps: true }
);

ChatSessionSchema.index({ sessionId: 1, contextKey: 1 }, { unique: true });

module.exports = mongoose.model('ChatSession', ChatSessionSchema);
