// Shares the favorites list with the whole app using React Context, so the
// heart button on any card and the Favorites page stay in sync.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { addFavorite, errorMessage, getFavorites, removeFavorite, toBasicRestaurant } from '../api';
import type { Restaurant } from '../types';

interface FavoritesValue {
  favorites: Restaurant[];
  loading: boolean;
  error: string | null;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (restaurant: Restaurant) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load saved favorites from our server (MongoDB) once, when the app starts.
  useEffect(() => {
    let cancelled = false; // ignore the result if the component unmounted
    getFavorites()
      .then((list) => {
        if (!cancelled) setFavorites(list);
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
  }, []);

  // A Set makes "is this saved?" checks fast. useMemo only rebuilds it when favorites change.
  const savedIds = useMemo(() => new Set(favorites.map((f) => f.id)), [favorites]);

  const isFavorite = useCallback((id: string) => savedIds.has(id), [savedIds]);

  // "Optimistic update": change the UI right away, then tell the server.
  // If the server call fails, reload the real list so the UI stays correct.
  const toggleFavorite = useCallback(
    async (restaurant: Restaurant) => {
      const basic = toBasicRestaurant(restaurant);
      try {
        if (savedIds.has(basic.id)) {
          setFavorites((prev) => prev.filter((f) => f.id !== basic.id));
          await removeFavorite(basic.id);
        } else {
          setFavorites((prev) => [basic, ...prev]);
          await addFavorite(basic);
        }
        setError(null);
      } catch (err) {
        setError(errorMessage(err));
        getFavorites().then(setFavorites).catch(() => {});
      }
    },
    [savedIds]
  );

  const value = useMemo(
    () => ({ favorites, loading, error, isFavorite, toggleFavorite }),
    [favorites, loading, error, isFavorite, toggleFavorite]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

// Custom hook: any component can call useFavorites() to read or change favorites.
export function useFavorites(): FavoritesValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used inside <FavoritesProvider>');
  return ctx;
}
