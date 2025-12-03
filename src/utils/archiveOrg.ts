// Archive.org hadshotmusic - Smart auto-update functionality
// Fetches audio files from archive.org items

const METADATA_URL = 'https://archive.org/metadata/';
const COLLECTION_PREFIX = 'hadshotmusic_';
const STORAGE_KEY = 'archive_last_sync';

export interface ArchiveFile {
  name: string;
  url: string;
  size?: number;
}

export interface ArchiveResult {
  date: string;
  files: ArchiveFile[];
  fullId: string;
  server?: string;
  dir?: string;
}

export interface SyncState {
  lastDate: string; // YYYYMMDD
  lastSyncTimestamp: number;
  downloadedIds: string[]; // List of already downloaded archive IDs
}

// Get sync state from localStorage
export function getSyncState(): SyncState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

// Save sync state to localStorage
export function saveSyncState(state: SyncState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Update sync state after successful download
export function markArchiveAsDownloaded(archiveId: string, date: string): void {
  const current = getSyncState() || {
    lastDate: '',
    lastSyncTimestamp: 0,
    downloadedIds: [],
  };

  // Update if this is newer
  if (date > current.lastDate) {
    current.lastDate = date;
  }

  if (!current.downloadedIds.includes(archiveId)) {
    current.downloadedIds.push(archiveId);
  }

  current.lastSyncTimestamp = Date.now();
  saveSyncState(current);
}

// Get date string for a specific number of days ago (YYYYMMDD format)
function getDateDaysAgo(daysAgo: number): string {
  const now = new Date();
  now.setDate(now.getDate() - daysAgo);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// Try to fetch metadata for a specific identifier
async function tryFetchMetadata(identifier: string): Promise<ArchiveResult | null> {
  try {
    const response = await fetch(`${METADATA_URL}${identifier}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // Check if item exists
    if (!data.files || !Array.isArray(data.files)) {
      return null;
    }

    const files: ArchiveFile[] = [];
    const audioExtensions = ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac'];

    // Get server and directory for building URLs
    const server = data.d1 || data.server;
    const dir = data.dir;

    for (const file of data.files) {
      const fileName = file.name;
      const isAudio = audioExtensions.some((ext) => fileName.toLowerCase().endsWith(ext));

      if (isAudio) {
        // Build the download URL
        let url: string;
        if (server && dir) {
          url = `https://${server}${dir}/${encodeURIComponent(fileName)}`;
        } else {
          url = `https://archive.org/download/${identifier}/${encodeURIComponent(fileName)}`;
        }

        files.push({
          name: decodeURIComponent(fileName),
          url,
          size: file.size ? parseInt(file.size, 10) : undefined,
        });
      }
    }

    if (files.length === 0) {
      return null;
    }

    // Extract date from identifier
    const dateMatch = identifier.match(/(\d{8})/);
    const date = dateMatch ? dateMatch[1] : '';

    return {
      date,
      files,
      fullId: identifier,
      server,
      dir,
    };
  } catch (error) {
    console.error(`Error fetching metadata for ${identifier}:`, error);
    return null;
  }
}

// Get the latest available archive
export async function getLatestArchive(): Promise<ArchiveResult | null> {
  // Try last 14 days
  for (let daysAgo = 0; daysAgo <= 14; daysAgo++) {
    const dateStr = getDateDaysAgo(daysAgo);
    const identifier = `${COLLECTION_PREFIX}${dateStr}`;

    const result = await tryFetchMetadata(identifier);
    if (result) {
      return result;
    }
  }

  return null;
}

// Get all new archives since last sync
export async function getNewArchivesSinceLastSync(): Promise<ArchiveResult[]> {
  const syncState = getSyncState();
  const newArchives: ArchiveResult[] = [];

  // If never synced, get last 7 days; otherwise check last 14 days
  const daysToCheck = syncState ? 14 : 7;

  for (let daysAgo = 0; daysAgo <= daysToCheck; daysAgo++) {
    const dateStr = getDateDaysAgo(daysAgo);
    const identifier = `${COLLECTION_PREFIX}${dateStr}`;

    // Skip if already downloaded
    if (syncState?.downloadedIds.includes(identifier)) {
      continue;
    }

    const result = await tryFetchMetadata(identifier);
    if (result) {
      newArchives.push(result);
    }
  }

  // Sort by date descending (newest first)
  newArchives.sort((a, b) => b.date.localeCompare(a.date));

  return newArchives;
}

// Check if there are new archives available (quick check)
export async function checkForNewArchives(): Promise<{ hasNew: boolean; count: number }> {
  const syncState = getSyncState();

  // Quick check - just try today and yesterday
  for (let daysAgo = 0; daysAgo <= 1; daysAgo++) {
    const dateStr = getDateDaysAgo(daysAgo);
    const identifier = `${COLLECTION_PREFIX}${dateStr}`;

    if (syncState?.downloadedIds.includes(identifier)) {
      continue;
    }

    const result = await tryFetchMetadata(identifier);
    if (result) {
      // Found new archive - do full check
      const allNew = await getNewArchivesSinceLastSync();
      const totalFiles = allNew.reduce((sum, a) => sum + a.files.length, 0);
      return { hasNew: true, count: totalFiles };
    }
  }

  return { hasNew: false, count: 0 };
}

// Get sync status for display
export function getSyncStatus(): {
  lastSync: string | null;
  lastDate: string | null;
  downloadedCount: number;
} {
  const state = getSyncState();

  if (!state) {
    return { lastSync: null, lastDate: null, downloadedCount: 0 };
  }

  const lastSyncDate = state.lastSyncTimestamp
    ? new Date(state.lastSyncTimestamp).toLocaleDateString('he-IL')
    : null;

  const lastArchiveDate = state.lastDate ? formatArchiveDate(state.lastDate) : null;

  return {
    lastSync: lastSyncDate,
    lastDate: lastArchiveDate,
    downloadedCount: state.downloadedIds.length,
  };
}

// Format date for display (YYYYMMDD -> DD/MM/YYYY)
export function formatArchiveDate(dateStr: string): string {
  if (dateStr.length !== 8) return dateStr;
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return `${day}/${month}/${year}`;
}
