import { Link } from 'react-router-dom';
import RestaurantCard from '../components/RestaurantCard';
import { ErrorBox, Spinner } from '../components/Status';
import { useFavorites } from '../context/FavoritesContext';

export default function FavoritesPage() {
  // The list comes from FavoritesContext, which loaded it from MongoDB.
  const { favorites, loading, error } = useFavorites();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-extrabold">Your favorites</h1>
      <p className="mt-1 text-stone-600">Tap the heart on any restaurant to add or remove it.</p>

      <div className="mt-6">
        {error && (
          <div className="mb-4">
            <ErrorBox message={error} />
          </div>
        )}
        {loading ? (
          <Spinner />
        ) : favorites.length === 0 ? (
          <div className="rounded-2xl bg-white py-16 text-center ring-1 ring-stone-200">
            <p className="text-5xl">🤍</p>
            <p className="mt-3 text-stone-600">No favorites yet.</p>
            <Link
              to="/best"
              className="mt-4 inline-block rounded-xl bg-red-600 px-5 py-2.5 font-semibold text-white hover:bg-red-700"
            >
              Browse the Best of the Bay
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((r) => (
              <RestaurantCard key={r.id} restaurant={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
