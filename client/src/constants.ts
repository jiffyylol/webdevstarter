import type { RegionKey } from './types';

export const REGIONS: { key: RegionKey; name: string; blurb: string; emoji: string }[] = [
  { key: 'sf', name: 'San Francisco', blurb: 'Mission burritos to tasting menus', emoji: '🌉' },
  { key: 'marin', name: 'Sausalito & Marin', blurb: 'Waterfront seafood and bay views', emoji: '⛵' },
  { key: 'eastbay', name: 'East Bay', blurb: 'Berkeley, Oakland, Richmond and more', emoji: '🌳' },
];

export function isRegionKey(value: string | null): value is RegionKey {
  return value === 'sf' || value === 'marin' || value === 'eastbay';
}

// Suggestions for the location box (users can still type anything).
export const BAY_AREA_LOCATIONS = [
  'San Francisco, CA',
  'Sausalito, CA',
  'Mill Valley, CA',
  'Tiburon, CA',
  'Berkeley, CA',
  'Oakland, CA',
  'Emeryville, CA',
  'Albany, CA',
  'El Cerrito, CA',
  'Richmond, CA',
  'Alameda, CA',
];

export const SORT_OPTIONS = [
  { value: 'best_match', label: 'Best match' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'review_count', label: 'Most reviewed' },
  { value: 'distance', label: 'Closest' },
];
