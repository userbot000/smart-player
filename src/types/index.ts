// Types for Smart Audio Player

export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  filePath: string; // Will be blob URL created from audioData
  coverUrl?: string;
  addedAt: number;
  playCount: number;
  lastPlayed?: number;
  genre?: string;
  bpm?: number;
  energy?: number; // 0-1 scale for smart queue
  folderId?: string; // Reference to watched folder
  fileName?: string; // Original filename for re-scanning
  originalPath?: string; // Full path to original file (for Tauri)
  subFolder?: string; // Relative subfolder path within watched folder
  audioData?: ArrayBuffer; // Stored audio file data
  isFavorite?: boolean; // User marked as favorite
}

export interface Playlist {
  id: string;
  name: string;
  songIds: string[];
  createdAt: number;
  updatedAt: number;
  coverUrl?: string;
}

export interface PlayerState {
  currentSong: Song | null;
  queue: Song[];
  queueIndex: number;
  isPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;
  shuffle: boolean;
  repeat: 'none' | 'one' | 'all';
  smartQueue: boolean; // YouTube-like algorithm
}

export interface DownloadTask {
  id: string;
  url: string;
  title: string;
  status: 'pending' | 'downloading' | 'completed' | 'error';
  progress: number;
  error?: string;
  outputPath?: string;
}

export interface AppSettings {
  downloadPath: string;
  theme: 'light' | 'dark' | 'system';
  language: 'he' | 'en';
  autoPlay: boolean;
  crossfade: number; // seconds
  normalizeVolume: boolean;
}
