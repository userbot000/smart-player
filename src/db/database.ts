import Dexie, { Table } from 'dexie';
import { Song, Playlist, DownloadTask, AppSettings } from '../types';

// Bookmark interface
export interface Bookmark {
  id: string;
  songId: string;
  timestamp: number;
  label: string;
  createdAt: number;
}

// Tracked YouTube channel
export interface TrackedChannel {
  id: string;
  name: string;
  url: string;
  lastVideoId: string | null;
  lastCheck: number;
  addedAt: number;
}

// Artist filters
export interface ArtistFilters {
  id: string; // always 'filters'
  whitelist: string[];
  blacklist: string[];
}

// Blog sync state
export interface BlogSyncState {
  id: string; // always 'blog_sync'
  lastPostId: string | null;
  lastSyncTimestamp: number;
  downloadedPostIds: string[];
}

// App preferences (theme, accent color, etc.)
export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppPreferences {
  id: string; // always 'prefs'
  accentColor: string;
  themeMode: ThemeMode;
  // Legacy support
  isDark?: boolean;
}

// Player state for resume playback
export interface PlayerResumeState {
  id: string; // always 'player_state'
  songId: string | null;
  progress: number;
  volume: number;
  timestamp: number;
}

// Watched folder interface
export interface WatchedFolder {
  id: string;
  path: string;
  name: string;
  addedAt: number;
  lastScanned?: number;
  songCount: number;
}

// Database interface for type safety
export interface SmartPlayerDB extends Dexie {
  songs: Table<Song>;
  playlists: Table<Playlist>;
  downloads: Table<DownloadTask>;
  settings: Table<AppSettings & { id: string }>;
  bookmarks: Table<Bookmark>;
  trackedChannels: Table<TrackedChannel>;
  artistFilters: Table<ArtistFilters>;
  blogSync: Table<BlogSyncState>;
  preferences: Table<AppPreferences>;
  playerState: Table<PlayerResumeState>;
  watchedFolders: Table<WatchedFolder>;
}

// Create database instance
const database = new Dexie('SmartPlayerDB') as SmartPlayerDB;

// Define schema BEFORE exporting or using the database
database.version(3).stores({
  songs: 'id, title, artist, album, genre, addedAt, playCount, lastPlayed, folderId, fileName',
  playlists: 'id, name, createdAt, updatedAt',
  downloads: 'id, status, url',
  settings: 'id',
  bookmarks: 'id, songId, timestamp',
  trackedChannels: 'id, name, lastCheck',
  artistFilters: 'id',
  blogSync: 'id',
  preferences: 'id',
  playerState: 'id',
  watchedFolders: 'id, path, addedAt',
});

// Export AFTER version is defined
export const db = database;

// Cache for blob URLs to avoid recreating them
const blobUrlCache = new Map<string, string>();

// Check if running in Tauri - check for actual Tauri API
const isTauri = typeof window !== 'undefined' && 
  typeof (window as any).__TAURI_INTERNALS__ !== 'undefined';

// Read audio file from disk using Tauri
export async function readAudioFile(filePath: string): Promise<ArrayBuffer | null> {
  if (!isTauri || !filePath) return null;
  
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const data: number[] = await invoke('read_audio_file', { filePath });
    return new Uint8Array(data).buffer;
  } catch (error) {
    console.error('Error reading audio file:', filePath, error);
    return null;
  }
}

