// Artist whitelist/blacklist filters for download updates

const STORAGE_KEY = 'artist_filters';

export interface ArtistFilters {
  whitelist: string[]; // Only download these artists (if not empty)
  blacklist: string[]; // Never download these artists
}

export function getArtistFilters(): ArtistFilters {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return { whitelist: [], blacklist: [] };
}

export function saveArtistFilters(filters: ArtistFilters): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
}

export function addToWhitelist(artist: string): void {
  const filters = getArtistFilters();
  const normalized = artist.trim();
  if (normalized && !filters.whitelist.includes(normalized)) {
    filters.whitelist.push(normalized);
    // Remove from blacklist if exists
    filters.blacklist = filters.blacklist.filter(a => a !== normalized);
    saveArtistFilters(filters);
  }
}

export function addToBlacklist(artist: string): void {
  const filters = getArtistFilters();
  const normalized = artist.trim();
  if (normalized && !filters.blacklist.includes(normalized)) {
    filters.blacklist.push(normalized);
    // Remove from whitelist if exists
    filters.whitelist = filters.whitelist.filter(a => a !== normalized);
    saveArtistFilters(filters);
  }
}

export function removeFromWhitelist(artist: string): void {
  const filters = getArtistFilters();
  filters.whitelist = filters.whitelist.filter(a => a !== artist);
  saveArtistFilters(filters);
}

export function removeFromBlacklist(artist: string): void {
  const filters = getArtistFilters();
  filters.blacklist = filters.blacklist.filter(a => a !== artist);
  saveArtistFilters(filters);
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
