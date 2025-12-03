import { Song } from '../types';
import { addSong } from '../db/database';
import { extractMetadata } from './audioMetadata';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

export interface DownloadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export interface ScrapedAudioFile {
  url: string;
  name: string;
  size?: number;
}

export interface ScrapeResult {
  files: ScrapedAudioFile[];
  pageTitle?: string;
  error?: string;
}

// Audio file extensions to look for
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac', '.wma', '.opus'];

// Check if URL is an audio file
function isAudioUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase().split('?')[0];
  return AUDIO_EXTENSIONS.some(ext => lowerUrl.endsWith(ext));
}

// Extract filename from URL
function getFileNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1];
    return decodeURIComponent(fileName.split('?')[0]) || 'audio.mp3';
  } catch {
    const parts = url.split('/');
    return parts[parts.length - 1].split('?')[0] || 'audio.mp3';
  }
}

// Fetch HTML using Tauri HTTP (bypasses CORS)
async function fetchHtml(url: string): Promise<string> {
  const response = await tauriFetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,he;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.text();
}

// Scrape audio files from any URL
export async function scrapeAudioFiles(url: string): Promise<ScrapeResult> {
  try {
    // If URL is already a direct audio file, return it
    if (isAudioUrl(url)) {
      return {
        files: [{
          url,
          name: getFileNameFromUrl(url),
        }],
      };
    }

    // Handle archive.org specially
    if (url.includes('archive.org')) {
      return await scrapeArchiveOrg(url);
    }

    // Generic HTML scraping
    const html = await fetchHtml(url);
    return scrapeAudioFromHtml(html, url);
  } catch (error) {
    return {
      files: [],
      error: error instanceof Error ? error.message : 'שגיאה בגירוד הדף',
    };
  }
}

// Scrape archive.org using their metadata API
async function scrapeArchiveOrg(url: string): Promise<ScrapeResult> {
  // Extract identifier from URL
  const match = url.match(/archive\.org\/(details|download)\/([^\/\?]+)/i);
  if (!match) {
    return { files: [], error: 'כתובת archive.org לא תקינה' };
  }

  const identifier = match[2];
  
  try {
    const response = await tauriFetch(`https://archive.org/metadata/${identifier}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json() as {
      files?: Array<{ name: string; size?: string }>;
      d1?: string;
      server?: string;
      dir?: string;
    };

    if (!data.files || !Array.isArray(data.files)) {
      return { files: [], error: 'לא נמצאו קבצים בארכיון' };
    }

    const server = data.d1 || data.server;
    const dir = data.dir;
    const files: ScrapedAudioFile[] = [];

    for (const file of data.files) {
      if (isAudioUrl(file.name)) {
        let fileUrl: string;
        if (server && dir) {
          fileUrl = `https://${server}${dir}/${encodeURIComponent(file.name)}`;
        } else {
          fileUrl = `https://archive.org/download/${identifier}/${encodeURIComponent(file.name)}`;
        }

        files.push({
          url: fileUrl,
          name: file.name,
          size: file.size ? parseInt(file.size, 10) : undefined,
        });
      }
    }

    return { files, pageTitle: identifier.replace(/_/g, ' ') };
  } catch (error) {
    return {
      files: [],
      error: error instanceof Error ? error.message : 'שגיאה בטעינת מטאדאטה',
    };
  }
}

// Generic HTML scraping for audio files
function scrapeAudioFromHtml(html: string, baseUrl: string): ScrapeResult {
  const files: ScrapedAudioFile[] = [];
  const foundUrls = new Set<string>();

  // Extract page title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const pageTitle = titleMatch ? titleMatch[1].trim() : undefined;

  // Pattern 1: <source> tags
  const sourcePattern = /<source[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = sourcePattern.exec(html)) !== null) {
    const src = match[1].replace(/&amp;/g, '&');
    if (isAudioUrl(src)) {
      const fullUrl = resolveUrl(src, baseUrl);
      if (!foundUrls.has(fullUrl)) {
        foundUrls.add(fullUrl);
        files.push({ url: fullUrl, name: getFileNameFromUrl(fullUrl) });
      }
    }
  }

  // Pattern 2: <audio> tags with src
  const audioPattern = /<audio[^>]+src=["']([^"']+)["']/gi;
  while ((match = audioPattern.exec(html)) !== null) {
    const src = match[1].replace(/&amp;/g, '&');
    if (isAudioUrl(src)) {
      const fullUrl = resolveUrl(src, baseUrl);
      if (!foundUrls.has(fullUrl)) {
        foundUrls.add(fullUrl);
        files.push({ url: fullUrl, name: getFileNameFromUrl(fullUrl) });
      }
    }
  }

  // Pattern 3: Direct links to audio files
  const linkPattern = /href=["'](https?:\/\/[^"']+)["']/gi;
  while ((match = linkPattern.exec(html)) !== null) {
    const href = match[1].replace(/&amp;/g, '&');
    if (isAudioUrl(href) && !foundUrls.has(href)) {
      foundUrls.add(href);
      files.push({ url: href, name: getFileNameFromUrl(href) });
    }
  }

  // Pattern 4: Relative links to audio files
  const relativeLinkPattern = /href=["']([^"']+\.(mp3|wav|flac|ogg|m4a|aac)[^"']*)["']/gi;
  while ((match = relativeLinkPattern.exec(html)) !== null) {
    const href = match[1].replace(/&amp;/g, '&');
    if (!href.startsWith('http')) {
      const fullUrl = resolveUrl(href, baseUrl);
      if (!foundUrls.has(fullUrl)) {
        foundUrls.add(fullUrl);
        files.push({ url: fullUrl, name: getFileNameFromUrl(fullUrl) });
      }
    }
  }

  // Pattern 5: JavaScript strings containing audio URLs
  const jsPattern = /["'](https?:\/\/[^"']+\.(mp3|wav|flac|ogg|m4a|aac)[^"']*)["']/gi;
  while ((match = jsPattern.exec(html)) !== null) {
    const url = match[1].replace(/\\u002F/g, '/').replace(/\\/g, '');
    if (!foundUrls.has(url)) {
      foundUrls.add(url);
      files.push({ url, name: getFileNameFromUrl(url) });
    }
  }

  return { files, pageTitle };
}