// Create blob URL from file path (reads from disk)
export async function createAudioUrlAsync(song: Song): Promise<string | null> {
  // Return cached URL if exists
  if (blobUrlCache.has(song.id)) {
    return blobUrlCache.get(song.id)!;
  }

  // Try to read from original path first
  const filePath = song.originalPath || song.filePath;
  
  if (isTauri && filePath) {
    const audioData = await readAudioFile(filePath);
    if (audioData) {
      const blob = new Blob([audioData], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      blobUrlCache.set(song.id, url);
      return url;
    }
  }

  // Fallback to stored audioData (for legacy/migration)
  if (song.audioData) {
    const blob = new Blob([song.audioData], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    blobUrlCache.set(song.id, url);
    return url;
  }

  return null;
}

// Sync version for backward compatibility (returns cached or null)
export function createAudioUrl(song: Song): string {
  if (blobUrlCache.has(song.id)) {
    return blobUrlCache.get(song.id)!;
  }

  // For legacy songs with audioData
  if (song.audioData) {
    const blob = new Blob([song.audioData], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    blobUrlCache.set(song.id, url);
    return url;
  }

  return song.filePath || '';
}

// Revoke blob URL to free memory
export function revokeAudioUrl(songId: string): void {
  if (blobUrlCache.has(songId)) {
    URL.revokeObjectURL(blobUrlCache.get(songId)!);
    blobUrlCache.delete(songId);
  }
}

// Get cache size for debugging
export function getBlobCacheSize(): number {
  return blobUrlCache.size;
}

// Check if audio URL is cached
export function isAudioCached(songId: string): boolean {
  return blobUrlCache.has(songId);
}

// Helper functions
export async function getAllSongs(): Promise<Song[]> {
  const songs = await db.songs.toArray();
  // Return songs without loading audio data - will be loaded on demand
  return songs;
}

export async function addSong(song: Song): Promise<string> {
  return db.songs.add(song);
}

// Bulk add songs for faster indexing
export async function addSongsBulk(songs: Song[]): Promise<void> {
  await db.songs.bulkAdd(songs);
}

export async function updateSong(id: string, updates: Partial<Song>): Promise<number> {
  return db.songs.update(id, updates);
}

export async function deleteSong(id: string): Promise<void> {
  // Clean up blob URL cache
  if (blobUrlCache.has(id)) {
    URL.revokeObjectURL(blobUrlCache.get(id)!);
    blobUrlCache.delete(id);
  }
  return db.songs.delete(id);
}

export async function incrementPlayCount(id: string): Promise<void> {
  const song = await db.songs.get(id);
  if (song) {
    await db.songs.update(id, {
      playCount: song.playCount + 1,
      lastPlayed: Date.now(),
    });
  }
}

export async function getRecentlyPlayed(limit = 20): Promise<Song[]> {
  const songs = await db.songs
    .orderBy('lastPlayed')
    .reverse()
    .filter((song) => song.lastPlayed !== undefined)
    .limit(limit)
    .toArray();

  return songs;
}

export async function getMostPlayed(limit = 20): Promise<Song[]> {
  const songs = await db.songs.orderBy('playCount').reverse().limit(limit).toArray();
  return songs;
}

export async function searchSongs(query: string): Promise<Song[]> {
  const lowerQuery = query.toLowerCase();
  const songs = await db.songs
    .filter(
      (song) =>
        song.title.toLowerCase().includes(lowerQuery) ||
        song.artist.toLowerCase().includes(lowerQuery) ||
        (song.album?.toLowerCase().includes(lowerQuery) ?? false)
    )
    .toArray();

  return songs;
}


// ============ Bookmarks ============
export async function getBookmarks(songId?: string): Promise<Bookmark[]> {
  if (songId) {
    return db.bookmarks.where('songId').equals(songId).toArray();
  }
  return db.bookmarks.toArray();
}

export async function addBookmark(songId: string, timestamp: number, label?: string): Promise<Bookmark> {
  const bookmark: Bookmark = {
    id: crypto.randomUUID(),
    songId,
    timestamp,
    label: label || formatTimeSimple(timestamp),
    createdAt: Date.now(),
  };
  await db.bookmarks.add(bookmark);
  return bookmark;
}

export async function removeBookmark(id: string): Promise<void> {
  await db.bookmarks.delete(id);
}

function formatTimeSimple(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============ Tracked Channels ============
export async function getTrackedChannels(): Promise<TrackedChannel[]> {
  return db.trackedChannels.toArray();
}

export async function addTrackedChannel(channel: TrackedChannel): Promise<void> {
  await db.trackedChannels.add(channel);
}

export async function updateTrackedChannel(id: string, updates: Partial<TrackedChannel>): Promise<void> {
  await db.trackedChannels.update(id, updates);
}

export async function removeTrackedChannel(id: string): Promise<void> {
  await db.trackedChannels.delete(id);
}

export async function saveTrackedChannels(channels: TrackedChannel[]): Promise<void> {
  await db.trackedChannels.clear();
  await db.trackedChannels.bulkAdd(channels);
}

// ============ Artist Filters ============
export async function getArtistFilters(): Promise<ArtistFilters> {
  const filters = await db.artistFilters.get('filters');
  return filters || { id: 'filters', whitelist: [], blacklist: [] };
}

export async function saveArtistFilters(filters: Omit<ArtistFilters, 'id'>): Promise<void> {
  await db.artistFilters.put({ id: 'filters', ...filters });
}

// ============ Blog Sync State ============
export async function getBlogSyncState(): Promise<BlogSyncState> {
  const state = await db.blogSync.get('blog_sync');
  return state || { id: 'blog_sync', lastPostId: null, lastSyncTimestamp: 0, downloadedPostIds: [] };
}

export async function saveBlogSyncState(state: Omit<BlogSyncState, 'id'>): Promise<void> {
  await db.blogSync.put({ id: 'blog_sync', ...state });
}

// ============ App Preferences ============
export async function getPreferences(): Promise<AppPreferences> {
  const prefs = await db.preferences.get('prefs');
  if (!prefs) {
    return { id: 'prefs', accentColor: 'blue', themeMode: 'system' };
  }
  // Migrate from old isDark to new themeMode
  if (prefs.themeMode === undefined && prefs.isDark !== undefined) {
    return { ...prefs, themeMode: prefs.isDark ? 'dark' : 'light' };
  }
  return { ...prefs, themeMode: prefs.themeMode || 'system' };
}

export async function savePreferences(prefs: Omit<AppPreferences, 'id'>): Promise<void> {
  await db.preferences.put({ id: 'prefs', ...prefs });
}

// ============ Player Resume State ============
export async function getPlayerState(): Promise<PlayerResumeState> {
  const state = await db.playerState.get('player_state');
  return state || { id: 'player_state', songId: null, progress: 0, volume: 0.7, timestamp: 0 };
}

export async function savePlayerState(state: Omit<PlayerResumeState, 'id'>): Promise<void> {
  await db.playerState.put({ id: 'player_state', ...state });
}
