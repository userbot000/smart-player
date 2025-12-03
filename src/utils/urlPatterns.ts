// URL Pattern Detection and Smart Download Utilities

export interface UrlPattern {
  id: string;
  name: string;
  nameHe: string;
  icon: string;
  pattern: RegExp;
  extractInfo: (url: string) => UrlInfo | null;
  generateDownloadUrls?: (url: string) => Promise<string[]>;
}

export interface UrlInfo {
  type: string;
  title?: string;
  identifier?: string;
  isPlaylist?: boolean;
  itemCount?: number;
}

export interface DetectedUrl {
  pattern: UrlPattern;
  info: UrlInfo;
  originalUrl: string;
}

// Archive.org pattern
const archiveOrgPattern: UrlPattern = {
  id: 'archive-org',
  name: 'Archive.org',
  nameHe: 'ארכיון אינטרנט',
  icon: '📚',
  pattern: /archive\.org\/(details|download)\/([^\/\?]+)/i,
  extractInfo: (url: string): UrlInfo | null => {
    const match = url.match(/archive\.org\/(details|download)\/([^\/\?]+)/i);
    if (!match) return null;
    
    const identifier = match[2];
    return {
      type: 'archive-org',
      identifier,
      title: identifier.replace(/_/g, ' '),
      isPlaylist: true, // Archive items usually have multiple files
    };
  },
};

// Direct audio file pattern
const directAudioPattern: UrlPattern = {
  id: 'direct-audio',
  name: 'Direct Audio',
  nameHe: 'קובץ ישיר',
  icon: '🎵',
  pattern: /\.(mp3|wav|flac|ogg|m4a|aac|wma|opus)(\?|$)/i,
  extractInfo: (url: string): UrlInfo | null => {
    const match = url.match(/\/([^\/]+)\.(mp3|wav|flac|ogg|m4a|aac|wma|opus)(\?|$)/i);
    if (!match) return null;
    
    return {
      type: 'direct-audio',
      title: decodeURIComponent(match[1]),
      isPlaylist: false,
    };
  },
};

// Numbered sequence pattern (e.g., song_01.mp3, song_02.mp3)
const numberedSequencePattern: UrlPattern = {
  id: 'numbered-sequence',
  name: 'Numbered Sequence',
  nameHe: 'רצף ממוספר',
  icon: '🔢',
  pattern: /(\d{1,3})\.(mp3|wav|flac|ogg|m4a)/i,
  extractInfo: (url: string): UrlInfo | null => {
    const match = url.match(/(.+?)(\d{1,3})\.(mp3|wav|flac|ogg|m4a)/i);
    if (!match) return null;
    
    return {
      type: 'numbered-sequence',
      title: 'רצף ממוספר',
      identifier: match[1], // Base URL without number
      isPlaylist: true,
    };
  },
};

// All supported patterns
export const urlPatterns: UrlPattern[] = [
  archiveOrgPattern,
  numberedSequencePattern,
  directAudioPattern,
];

// Detect URL pattern
export function detectUrlPattern(url: string): DetectedUrl | null {
  for (const pattern of urlPatterns) {
    if (pattern.pattern.test(url)) {
      const info = pattern.extractInfo(url);
      if (info) {
        return { pattern, info, originalUrl: url };
      }
    }
  }
  return null;
}

// Generate numbered sequence URLs
export function generateSequenceUrls(
  baseUrl: string,
  start: number,
  end: number,
  padding: number = 2
): string[] {
  const urls: string[] = [];
  
  // Find where to insert the number
  const match = baseUrl.match(/(.+?)(\d+)(\.[a-zA-Z0-9]+)$/);
  if (!match) return [baseUrl];
  
  const prefix = match[1];
  const extension = match[3];
  
  for (let i = start; i <= end; i++) {
    const num = String(i).padStart(padding, '0');
    urls.push(`${prefix}${num}${extension}`);
  }
  
  return urls;
}

// Parse range string (e.g., "1-10" or "1,3,5,7-10")
export function parseRange(rangeStr: string): number[] {
  const numbers: number[] = [];
  const parts = rangeStr.split(',').map(s => s.trim());
  
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(n => parseInt(n.trim(), 10));
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) {
          numbers.push(i);
        }
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num)) {
        numbers.push(num);
      }
    }
  }
  
  return [...new Set(numbers)].sort((a, b) => a - b);
}

// Generate URLs from template with range
export function generateUrlsFromTemplate(
  template: string,
  range: string
): string[] {
  const numbers = parseRange(range);
  const urls: string[] = [];
  
  // Find placeholder pattern like {n}, {nn}, {nnn} or just a number
  const placeholderMatch = template.match(/\{(n+)\}/);
  
  if (placeholderMatch) {
    const padding = placeholderMatch[1].length;
    for (const num of numbers) {
      const paddedNum = String(num).padStart(padding, '0');
      urls.push(template.replace(/\{n+\}/, paddedNum));
    }
  } else {
    // Try to find existing number in URL and replace it
    const numMatch = template.match(/(\d+)(\.[a-zA-Z0-9]+)$/);
    if (numMatch) {
      const padding = numMatch[1].length;
      const prefix = template.slice(0, -numMatch[0].length);
      const extension = numMatch[2];
      
      for (const num of numbers) {
        const paddedNum = String(num).padStart(padding, '0');
        urls.push(`${prefix}${paddedNum}${extension}`);
      }
    }
  }
  
  return urls;
}

// Common URL templates for quick access
export interface UrlTemplate {
  id: string;
  name: string;
  nameHe: string;
  description: string;
  template: string;
  defaultRange: string;
  icon: string;
}

export const commonTemplates: UrlTemplate[] = [
  {
    id: 'archive-hadshotmusic',
    name: 'Hadshot Music',
    nameHe: 'חדשות מוזיקה',
    description: 'הורדה מארכיון חדשות מוזיקה',
    template: 'https://archive.org/download/hadshotmusic_{date}_{time}/track{nn}.mp3',
    defaultRange: '1-20',
    icon: '📻',
  },
  {
    id: 'custom-sequence',
    name: 'Custom Sequence',
    nameHe: 'רצף מותאם',
    description: 'הורדת רצף קבצים ממוספרים',
    template: '',
    defaultRange: '1-10',
    icon: '🔢',
  },
];