// Resolve relative URL to absolute
function resolveUrl(relativeUrl: string, baseUrl: string): string {
  try {
    return new URL(relativeUrl, baseUrl).href;
  } catch {
    return relativeUrl;
  }
}

// Download audio file using Tauri HTTP (bypasses CORS)
export async function downloadAudioFromUrl(
  url: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<Song> {
  // Use Tauri HTTP to bypass CORS
  const response = await tauriFetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'audio/*,*/*;q=0.9',
      'Referer': new URL(url).origin,
    },
  });

  if (!response.ok) {
    throw new Error(`הורדה נכשלה: ${response.status} ${response.statusText}`);
  }

  // Get content length for progress
  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  // Get the data as ArrayBuffer
  const arrayBuffer = await response.arrayBuffer();
  const audioData = new Uint8Array(arrayBuffer);

  // Report final progress
  if (onProgress) {
    onProgress({
      loaded: audioData.length,
      total: total || audioData.length,
      percent: 100,
    });
  }

  // Get filename from URL
  const fileName = getFileNameFromUrl(url);

  // Determine MIME type
  const mimeType = getMimeType(fileName);

  // Create a File object for metadata extraction
  const file = new File([audioData], fileName, { type: mimeType });

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

// Get MIME type from filename
function getMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop();
  const mimeTypes: Record<string, string> = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    flac: 'audio/flac',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    wma: 'audio/x-ms-wma',
    opus: 'audio/opus',
  };
  return mimeTypes[ext || ''] || 'audio/mpeg';
}

// Batch download with concurrency control
export interface BatchDownloadOptions {
  urls: string[];
  concurrency?: number;
  onFileProgress?: (url: string, progress: DownloadProgress) => void;
  onFileComplete?: (url: string, song: Song) => void;
  onFileError?: (url: string, error: string) => void;
  onBatchProgress?: (completed: number, total: number) => void;
}

export async function batchDownloadAudio(options: BatchDownloadOptions): Promise<{
  successful: Song[];
  failed: Array<{ url: string; error: string }>;
}> {
  const {
    urls,
    concurrency = 3,
    onFileProgress,
    onFileComplete,
    onFileError,
    onBatchProgress,
  } = options;

  const successful: Song[] = [];
  const failed: Array<{ url: string; error: string }> = [];
  let completed = 0;

  // Process URLs in batches
  const queue = [...urls];
  const activeDownloads: Promise<void>[] = [];

  const processNext = async (): Promise<void> => {
    const url = queue.shift();
    if (!url) return;

    try {
      const song = await downloadAudioFromUrl(url, (progress) => {
        onFileProgress?.(url, progress);
      });
      successful.push(song);
      onFileComplete?.(url, song);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'שגיאה לא ידועה';
      failed.push({ url, error: errorMsg });
      onFileError?.(url, errorMsg);
    }

    completed++;
    onBatchProgress?.(completed, urls.length);

    // Process next item if queue not empty
    if (queue.length > 0) {
      await processNext();
    }
  };

  // Start initial batch of downloads
  for (let i = 0; i < Math.min(concurrency, urls.length); i++) {
    activeDownloads.push(processNext());
  }

  // Wait for all downloads to complete
  await Promise.all(activeDownloads);

  return { successful, failed };
}

// Smart download: scrape and download all audio from URL
export async function smartDownload(
  url: string,
  options?: Omit<BatchDownloadOptions, 'urls'>
): Promise<{
  scrapeResult: ScrapeResult;
  downloadResult?: { successful: Song[]; failed: Array<{ url: string; error: string }> };
}> {
  // First, scrape the URL for audio files
  const scrapeResult = await scrapeAudioFiles(url);

  if (scrapeResult.error || scrapeResult.files.length === 0) {
    return { scrapeResult };
  }

  // Download all found files
  const downloadResult = await batchDownloadAudio({
    urls: scrapeResult.files.map(f => f.url),
    ...options,
  });

  return { scrapeResult, downloadResult };
}
