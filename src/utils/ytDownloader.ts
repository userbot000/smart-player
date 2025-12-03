// YouTube Audio Downloader using yt-dlp
// Requires yt-dlp and ffmpeg to be installed

import { Command } from '@tauri-apps/plugin-shell';
import { appDataDir } from '@tauri-apps/api/path';

export interface YtDownloadProgress {
  percent: number;
  speed?: string;
  eta?: string;
  status: 'checking' | 'downloading' | 'converting' | 'done' | 'error';
  message?: string;
}

export interface YtDownloadResult {
  success: boolean;
  filePath?: string;
  title?: string;
  error?: string;
}

// Check if yt-dlp is installed
export async function isYtDlpInstalled(): Promise<boolean> {
  try {
    const command = Command.create('powershell', [
      '-NoProfile', '-Command',
      'yt-dlp --version'
    ]);
    const output = await command.execute();
    return output.code === 0;
  } catch {
    return false;
  }
}

// Check if ffmpeg is installed
export async function isFfmpegInstalled(): Promise<boolean> {
  try {
    const command = Command.create('powershell', [
      '-NoProfile', '-Command',
      'ffmpeg -version'
    ]);
    const output = await command.execute();
    return output.code === 0;
  } catch {
    return false;
  }
}

// Install yt-dlp by downloading from GitHub
export async function installYtDlp(
  onProgress?: (message: string) => void
): Promise<boolean> {
  onProgress?.('מוריד yt-dlp מ-GitHub...');
  
  try {
    // Download yt-dlp.exe directly from GitHub releases to user's local bin folder
    const downloadCmd = Command.create('powershell', [
      '-NoProfile', '-Command',
      `$dest = "$env:LOCALAPPDATA\\yt-dlp"; ` +
      `New-Item -ItemType Directory -Force -Path $dest | Out-Null; ` +
      `Invoke-WebRequest -Uri "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -OutFile "$dest\\yt-dlp.exe"; ` +
      `$path = [Environment]::GetEnvironmentVariable("PATH", "User"); ` +
      `if ($path -notlike "*$dest*") { [Environment]::SetEnvironmentVariable("PATH", "$path;$dest", "User") }; ` +
      `Write-Output "OK"`
    ]);
    const result = await downloadCmd.execute();
    if (result.code === 0 && result.stdout.includes('OK')) {
      onProgress?.('yt-dlp הותקן בהצלחה! הפעל מחדש את האפליקציה.');
      return true;
    }
  } catch {
    // Download failed
  }

  onProgress?.('לא ניתן להוריד yt-dlp. הורד ידנית מ: github.com/yt-dlp/yt-dlp/releases');
  return false;
}

// Update yt-dlp to latest version
export async function updateYtDlp(
  onProgress?: (message: string) => void
): Promise<boolean> {
  onProgress?.('מעדכן yt-dlp...');
  
  try {
    // Try yt-dlp self-update first
    const selfUpdate = Command.create('powershell', [
      '-NoProfile', '-Command',
      'yt-dlp -U'
    ]);
    const result = await selfUpdate.execute();
    if (result.code === 0) {
      onProgress?.('yt-dlp עודכן בהצלחה');
      return true;
    }
  } catch {
    // Self-update failed, try re-download
  }

  // Fallback: re-download from GitHub
  onProgress?.('מוריד גרסה חדשה...');
  return await installYtDlp(onProgress);
}

// Install ffmpeg by downloading from GitHub
export async function installFfmpeg(
  onProgress?: (message: string) => void
): Promise<boolean> {
  onProgress?.('מוריד ffmpeg...');
  
  try {
    // Download ffmpeg essentials build
    const downloadCmd = Command.create('powershell', [
      '-NoProfile', '-Command',
      `$dest = "$env:LOCALAPPDATA\\ffmpeg"; ` +
      `New-Item -ItemType Directory -Force -Path $dest | Out-Null; ` +
      `$zip = "$env:TEMP\\ffmpeg.zip"; ` +
      `Invoke-WebRequest -Uri "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip" -OutFile $zip; ` +
      `Expand-Archive -Path $zip -DestinationPath $env:TEMP -Force; ` +
      `Get-ChildItem "$env:TEMP\\ffmpeg-*-essentials_build\\bin\\*.exe" | Copy-Item -Destination $dest; ` +
      `$path = [Environment]::GetEnvironmentVariable("PATH", "User"); ` +
      `if ($path -notlike "*$dest*") { [Environment]::SetEnvironmentVariable("PATH", "$path;$dest", "User") }; ` +
      `Remove-Item $zip -Force; ` +
      `Write-Output "OK"`
    ]);
    const result = await downloadCmd.execute();
    if (result.code === 0 && result.stdout.includes('OK')) {
      onProgress?.('ffmpeg הותקן בהצלחה! הפעל מחדש את האפליקציה.');
      return true;
    }
  } catch {
    // Download failed
  }

  onProgress?.('לא ניתן להוריד ffmpeg. הורד ידנית מ: ffmpeg.org/download.html');
  return false;
}

