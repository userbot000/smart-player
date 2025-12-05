import { db } from './database';
import type { WatchedFolder } from './database';

export type { WatchedFolder };

export async function getWatchedFolders(): Promise<WatchedFolder[]> {
  return db.watchedFolders.toArray();
}

export async function getWatchedFolderByName(name: string): Promise<WatchedFolder | undefined> {
  return db.watchedFolders.where('name').equals(name).first();
}

export async function getWatchedFolderByPath(path: string): Promise<WatchedFolder | undefined> {
  return db.watchedFolders.where('path').equals(path).first();
}

export async function addWatchedFolder(folder: WatchedFolder): Promise<string> {
  return db.watchedFolders.add(folder);
}

export async function removeWatchedFolder(id: string): Promise<void> {
  // Remove folder and its songs
  await db.songs.where('folderId').equals(id).delete();
  await db.watchedFolders.delete(id);
}

export async function updateFolderScanTime(id: string): Promise<void> {
  await db.watchedFolders.update(id, {
    lastScanned: Date.now(),
  });
}

export async function updateFolderSongCount(id: string, count: number): Promise<void> {
  await db.watchedFolders.update(id, {
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
