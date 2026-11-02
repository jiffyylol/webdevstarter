import { Link } from 'react-router-dom';
import { useFavorites } from '../context/FavoritesContext';
import type { Restaurant } from '../types';
import StarRating from './StarRating';

interface Props {
  restaurant: Restaurant;
  rank?: number; // shown as "#1", "#2"... on the Best of the Bay page
}

export default function RestaurantCard({ restaurant, rank }: Props) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const saved = isFavorite(restaurant.id);
  const details = [restaurant.price, ...restaurant.categories.slice(0, 2)].filter(Boolean).join(' · ');
  const miles = restaurant.distance ? (restaurant.distance / 1609).toFixed(1) : null;

  return (
    <Link
      to={`/restaurant/${restaurant.id}`}
      className="group block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-stone-200">
        {restaurant.imageUrl ? (
          <img
            src={restaurant.imageUrl}
            alt={restaurant.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl">🍽️</div>
        )}
        {rank !== undefined && (
          <span className="absolute left-3 top-3 rounded-full bg-stone-900/80 px-2.5 py-1 text-sm font-bold text-white">
            #{rank}
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            // The card is a link; stop the click from opening the restaurant page.
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(restaurant);
          }}
          aria-label={saved ? 'Remove from favorites' : 'Save to favorites'}
          className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-lg leading-none shadow transition hover:scale-110"
        >
          {saved ? '❤️' : '🤍'}
        </button>
      </div>

      <div className="p-4">
        <h3 className="line-clamp-1 text-lg font-bold leading-tight">{restaurant.name}</h3>
        <div className="mt-1.5 flex items-center gap-2 text-sm">
          <StarRating rating={restaurant.rating} />
          <span className="font-semibold">{restaurant.rating.toFixed(1)}</span>
          <span className="text-stone-500">({restaurant.reviewCount.toLocaleString()})</span>
        </div>
        {details && <p className="mt-1 line-clamp-1 text-sm text-stone-600">{details}</p>}
        <p className="mt-1 text-sm text-stone-500">
          {restaurant.city}
          {miles && ` · ${miles} mi`}
        </p>
      </div>
    </Link>
  );
}
