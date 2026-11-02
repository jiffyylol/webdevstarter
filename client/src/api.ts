// Every call from the React app to our Express server goes through this file.
// We use Axios (a class requirement) instead of fetch.
import axios from 'axios';
import type {
  BestResponse,
  ChatMessage,
  RegionKey,
  Restaurant,
  RestaurantDetail,
  SearchResponse,
} from './types';

const SESSION_KEY = 'baybites-session-id';

// A random id that identifies this browser, saved in localStorage so it
// survives refreshes. The server stores favorites and chats under it.
export function getSessionId(): string {
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return 'anonymous'; // localStorage blocked (e.g. private mode)
  }
}

// An Axios instance: every request starts with /api and sends the session id.
// Vite's proxy (vite.config.ts) forwards /api to http://localhost:5001.
const api = axios.create({
  baseURL: '/api',
  headers: { 'x-session-id': getSessionId() },
});

// Turn any error into a message we can show the user.
export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined;
    if (data?.error) return data.error;
    if (!err.response || err.response.status >= 500) {
      return "Can't reach the server. Is the backend running? (cd server && npm run dev)";
    }
    return err.message;
  }
  return err instanceof Error ? err.message : 'Something went wrong.';
}

// Keep only the basic Restaurant fields (drops photos, reviews, etc.).
export function toBasicRestaurant(r: Restaurant): Restaurant {
  const { id, name, imageUrl, url, rating, reviewCount, price, categories, address, city, phone } = r;
  return { id, name, imageUrl, url, rating, reviewCount, price, categories, address, city, phone, distance: null };
}

// ---------- Restaurants (Yelp data, through our server) ----------

export interface SearchFilters {
  term: string;
  location: string;
  price: string; // "1,2"
  minRating: string; // "4"
  sortBy: string;
}

export async function searchRestaurants(filters: SearchFilters, offset = 0): Promise<SearchResponse> {
  const res = await api.get<SearchResponse>('/restaurants/search', { params: { ...filters, offset } });
  return res.data;
}

export async function getBest(region: RegionKey): Promise<BestResponse> {
  const res = await api.get<BestResponse>('/restaurants/best', { params: { region } });
  return res.data;
}

export async function getRestaurant(id: string): Promise<RestaurantDetail> {
  const res = await api.get<RestaurantDetail>(`/restaurants/${encodeURIComponent(id)}`);
  return res.data;
}

// ---------- Favorites (stored in MongoDB) ----------

export async function getFavorites(): Promise<Restaurant[]> {
  const res = await api.get<Restaurant[]>('/favorites');
  return res.data;
}

export async function addFavorite(restaurant: Restaurant): Promise<Restaurant> {
  const res = await api.post<Restaurant>('/favorites', restaurant);
  return res.data;
}

export async function removeFavorite(id: string): Promise<void> {
  await api.delete(`/favorites/${encodeURIComponent(id)}`);
}

// ---------- Chat (OpenAI, through our server; history in MongoDB) ----------

export async function getChatHistory(contextKey: string): Promise<ChatMessage[]> {
  const res = await api.get<{ messages: ChatMessage[] }>('/chat', { params: { contextKey } });
  return res.data.messages;
}

export async function sendChatMessage(body: {
  message: string;
  contextKey: string;
  restaurantId?: string;
  restaurants?: Restaurant[];
}): Promise<{ reply: string; messages: ChatMessage[] }> {
  const res = await api.post<{ reply: string; messages: ChatMessage[] }>('/chat', body);
  return res.data;
}

export async function clearChat(contextKey: string): Promise<void> {
  await api.delete('/chat', { params: { contextKey } });
}
