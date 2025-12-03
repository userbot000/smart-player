import { Song } from '../types';
import { addSong } from '../db/database';
import { extractMetadata } from './audioMetadata';

export interface DownloadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export async function downloadAudioFromUrl(
  url: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<Song> {
  // Fetch the audio file
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
  }

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  // Read the response as a stream to track progress
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Failed to read response body');
  }

  const chunks: Uint8Array[] = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    loaded += value.length;

    if (onProgress && total > 0) {
      onProgress({
        loaded,
        total,
        percent: (loaded / total) * 100,
      });
    }
  }

  // Combine chunks into a single ArrayBuffer
  const audioData = new Uint8Array(loaded);
  let position = 0;
  for (const chunk of chunks) {
    audioData.set(chunk, position);
    position += chunk.length;
  }

  // Get filename from URL
  const urlParts = url.split('/');
  const fileName = urlParts[urlParts.length - 1].split('?')[0] || 'downloaded-audio.mp3';

  // Create a File object for metadata extraction
  const file = new File([audioData], fileName, { type: 'audio/mpeg' });

  // Extract metadata
  const metadata = await extractMetadata(file);

  // Create song object
  const song: Song = {
    id: crypto.randomUUID(),
    title: metadata.title,
    artist: metadata.artist,
    album: metadata.album,
    duration: metadata.duration,
    genre: metadata.genre,
    coverUrl: metadata.coverUrl,
    filePath: '', // Will be created from audioData
    audioData: audioData.buffer,
    addedAt: Date.now(),
    playCount: 0,
    fileName,
  };

  // Save to database
  await addSong(song);

  return song;
}
