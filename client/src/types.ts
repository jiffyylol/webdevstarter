// TypeScript types for the data our Express API sends back.
// They match the objects built in server/services/yelp.js.

export interface Restaurant {
  id: string;
  name: string;
  imageUrl: string | null;
  url: string;
  rating: number;
  reviewCount: number;
  price: string | null; // "$" to "$$$$"
  categories: string[];
  address: string;
  city: string;
  phone: string;
  distance: number | null; // meters, only for searches
}

export interface Review {
  id: string;
  text: string;
  rating: number;
  timeCreated: string;
  userName: string;
  userImage: string | null;
  url: string;
}

export interface HoursDay {
  day: string;
  ranges: string[]; // e.g. ["11:00 AM – 2:30 PM", "5:00 PM – 10:00 PM"]
}

export interface RestaurantDetail extends Restaurant {
  photos: string[];
  hours: HoursDay[];
  isOpenNow: boolean | null;
  transactions: string[];
  reviews: Review[];
  reviewsUnavailable: boolean;
}

export interface SearchResponse {
  total: number;
  businesses: Restaurant[];
  nextOffset: number;
  hasMore: boolean;
}

export type RegionKey = 'sf' | 'marin' | 'eastbay';

export interface BestResponse {
  region: RegionKey;
  label: string;
  cities: string[];
  businesses: Restaurant[];
  cachedAt: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
