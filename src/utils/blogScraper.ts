// Blogspot Scraper for newsmusic.blogspot.com
// Uses Tauri HTTP plugin to bypass CORS/NetFree restrictions

import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

const BLOG_BASE_URL = 'https://newsmusic.blogspot.com';
const STORAGE_KEY = 'blog_last_sync';

export interface BlogPost {
  id: string;
  title: string;
  date: string;
  audioUrls: string[];
  postUrl: string;
  imageUrl?: string;
}

export interface BlogSyncState {
  lastPostId: string | null;
  lastSyncTimestamp: number;
  downloadedPostIds: string[];
}

// Get sync state from localStorage
export function getBlogSyncState(): BlogSyncState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return {
    lastPostId: null,
    lastSyncTimestamp: 0,
    downloadedPostIds: [],
  };
}

// Save sync state
export function saveBlogSyncState(state: BlogSyncState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Mark post as downloaded
export function markPostAsDownloaded(postId: string): void {
  const state = getBlogSyncState();
  if (!state.downloadedPostIds.includes(postId)) {
    state.downloadedPostIds.push(postId);
    state.lastPostId = postId;
    state.lastSyncTimestamp = Date.now();
    saveBlogSyncState(state);
  }
}

// Fetch page HTML using Tauri HTTP (bypasses CORS)
async function fetchPageHtml(url: string): Promise<string> {
  try {
    const response = await tauriFetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    console.error('Fetch error:', error);
    throw new Error('לא ניתן להתחבר לאתר. נסה שוב מאוחר יותר.');
  }
}

// Extract audio URLs from HTML content
function extractAudioUrls(html: string): string[] {
  const urls: string[] = [];

  // Pattern for audio source tags
  const sourcePattern = /<source[^>]+src=["']([^"']+\.mp3[^"']*)["']/gi;
  let match;

  while ((match = sourcePattern.exec(html)) !== null) {
    const url = match[1].replace(/&amp;/g, '&');
    if (!urls.includes(url)) {
      urls.push(url);
    }
  }

  // Also check for direct audio links
  const linkPattern = /href=["'](https?:\/\/[^"']+\.mp3[^"']*)["']/gi;
  while ((match = linkPattern.exec(html)) !== null) {
    const url = match[1].replace(/&amp;/g, '&');
    if (!urls.includes(url) && url.includes('archive.org')) {
      urls.push(url);
    }
  }

  return urls;
}

// Parse blog posts from HTML
function parseBlogPosts(html: string): BlogPost[] {
  const posts: BlogPost[] = [];
  
  // Find all post sections
  const sections = html.split(/<div class=['"]post hentry['"]/).slice(1);

  for (const section of sections) {
    // Extract post ID
    const idMatch = section.match(/itemprop=['"]postId['"][\s\S]*?content=['"](\d+)['"]|<a name=['"](\d+)['"]>/i);
    const postId = idMatch ? (idMatch[1] || idMatch[2]) : '';

    // Extract title and URL
    const titleMatch = section.match(/<h3 class=['"]post-title[^>]*>[\s\S]*?<a[^>]+href=['"]([^'"]+)['"][^>]*>([^<]+)<\/a>/i);
    const postUrl = titleMatch ? titleMatch[1] : '';
    const title = titleMatch ? titleMatch[2].trim() : 'ללא כותרת';

    // Extract image
    const imageMatch = section.match(/itemprop=['"]image_url['"][\s\S]*?content=['"]([^'"]+)['"]|<img[^>]+src=['"]([^'"]+)['"][^>]*>/i);
    const imageUrl = imageMatch ? (imageMatch[1] || imageMatch[2]) : undefined;

    // Extract audio URLs
    const audioUrls = extractAudioUrls(section);

    // Extract date from archive URL or post URL
    let date = '';
    if (audioUrls.length > 0) {
      const dateMatch = audioUrls[0].match(/hadshotmusic_(\d{8})/);
      if (dateMatch) {
        date = dateMatch[1];
      }
    }
    if (!date && postUrl) {
      const urlDateMatch = postUrl.match(/\/(\d{4})\/(\d{2})\//);
      if (urlDateMatch) {
        date = `${urlDateMatch[1]}${urlDateMatch[2]}`;
      }
    }

    if (postId && audioUrls.length > 0) {
      posts.push({
        id: postId,
        title,
        date,
        audioUrls,
        postUrl,
        imageUrl,
      });
    }
  }

  return posts;
}

// Fetch latest posts from blog
export async function fetchLatestPosts(): Promise<BlogPost[]> {
  const html = await fetchPageHtml(BLOG_BASE_URL);
  return parseBlogPosts(html);
}

// Fetch posts from specific year/month
export async function fetchPostsByDate(year: number, month?: number): Promise<BlogPost[]> {
  let url = `${BLOG_BASE_URL}/${year}/`;
  if (month) {
    url += `${String(month).padStart(2, '0')}/`;
  }
  
  const html = await fetchPageHtml(url);
  return parseBlogPosts(html);
}

// Get new posts since last sync
export async function getNewPostsSinceLastSync(): Promise<BlogPost[]> {
  const state = getBlogSyncState();
  const posts = await fetchLatestPosts();

  // Filter out already downloaded posts
  const newPosts = posts.filter((post) => !state.downloadedPostIds.includes(post.id));

  return newPosts;
}

// Get sync status for display
export function getBlogSyncStatus(): {
  lastSync: string | null;
  downloadedCount: number;
} {
  const state = getBlogSyncState();

  const lastSyncDate = state.lastSyncTimestamp
    ? new Date(state.lastSyncTimestamp).toLocaleDateString('he-IL')
    : null;

  return {
    lastSync: lastSyncDate,
    downloadedCount: state.downloadedPostIds.length,
  };
}

// Format date for display (YYYYMMDD -> DD/MM/YYYY)
export function formatPostDate(dateStr: string): string {
  if (dateStr.length === 8) {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${day}/${month}/${year}`;
  }
  if (dateStr.length === 6) {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    return `${month}/${year}`;
  }
  return dateStr;
}
