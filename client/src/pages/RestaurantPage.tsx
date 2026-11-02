import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { errorMessage, getRestaurant } from '../api';
import ChatPanel from '../components/ChatPanel';
import StarRating from '../components/StarRating';
import { ErrorBox, Spinner } from '../components/Status';
import { useFavorites } from '../context/FavoritesContext';
import type { RestaurantDetail } from '../types';

// Yelp dates look like "2026-10-12 18:22:01". Swapping the space for "T"
// makes them parse correctly in every browser (including Safari).
function formatDate(value: string) {
  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export default function RestaurantPage() {
  const { id = '' } = useParams(); // the :id part of /restaurant/:id
  const { isFavorite, toggleFavorite } = useFavorites();

  const [restaurant, setRestaurant] = useState<RestaurantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getRestaurant(id)
      .then((data) => {
        if (!cancelled) setRestaurant(data);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, reloadCount]);

  // JavaScript's getDay() has Sunday = 0; Yelp (and our hours list) starts on Monday.
  const todayIndex = (new Date().getDay() + 6) % 7;
  const saved = restaurant ? isFavorite(restaurant.id) : false;

  return (
    <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8">
      <main className="min-w-0 flex-1">
        <Link to="/search" className="text-sm font-semibold text-stone-500 hover:text-red-600">
          ← Back to search
        </Link>

        {loading ? (
          <Spinner label="Loading restaurant…" />
        ) : error || !restaurant ? (
          <div className="mt-4">
            <ErrorBox message={error ?? 'Restaurant not found.'} onRetry={() => setReloadCount((n) => n + 1)} />
          </div>
        ) : (
          <>
            {/* Photos */}
            <div className="mt-4 grid h-64 gap-2 overflow-hidden rounded-2xl sm:h-80 sm:grid-cols-3">
              {(restaurant.photos.length ? restaurant.photos : [restaurant.imageUrl]).slice(0, 3).map((photo, i) =>
                photo ? (
                  <img
                    key={photo}
                    src={photo}
                    alt={`${restaurant.name} photo ${i + 1}`}
                    className={`h-full w-full object-cover ${i === 0 ? 'sm:col-span-2' : 'hidden sm:block'}`}
                  />
                ) : (
                  <div key={i} className="flex items-center justify-center bg-stone-200 text-6xl sm:col-span-3">
                    🍽️
                  </div>
                )
              )}
            </div>

            {/* Header info */}
            <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold">{restaurant.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StarRating rating={restaurant.rating} className="text-xl" />
                  <span className="font-semibold">{restaurant.rating.toFixed(1)}</span>
                  <span className="text-stone-500">{restaurant.reviewCount.toLocaleString()} reviews</span>
                  {restaurant.isOpenNow !== null && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        restaurant.isOpenNow ? 'bg-green-100 text-green-800' : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {restaurant.isOpenNow ? 'Open now' : 'Closed now'}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-stone-600">
                  {[restaurant.price, ...restaurant.categories].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleFavorite(restaurant)}
                  className={`rounded-xl px-4 py-2 font-semibold transition ${
                    saved ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {saved ? '❤️ Saved' : '🤍 Save'}
                </button>
                <a
                  href={restaurant.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-white px-4 py-2 font-semibold ring-1 ring-stone-300 transition hover:bg-stone-100"
                >
                  View on Yelp ↗
                </a>
              </div>
            </div>

            {/* Details + hours */}
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
                <h2 className="font-bold">Location & contact</h2>
                <p className="mt-2 text-stone-700">{restaurant.address || 'Address not listed'}</p>
                {restaurant.address && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-sm font-semibold text-red-600 hover:underline"
                  >
                    Open in Maps
                  </a>
                )}
                {restaurant.phone && <p className="mt-3 text-stone-700">📞 {restaurant.phone}</p>}
                {restaurant.transactions.length > 0 && (
                  <p className="mt-3 text-sm text-stone-600">
                    Offers: {restaurant.transactions.map((t) => t.replace('_', ' ')).join(', ')}
                  </p>
                )}
              </section>

              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
                <h2 className="font-bold">Hours</h2>
                {restaurant.hours.length === 0 ? (
                  <p className="mt-2 text-stone-500">Hours not listed.</p>
                ) : (
                  <table className="mt-2 w-full text-sm">
                    <tbody>
                      {restaurant.hours.map((h, i) => (
                        <tr key={h.day} className={i === todayIndex ? 'font-bold text-red-700' : 'text-stone-700'}>
                          <td className="py-0.5 pr-4">{h.day}</td>
                          <td className="py-0.5">{h.ranges.length ? h.ranges.join(', ') : 'Closed'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            </div>

            {/* Reviews */}
            <section className="mt-8">
              <h2 className="text-xl font-bold">Recent reviews</h2>
              {restaurant.reviews.length === 0 ? (
                <p className="mt-2 text-stone-500">
                  {restaurant.reviewsUnavailable
                    ? "Yelp didn't return reviews for this restaurant (your Yelp API plan may not include reviews)."
                    : 'No reviews yet.'}
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  {restaurant.reviews.map((review) => (
                    <article key={review.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
                      <div className="flex items-center gap-3">
                        {review.userImage ? (
                          <img src={review.userImage} alt="" className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-200">👤</div>
                        )}
                        <div>
                          <p className="font-semibold">{review.userName}</p>
                          <div className="flex items-center gap-2 text-sm text-stone-500">
                            <StarRating rating={review.rating} className="text-sm" />
                            {formatDate(review.timeCreated)}
                          </div>
                        </div>
                      </div>
                      <p className="mt-3 text-stone-700">{review.text}</p>
                      <a
                        href={review.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-sm font-semibold text-red-600 hover:underline"
                      >
                        Read more on Yelp
                      </a>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <ChatPanel
        contextKey={`restaurant:${id}`}
        restaurantId={id}
        title={restaurant ? `Ask about ${restaurant.name}` : 'Ask about this restaurant'}
        suggestions={['Summarize the recent reviews', 'Is this good for a date?', 'What do people say about the service?']}
      />
    </div>
  );
}
