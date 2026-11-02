import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { errorMessage, searchRestaurants, type SearchFilters } from '../api';
import ChatPanel from '../components/ChatPanel';
import RestaurantCard from '../components/RestaurantCard';
import { ErrorBox, Spinner } from '../components/Status';
import { BAY_AREA_LOCATIONS, SORT_OPTIONS } from '../constants';
import type { Restaurant } from '../types';

// The search lives in the URL (?term=ramen&location=Berkeley,CA...), so a
// search can be shared, bookmarked, or reached with the back button.
function readFilters(params: URLSearchParams): SearchFilters {
  return {
    term: params.get('term') ?? '',
    location: params.get('location') ?? 'San Francisco, CA',
    price: params.get('price') ?? '',
    minRating: params.get('minRating') ?? '',
    sortBy: params.get('sortBy') ?? 'best_match',
  };
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryString = searchParams.toString();
  const filters = readFilters(searchParams);

  // Form state: what the user is typing (only applied when they press Search).
  const [form, setForm] = useState<SearchFilters>(filters);

  // Results state
  const [results, setResults] = useState<Restaurant[]>([]);
  const [total, setTotal] = useState(0);
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When the URL changes, update the form and run a fresh search.
  useEffect(() => {
    const current = readFilters(new URLSearchParams(queryString));
    setForm(current);

    let cancelled = false; // ignore old responses if the user searches again quickly
    setLoading(true);
    setError(null);
    searchRestaurants(current, 0)
      .then((data) => {
        if (cancelled) return;
        setResults(data.businesses);
        setTotal(data.total);
        setNextOffset(data.nextOffset);
        setHasMore(data.hasMore);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(errorMessage(err));
          setResults([]);
          setHasMore(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [queryString]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const data = await searchRestaurants(filters, nextOffset);
      // Add the new page, skipping any restaurant we already have.
      setResults((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        return [...prev, ...data.businesses.filter((r) => !seen.has(r.id))];
      });
      setNextOffset(data.nextOffset);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Only put non-empty values in the URL.
    const next = new URLSearchParams();
    (Object.entries(form) as [keyof SearchFilters, string][]).forEach(([key, value]) => {
      if (value.trim()) next.set(key, value.trim());
    });
    setSearchParams(next); // changes the URL → the useEffect above runs the search
  }

  const selectedPrices = form.price ? form.price.split(',') : [];
  function togglePrice(level: string) {
    const nextPrices = selectedPrices.includes(level)
      ? selectedPrices.filter((p) => p !== level)
      : [...selectedPrices, level].sort();
    setForm({ ...form, price: nextPrices.join(',') });
  }

  const inputClass =
    'w-full rounded-xl border border-stone-300 bg-white px-3 py-2 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100';

  return (
    <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8">
      <main className="min-w-0 flex-1">
        <h1 className="text-3xl font-extrabold">Search restaurants</h1>

        {/* Search form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-stone-700">
              What
              <input
                value={form.term}
                onChange={(e) => setForm({ ...form, term: e.target.value })}
                placeholder="Tacos, sushi, coffee…"
                className={`mt-1 font-normal ${inputClass}`}
              />
            </label>
            <label className="text-sm font-semibold text-stone-700">
              Where
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                list="search-locations"
                className={`mt-1 font-normal ${inputClass}`}
              />
              <datalist id="search-locations">
                {BAY_AREA_LOCATIONS.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </label>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div>
              <p className="text-sm font-semibold text-stone-700">Price</p>
              <div className="mt-1 flex overflow-hidden rounded-xl ring-1 ring-stone-300">
                {['1', '2', '3', '4'].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => togglePrice(level)}
                    className={`px-3 py-2 text-sm font-semibold transition ${
                      selectedPrices.includes(level) ? 'bg-red-600 text-white' : 'bg-white text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    {'$'.repeat(Number(level))}
                  </button>
                ))}
              </div>
            </div>
            <label className="text-sm font-semibold text-stone-700">
              Rating
              <select
                value={form.minRating}
                onChange={(e) => setForm({ ...form, minRating: e.target.value })}
                className={`mt-1 font-normal ${inputClass}`}
              >
                <option value="">Any</option>
                <option value="3.5">3.5+ stars</option>
                <option value="4">4+ stars</option>
                <option value="4.5">4.5+ stars</option>
              </select>
            </label>
            <label className="text-sm font-semibold text-stone-700">
              Sort by
              <select
                value={form.sortBy}
                onChange={(e) => setForm({ ...form, sortBy: e.target.value })}
                className={`mt-1 font-normal ${inputClass}`}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="rounded-xl bg-red-600 px-6 py-2.5 font-semibold text-white transition hover:bg-red-700">
              Search
            </button>
          </div>
        </form>

        {/* Results */}
        <div className="mt-6">
          {loading ? (
            <Spinner label="Searching Yelp…" />
          ) : error && results.length === 0 ? (
            <ErrorBox message={error} />
          ) : results.length === 0 ? (
            <p className="py-12 text-center text-stone-500">No restaurants matched. Try different filters.</p>
          ) : (
            <>
              <p className="mb-4 text-sm text-stone-600">
                {total.toLocaleString()} results for <strong>{filters.term || 'restaurants'}</strong> near{' '}
                <strong>{filters.location}</strong>
              </p>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((r) => (
                  <RestaurantCard key={r.id} restaurant={r} />
                ))}
              </div>
              {error && <div className="mt-4"><ErrorBox message={error} /></div>}
              {hasMore && (
                <div className="mt-8 text-center">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="rounded-xl bg-white px-6 py-2.5 font-semibold ring-1 ring-stone-300 transition hover:bg-stone-100 disabled:opacity-50"
                  >
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <ChatPanel
        contextKey="search"
        title="Ask about these results"
        restaurants={results}
        suggestions={['Which of these is cheapest?', 'Which is best for a big group?', 'Compare the top 3 for me']}
      />
    </div>
  );
}
