import Dexie, { Table } from 'dexie';
import { Song, Playlist, DownloadTask, AppSettings } from '../types';

export class SmartPlayerDB extends Dexie {
  songs!: Table<Song>;
  playlists!: Table<Playlist>;
  downloads!: Table<DownloadTask>;
  settings!: Table<AppSettings & { id: string }>;

  constructor() {
    super('SmartPlayerDB');

    this.version(1).stores({
      songs: 'id, title, artist, album, genre, addedAt, playCount, lastPlayed',
      playlists: 'id, name, createdAt, updatedAt',
      downloads: 'id, status, url',
      settings: 'id',
    });
  }
}

export const db = new SmartPlayerDB();

// Cache for blob URLs to avoid recreating them
const blobUrlCache = new Map<string, string>();

// Create blob URL from stored audio data
export function createAudioUrl(song: Song): string {
  if (blobUrlCache.has(song.id)) {
    return blobUrlCache.get(song.id)!;
  }

  if (song.audioData) {
    const blob = new Blob([song.audioData], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    blobUrlCache.set(song.id, url);
    return url;
  }

  return song.filePath;
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

// Helper functions
export async function getAllSongs(): Promise<Song[]> {
  const songs = await db.songs.toArray();
  // Create blob URLs for each song
  return songs.map((song) => ({
    ...song,
    filePath: createAudioUrl(song),
  }));
}

export async function addSong(song: Song): Promise<string> {
  return db.songs.add(song);
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

  return songs.map((song) => ({
    ...song,
    filePath: createAudioUrl(song),
  }));
}

export async function getMostPlayed(limit = 20): Promise<Song[]> {
  const songs = await db.songs.orderBy('playCount').reverse().limit(limit).toArray();

  return songs.map((song) => ({
    ...song,
    filePath: createAudioUrl(song),
  }));
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

  return songs.map((song) => ({
    ...song,
    filePath: createAudioUrl(song),
  }));
}
