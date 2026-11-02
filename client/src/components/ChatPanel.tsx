// The AI chatbot side panel. On large screens it sits beside the page; on
// phones it opens full-screen. It can be closed into a floating button.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { clearChat, errorMessage, getChatHistory, sendChatMessage } from '../api';
import type { ChatMessage, Restaurant } from '../types';

interface Props {
  contextKey: string; // which conversation, e.g. "search" or "restaurant:<id>"
  title: string;
  suggestions: string[]; // starter questions shown when the chat is empty
  restaurantId?: string; // on a restaurant page, the server looks up this restaurant
  restaurants?: Restaurant[]; // on list pages, the restaurants currently shown
}

export default function ChatPanel({ contextKey, title, suggestions, restaurantId, restaurants }: Props) {
  // Start open on big screens, closed on phones.
  const [open, setOpen] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load the saved conversation from MongoDB whenever the context changes
  // (for example, when moving from one restaurant page to another).
  useEffect(() => {
    let cancelled = false;
    setLoadingHistory(true);
    setError(null);
    getChatHistory(contextKey)
      .then((saved) => {
        if (!cancelled) setMessages(saved);
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [contextKey]);

  // Scroll to the newest message. useRef points at an empty div at the bottom.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending, open]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending) return;

    setInput('');
    setError(null);
    // Show the user's message immediately while we wait for the AI.
    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    setSending(true);
    try {
      const res = await sendChatMessage({
        message,
        contextKey,
        restaurantId,
        restaurants: restaurants?.slice(0, 25),
      });
      setMessages(res.messages); // the server returns the whole saved conversation
    } catch (err) {
      setError(errorMessage(err));
      setMessages((prev) => prev.slice(0, -1)); // take the unsent message back out
      setInput(message); // and put it back in the box so they can retry
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  async function handleClear() {
    try {
      await clearChat(contextKey);
      setMessages([]);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 rounded-full bg-red-600 px-5 py-3 font-semibold text-white shadow-lg transition hover:bg-red-700"
      >
        💬 Ask AI
      </button>
    );
  }

  return (
    <aside className="flex flex-col bg-white max-lg:fixed max-lg:inset-0 max-lg:z-50 lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)] lg:w-96 lg:shrink-0 lg:overflow-hidden lg:rounded-2xl lg:shadow-sm lg:ring-1 lg:ring-stone-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 bg-red-600 p-4 text-white">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/80">AI assistant</p>
          <h2 className="font-bold leading-tight">{title}</h2>
        </div>
        <div className="flex shrink-0 gap-1">
          {messages.length > 0 && (
            <button onClick={handleClear} className="rounded-lg px-2 py-1 text-sm hover:bg-white/20">
              Clear
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            aria-label="Close chat"
            className="rounded-lg px-2 py-1 text-lg leading-none hover:bg-white/20"
          >
            ×
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {loadingHistory ? (
          <p className="text-sm text-stone-500">Loading chat…</p>
        ) : messages.length === 0 ? (
          <div>
            <p className="text-sm text-stone-600">
              Ask me anything about these restaurants. I answer using Yelp data and recent reviews.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-stone-300 px-3 py-1.5 text-left text-sm text-stone-700 transition hover:border-red-400 hover:bg-red-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                  m.role === 'user' ? 'rounded-br-sm bg-red-600 text-white' : 'rounded-bl-sm bg-stone-100 text-stone-800'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {sending && (
          <div className="flex justify-start">
            <div className="animate-pulse rounded-2xl rounded-bl-sm bg-stone-100 px-3.5 py-2 text-sm text-stone-500">
              Thinking…
            </div>
          </div>
        )}
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-stone-200 p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
          maxLength={1000}
          className="min-w-0 flex-1 rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </aside>
  );
}
