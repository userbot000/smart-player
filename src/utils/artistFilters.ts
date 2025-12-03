// Artist whitelist/blacklist filters for download updates
// Uses IndexedDB via database.ts

import {
  getArtistFilters as dbGetFilters,
  saveArtistFilters as dbSaveFilters,
  type ArtistFilters,
} from '../db/database';

export type { ArtistFilters };

// Cache for sync access (updated on every save)
let filtersCache: ArtistFilters = { id: 'filters', whitelist: [], blacklist: [] };

// Initialize cache
dbGetFilters().then(f => { filtersCache = f; });

export function getArtistFilters(): ArtistFilters {
  return filtersCache;
}

export async function getArtistFiltersAsync(): Promise<ArtistFilters> {
  filtersCache = await dbGetFilters();
  return filtersCache;
}

export async function saveArtistFilters(filters: { whitelist: string[]; blacklist: string[] }): Promise<void> {
  await dbSaveFilters(filters);
  filtersCache = { id: 'filters', ...filters };
}

// Check if a song title/artist should be downloaded based on filters
export function shouldDownload(title: string): boolean {
  const filters = getArtistFilters();
  const lowerTitle = title.toLowerCase();

  // If whitelist is not empty, only allow whitelisted artists
  if (filters.whitelist.length > 0) {
    const isWhitelisted = filters.whitelist.some(artist =>
      lowerTitle.includes(artist.toLowerCase())
    );
    if (!isWhitelisted) return false;
  }

  // Check blacklist
  const isBlacklisted = filters.blacklist.some(artist =>
    lowerTitle.includes(artist.toLowerCase())
  );

  return !isBlacklisted;
}

// Filter a list of URLs based on their filenames
export function filterUrlsByArtist(urls: string[]): string[] {
  return urls.filter(url => {
    // Extract filename from URL
    const parts = url.split('/');
    const filename = decodeURIComponent(parts[parts.length - 1].split('?')[0]);
    return shouldDownload(filename);
  });
}
