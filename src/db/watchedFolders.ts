import { db } from './database';

export interface WatchedFolder {
  id: string;
  path: string;
  name: string;
  addedAt: number;
  lastScanned?: number;
  songCount: number;
}

// Extend database schema
db.version(2).stores({
  songs: 'id, title, artist, album, genre, addedAt, playCount, lastPlayed, folderId, fileName',
  playlists: 'id, name, createdAt, updatedAt',
  downloads: 'id, status, url',
  settings: 'id',
  watchedFolders: 'id, path, addedAt',
});

export async function getWatchedFolders(): Promise<WatchedFolder[]> {
  return (db as any).watchedFolders.toArray();
}

export async function getWatchedFolderByName(name: string): Promise<WatchedFolder | undefined> {
  return (db as any).watchedFolders.where('path').equals(name).first();
}

export async function addWatchedFolder(folder: WatchedFolder): Promise<string> {
  return (db as any).watchedFolders.add(folder);
}

export async function removeWatchedFolder(id: string): Promise<void> {
  // Remove folder and its songs
  await db.songs.where('folderId').equals(id).delete();
  await (db as any).watchedFolders.delete(id);
}

export async function updateFolderScanTime(id: string): Promise<void> {
  await (db as any).watchedFolders.update(id, {
    lastScanned: Date.now(),
  });
}

export async function updateFolderSongCount(id: string, count: number): Promise<void> {
  await (db as any).watchedFolders.update(id, {
    songCount: count,
  });
}

// Get all song fileNames in a folder (for checking duplicates)
export async function getSongFileNamesInFolder(folderId: string): Promise<Set<string>> {
  const songs = await db.songs.where('folderId').equals(folderId).toArray();
  return new Set(songs.map(s => s.fileName).filter(Boolean) as string[]);
}

// Count songs in folder
export async function countSongsInFolder(folderId: string): Promise<number> {
  return db.songs.where('folderId').equals(folderId).count();
}
