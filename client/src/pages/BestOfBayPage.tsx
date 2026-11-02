import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { errorMessage, getBest } from '../api';
import ChatPanel from '../components/ChatPanel';
import RestaurantCard from '../components/RestaurantCard';
import { ErrorBox, Spinner } from '../components/Status';
import { isRegionKey, REGIONS } from '../constants';
import type { BestResponse } from '../types';

export default function BestOfBayPage() {
  // The region lives in the URL (/best?region=eastbay) so links and the back button work.
  const [searchParams, setSearchParams] = useSearchParams();
  const regionParam = searchParams.get('region');
  const region = isRegionKey(regionParam) ? regionParam : 'sf';

  const [data, setData] = useState<BestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [city, setCity] = useState('All');
  const [reloadCount, setReloadCount] = useState(0); // bump to retry

  // Fetch the ranking whenever the region changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setCity('All');
    getBest(region)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(errorMessage(err));
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [region, reloadCount]);

  // Filter by city (East Bay and Marin have several cities).
  const shown = useMemo(() => {
    if (!data) return [];
    return city === 'All' ? data.businesses : data.businesses.filter((b) => b.city === city);
  }, [data, city]);

  const regionInfo = REGIONS.find((r) => r.key === region)!;

  return (
    <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8">
      <main className="min-w-0 flex-1">
        <h1 className="text-3xl font-extrabold">Best of the Bay</h1>
        <p className="mt-1 text-stone-600">
          Ranked by Yelp rating, counting only places with plenty of reviews. Rankings refresh every 24 hours.
        </p>

        {/* Region tabs */}
        <div className="mt-6 flex flex-wrap gap-2">
          {REGIONS.map((r) => (
            <button
              key={r.key}
              onClick={() => setSearchParams({ region: r.key })}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                r.key === region ? 'bg-stone-900 text-white' : 'bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-100'
              }`}
            >
              {r.emoji} {r.name}
            </button>
          ))}
        </div>

        {/* City filter chips */}
        {data && data.cities.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {['All', ...data.cities].map((c) => (
              <button
                key={c}
                onClick={() => setCity(c)}
                className={`rounded-full px-3 py-1 text-sm transition ${
                  c === city ? 'bg-red-600 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <div className="mt-6">
          {loading ? (
            <Spinner label={`Finding the best of ${regionInfo.name}…`} />
          ) : error ? (
            <ErrorBox message={error} onRetry={() => setReloadCount((n) => n + 1)} />
          ) : shown.length === 0 ? (
            <p className="py-12 text-center text-stone-500">No top-ranked restaurants found for {city}.</p>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {shown.map((r, i) => (
                  <RestaurantCard key={r.id} restaurant={r} rank={i + 1} />
                ))}
              </div>
              {data && (
                <p className="mt-6 text-xs text-stone-400">Last updated {new Date(data.cachedAt).toLocaleString()}</p>
              )}
            </>
          )}
        </div>
      </main>

      <ChatPanel
        contextKey={`best:${region}`}
        title={`Top spots in ${regionInfo.name}`}
        restaurants={shown}
        suggestions={['Which of these is best for a date night?', 'Which ones are under $$?', 'I want seafood, what should I try?']}
      />
    </div>
  );
}
