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

// Check if network is available
export async function isNetworkAvailable(): Promise<boolean> {
  try {
    const command = Command.create('powershell', [
      '-NoProfile', '-Command',
      'Test-Connection -ComputerName 8.8.8.8 -Count 1 -Quiet'
    ]);
    const output = await command.execute();
    // Test-Connection -Quiet returns exit code 0 for success, 1 for failure
    return output.code === 0;
  } catch {
    return false;
  }
}

// Check if yt-dlp is installed (offline check only)
export async function isYtDlpInstalled(): Promise<boolean> {
  try {
    const command = Command.create('powershell', [
      '-NoProfile', '-Command',
      'Get-Command yt-dlp -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source'
    ]);
    const output = await command.execute();
    return output.code === 0 && output.stdout.trim().length > 0;
  } catch {
    return false;
  }
}

// Check if ffmpeg is installed (offline check only)
export async function isFfmpegInstalled(): Promise<boolean> {
  try {
    const command = Command.create('powershell', [
      '-NoProfile', '-Command',
      'Get-Command ffmpeg -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source'
    ]);
    const output = await command.execute();
    return output.code === 0 && output.stdout.trim().length > 0;
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
): Promise<{ ytDlp: boolean; ffmpeg: boolean; networkError?: boolean }> {
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

// Parse yt-dlp progress output
function parseYtDlpProgress(line: string): Partial<YtDownloadProgress> | null {
  // Match download progress: [download]  45.2% of 5.23MiB at 1.23MiB/s ETA 00:03
  const downloadMatch = line.match(/\[download\]\s+(\d+\.?\d*)%.*?(?:at\s+(\S+))?\s*(?:ETA\s+(\S+))?/);
  if (downloadMatch) {
    return {
      percent: parseFloat(downloadMatch[1]),
      speed: downloadMatch[2],
      eta: downloadMatch[3],
      status: 'downloading',
      message: `מוריד... ${downloadMatch[1]}%`
    };
  }

  // Match extraction/conversion
  if (line.includes('[ExtractAudio]') || line.includes('[ffmpeg]')) {
    return {
      percent: 95,
      status: 'converting',
      message: 'ממיר לאודיו...'
    };
  }

  // Match metadata/thumbnail embedding
  if (line.includes('[Metadata]') || line.includes('[EmbedThumbnail]')) {
    return {
      percent: 98,
      status: 'converting',
      message: 'מוסיף מטאדאטה...'
    };
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

    onProgress?.({ percent: 0, status: 'downloading', message: 'מתחיל הורדה...' });

    // Build yt-dlp command with progress output
    const ytDlpCmd =
      `yt-dlp "${url}" ` +
      `--no-check-certificate ` +
      `--newline ` +              // Output progress on new lines (important for parsing)
      `--extract-audio ` +
      `--audio-format mp3 ` +
      `--audio-quality 0 ` +
      `--embed-thumbnail ` +
      `--add-metadata ` +
      `-o "${outputTemplate}" ` +
      `--print after_move:filepath ` +  // Print final filepath after all processing
      `--no-playlist`;

    const command = Command.create('powershell', ['-NoProfile', '-Command', ytDlpCmd]);

    let filePath = '';
    let lastError = '';

    return new Promise((resolve) => {
      command.on('close', (data) => {
        if (data.code === 0 && filePath) {
          onProgress?.({ percent: 100, status: 'done', message: 'הושלם!' });
          resolve({
            success: true,
            filePath,
            title: filePath.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, '')
          });
        } else {
          resolve({
            success: false,
            error: lastError || 'שגיאה בהורדה'
          });
        }
      });

      command.on('error', (error) => {
        resolve({
          success: false,
          error: error || 'שגיאה בהורדה'
        });
      });

      command.stdout.on('data', (line) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // Check if this is the final filepath output
        if (trimmed.endsWith('.mp3') || trimmed.endsWith('.m4a') || trimmed.endsWith('.opus')) {
          filePath = trimmed;
          return;
        }

        // Parse progress
        const progress = parseYtDlpProgress(trimmed);
        if (progress && onProgress) {
          onProgress({
            percent: progress.percent ?? 0,
            speed: progress.speed,
            eta: progress.eta,
            status: progress.status ?? 'downloading',
            message: progress.message
          });
        }
      });

      command.stderr.on('data', (line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('WARNING')) {
          lastError = trimmed;
        }
      });

      command.spawn().catch((err) => {
        resolve({
          success: false,
          error: err instanceof Error ? err.message : 'שגיאה בהפעלת yt-dlp'
        });
      });
    });

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