// Check and install dependencies
export async function ensureDependencies(
  onProgress?: (message: string) => void
): Promise<{ ytDlp: boolean; ffmpeg: boolean }> {
  onProgress?.('בודק תלויות...');
  
  let ytDlp = await isYtDlpInstalled();
  let ffmpeg = await isFfmpegInstalled();

  if (!ytDlp) {
    onProgress?.('yt-dlp לא מותקן, מתקין...');
    ytDlp = await installYtDlp(onProgress);
  } else {
    onProgress?.('yt-dlp מותקן ✓');
  }

  if (!ffmpeg) {
    onProgress?.('ffmpeg לא מותקן, מתקין...');
    ffmpeg = await installFfmpeg(onProgress);
  } else {
    onProgress?.('ffmpeg מותקן ✓');
  }

  return { ytDlp, ffmpeg };
}

// Extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Download audio from YouTube
export async function downloadYouTubeAudio(
  url: string,
  onProgress?: (progress: YtDownloadProgress) => void
): Promise<YtDownloadResult> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    return { success: false, error: 'כתובת YouTube לא תקינה' };
  }

  onProgress?.({ percent: 0, status: 'checking', message: 'בודק תלויות...' });

  // Check dependencies
  const deps = await ensureDependencies((msg) => {
    onProgress?.({ percent: 0, status: 'checking', message: msg });
  });

  if (!deps.ytDlp) {
    return { 
      success: false, 
      error: 'yt-dlp לא מותקן. התקן ידנית: winget install yt-dlp.yt-dlp' 
    };
  }

  try {
    // Get output directory
    const outputDir = await appDataDir();
    const outputTemplate = `${outputDir}%(title)s.%(ext)s`;

    onProgress?.({ percent: 0, status: 'downloading', message: 'מוריד...' });

    // Build yt-dlp command
    const args = [
      '-NoProfile', '-Command',
      `yt-dlp "${url}" ` +
      `--no-check-certificate ` +  // Skip SSL verification
      `--extract-audio ` +          // Extract audio only
      `--audio-format mp3 ` +       // Convert to MP3
      `--audio-quality 0 ` +        // Best quality
      `--embed-thumbnail ` +        // Embed thumbnail as cover
      `--add-metadata ` +           // Add metadata
      `-o "${outputTemplate}" ` +   // Output template
      `--print filename ` +         // Print output filename
      `--no-playlist`               // Don't download playlists
    ];

    const command = Command.create('powershell', args);
    const output = await command.execute();

    if (output.code !== 0) {
      const errorMsg = output.stderr || 'שגיאה לא ידועה';
      return { success: false, error: errorMsg };
    }

    // Parse output to get filename
    const lines = output.stdout.trim().split('\n');
    const filePath = lines[lines.length - 1]?.trim();

    onProgress?.({ percent: 100, status: 'done', message: 'הושלם!' });

    return {
      success: true,
      filePath,
      title: filePath?.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, '')
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'שגיאה בהורדה'
    };
  }
}

// Get video info without downloading
export async function getYouTubeInfo(url: string): Promise<{
  title?: string;
  duration?: number;
  thumbnail?: string;
  error?: string;
}> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    return { error: 'כתובת YouTube לא תקינה' };
  }

  try {
    const command = Command.create('powershell', [
      '-NoProfile', '-Command',
      `yt-dlp "${url}" --no-check-certificate --dump-json --no-download`
    ]);
    
    const output = await command.execute();
    
    if (output.code !== 0) {
      return { error: output.stderr || 'לא ניתן לקבל מידע' };
    }

    const info = JSON.parse(output.stdout);
    return {
      title: info.title,
      duration: info.duration,
      thumbnail: info.thumbnail
    };
  } catch {
    return { error: 'שגיאה בקבלת מידע' };
  }
}
