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
  // Check if running in Tauri
  if (typeof window === 'undefined' || !(window as any).__TAURI__) {
    return false;
  }

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
  // Check if running in Tauri
  if (typeof window === 'undefined' || !(window as any).__TAURI__) {
    return false;
  }

  try {
    // Check both in PATH and in local installation directory
    const command = Command.create('powershell', [
      '-NoProfile', '-Command',
      `if (Test-Path "$env:LOCALAPPDATA\\yt-dlp\\yt-dlp.exe") { Write-Output "Found" } ` +
      `elseif (Get-Command yt-dlp -ErrorAction SilentlyContinue) { Write-Output "Found" } ` +
      `else { exit 1 }`
    ]);
    const output = await command.execute();
    return output.code === 0 && output.stdout.includes('Found');
  } catch {
    return false;
  }
}

// Check if ffmpeg is installed (offline check only)
export async function isFfmpegInstalled(): Promise<boolean> {
  // Check if running in Tauri
  if (typeof window === 'undefined' || !(window as any).__TAURI__) {
    return false;
  }

  try {
    // Check both in PATH and in local installation directory
    const command = Command.create('powershell', [
      '-NoProfile', '-Command',
      `if (Test-Path "$env:LOCALAPPDATA\\ffmpeg\\ffmpeg.exe") { Write-Output "Found" } ` +
      `elseif (Get-Command ffmpeg -ErrorAction SilentlyContinue) { Write-Output "Found" } ` +
      `else { exit 1 }`
    ]);
    const output = await command.execute();
    return output.code === 0 && output.stdout.includes('Found');
  } catch {
    return false;
  }
}

// Install yt-dlp by downloading from GitHub
export async function installYtDlp(
  onProgress?: (message: string) => void
): Promise<boolean> {
  // Check if running in Tauri
  if (typeof window === 'undefined' || !(window as any).__TAURI__) {
    onProgress?.('לא ניתן להתקין - לא רץ בסביבת Tauri');
    return false;
  }

  onProgress?.('מוריד yt-dlp מ-GitHub...');

  try {
    // Download yt-dlp.exe directly from GitHub releases to user's local bin folder
    const downloadCmd = Command.create('powershell', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-Command',
      `$ErrorActionPreference = 'Stop'; ` +
      `$dest = "$env:LOCALAPPDATA\\yt-dlp"; ` +
      `New-Item -ItemType Directory -Force -Path $dest | Out-Null; ` +
      `[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; ` +
      `Invoke-WebRequest -Uri "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -OutFile "$dest\\yt-dlp.exe" -UseBasicParsing; ` +
      `$path = [Environment]::GetEnvironmentVariable("PATH", "User"); ` +
      `if ($path -notlike "*$dest*") { [Environment]::SetEnvironmentVariable("PATH", "$path;$dest", "User") }; ` +
      `Write-Output "OK"`
    ]);
    const result = await downloadCmd.execute();

    console.log('yt-dlp install result:', result);

    if (result.code === 0 && result.stdout.includes('OK')) {
      onProgress?.('yt-dlp הותקן בהצלחה! הפעל מחדש את האפליקציה.');
      return true;
    } else {
      console.error('yt-dlp install failed:', result.stderr);
      onProgress?.(`שגיאה בהתקנה: ${result.stderr || 'לא ידוע'}`);
    }
  } catch (error) {
    console.error('yt-dlp install exception:', error);
    onProgress?.(`שגיאה: ${error instanceof Error ? error.message : 'לא ידוע'}`);
  }

  onProgress?.('לא ניתן להוריד yt-dlp. הורד ידנית מ: github.com/yt-dlp/yt-dlp/releases');
  return false;
}

// Update yt-dlp to latest version
export async function updateYtDlp(
  onProgress?: (message: string) => void
): Promise<boolean> {
  // Check if running in Tauri
  if (typeof window === 'undefined' || !(window as any).__TAURI__) {
    onProgress?.('לא ניתן לעדכן - לא רץ בסביבת Tauri');
    return false;
  }

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
  // Check if running in Tauri
  if (typeof window === 'undefined' || !(window as any).__TAURI__) {
    onProgress?.('לא ניתן להתקין - לא רץ בסביבת Tauri');
    return false;
  }

  onProgress?.('מוריד ffmpeg...');

  try {
    // Download ffmpeg essentials build
    const downloadCmd = Command.create('powershell', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-Command',
      `$ErrorActionPreference = 'Stop'; ` +
      `$dest = "$env:LOCALAPPDATA\\ffmpeg"; ` +
      `New-Item -ItemType Directory -Force -Path $dest | Out-Null; ` +
      `$zip = "$env:TEMP\\ffmpeg.zip"; ` +
      `[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; ` +
      `Invoke-WebRequest -Uri "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip" -OutFile $zip -UseBasicParsing; ` +
      `Expand-Archive -Path $zip -DestinationPath $env:TEMP -Force; ` +
      `Get-ChildItem "$env:TEMP\\ffmpeg-*-essentials_build\\bin\\*.exe" | Copy-Item -Destination $dest -Force; ` +
      `$path = [Environment]::GetEnvironmentVariable("PATH", "User"); ` +
      `if ($path -notlike "*$dest*") { [Environment]::SetEnvironmentVariable("PATH", "$path;$dest", "User") }; ` +
      `Remove-Item $zip -Force -ErrorAction SilentlyContinue; ` +
      `Write-Output "OK"`
    ]);
    const result = await downloadCmd.execute();

    console.log('ffmpeg install result:', result);

    if (result.code === 0 && result.stdout.includes('OK')) {
      onProgress?.('ffmpeg הותקן בהצלחה! הפעל מחדש את האפליקציה.');
      return true;
    } else {
      console.error('ffmpeg install failed:', result.stderr);
      onProgress?.(`שגיאה בהתקנה: ${result.stderr || 'לא ידוע'}`);
    }
  } catch (error) {
    console.error('ffmpeg install exception:', error);
    onProgress?.(`שגיאה: ${error instanceof Error ? error.message : 'לא ידוע'}`);
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
  // Check if running in Tauri
  if (typeof window === 'undefined' || !(window as any).__TAURI__) {
    return {
      success: false,
      error: 'הורדה מיוטיוב זמינה רק בגרסת Tauri של האפליקציה'
    };
  }

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
    // Ensure directory ends with separator
    const outputDirFixed = outputDir.endsWith('\\') || outputDir.endsWith('/')
      ? outputDir
      : outputDir + '\\';
    const outputTemplate = `${outputDirFixed}%(title)s.%(ext)s`;

    onProgress?.({ percent: 0, status: 'downloading', message: 'מתחיל הורדה...' });

    // Build yt-dlp command with progress output
    // Use full path to yt-dlp in case PATH wasn't updated yet
    const ytDlpPath = `$env:LOCALAPPDATA\\yt-dlp\\yt-dlp.exe`;
    const ytDlpCmd =
      `if (Test-Path "${ytDlpPath}") { & "${ytDlpPath}" } else { yt-dlp } ` +
      `"${url}" ` +
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
        // Look for lines that contain a full path with audio extension
        if ((trimmed.includes('.mp3') || trimmed.includes('.m4a') || trimmed.includes('.opus')) &&
          (trimmed.includes('\\') || trimmed.includes('/')) &&
          !trimmed.startsWith('[')) {
          filePath = trimmed;
          console.log('Downloaded file path:', filePath);
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
  // Check if running in Tauri
  if (typeof window === 'undefined' || !(window as any).__TAURI__) {
    return { error: 'זמין רק בגרסת Tauri' };
  }

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

