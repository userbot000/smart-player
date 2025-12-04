// YouTube Audio Downloader using yt-dlp
// Requires yt-dlp and ffmpeg to be installed

import { Command } from '@tauri-apps/plugin-shell';
import { appDataDir } from '@tauri-apps/api/path';
import { isTauriApp } from './tauriDetect';

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

// Get the bin directory path (inside app data)
async function getBinDir(): Promise<string> {
  const appData = await appDataDir();
  // Remove trailing slash/backslash if exists
  const cleanAppData = appData.replace(/[/\\]$/, '');
  return `${cleanAppData}\\bin`;
}

// Get yt-dlp executable path
async function getYtDlpPath(): Promise<string> {
  const binDir = await getBinDir();
  return `${binDir}\\yt-dlp.exe`;
}

// Get ffmpeg executable path
async function getFfmpegPath(): Promise<string> {
  const binDir = await getBinDir();
  return `${binDir}\\ffmpeg.exe`;
}

// Open bin folder in explorer (for debugging)
export async function openBinFolder(): Promise<void> {
  if (!isTauriApp()) return;

  try {
    const binDir = await getBinDir();
    const command = Command.create('powershell', [
      '-NoProfile', '-Command',
      `New-Item -ItemType Directory -Force -Path "${binDir}" | Out-Null; explorer "${binDir}"`
    ]);
    await command.execute();
  } catch (error) {
    console.error('Failed to open bin folder:', error);
  }
}

// Check if network is available
export async function isNetworkAvailable(): Promise<boolean> {
  // Check if running in Tauri
  if (!isTauriApp()) {
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

// Check if yt-dlp is installed
export async function isYtDlpInstalled(): Promise<boolean> {
  // Check if running in Tauri
  if (!isTauriApp()) {
    return false;
  }

  try {
    const ytDlpPath = await getYtDlpPath();
    const command = Command.create('powershell', [
      '-NoProfile', '-Command',
      `Test-Path "${ytDlpPath}"`
    ]);
    const output = await command.execute();
    const exists = output.code === 0 && output.stdout.trim().toLowerCase() === 'true';

    // If exists, try to get version for verification
    if (exists) {
      try {
        const versionCmd = Command.create('powershell', [
          '-NoProfile', '-Command',
          `& "${ytDlpPath}" --version`
        ]);
        const versionOutput = await versionCmd.execute();
        if (versionOutput.code === 0) {
          console.log('yt-dlp version:', versionOutput.stdout.trim());
        }
      } catch (err) {
        console.warn('Could not get yt-dlp version:', err);
      }
    }

    return exists;
  } catch {
    return false;
  }
}

// Check if ffmpeg is installed
export async function isFfmpegInstalled(): Promise<boolean> {
  // Check if running in Tauri
  if (!isTauriApp()) {
    return false;
  }

  try {
    const ffmpegPath = await getFfmpegPath();
    const command = Command.create('powershell', [
      '-NoProfile', '-Command',
      `Test-Path "${ffmpegPath}"`
    ]);
    const output = await command.execute();
    return output.code === 0 && output.stdout.trim().toLowerCase() === 'true';
  } catch {
    return false;
  }
}

// Install yt-dlp by downloading from GitHub
export async function installYtDlp(
  onProgress?: (message: string) => void
): Promise<boolean> {
  // Check if running in Tauri
  if (!isTauriApp()) {
    onProgress?.('לא ניתן להתקין - לא רץ בסביבת Tauri');
    return false;
  }

  onProgress?.('מוריד yt-dlp מ-GitHub...');

  try {
    const binDir = await getBinDir();
    const ytDlpPath = await getYtDlpPath();

    console.log('Installing yt-dlp to:', ytDlpPath);

    // Download yt-dlp.exe directly from GitHub releases to bin folder
    const downloadCmd = Command.create('powershell', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-Command',
      `$ErrorActionPreference = 'Stop'; ` +
      `$binDir = "${binDir}"; ` +
      `$ytDlpPath = "${ytDlpPath}"; ` +
      `Write-Host "יוצר תיקייה: $binDir"; ` +
      `New-Item -ItemType Directory -Force -Path $binDir | Out-Null; ` +
      `[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; ` +
      `Write-Host "מוריד yt-dlp..."; ` +
      `Invoke-WebRequest -Uri "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -OutFile $ytDlpPath -UseBasicParsing; ` +
      `if (Test-Path $ytDlpPath) { Write-Host "הקובץ נוצר בהצלחה"; Write-Output "OK" } else { throw "הקובץ לא נוצר" }`
    ]);
    const result = await downloadCmd.execute();

    console.log('yt-dlp install stdout:', result.stdout);
    console.log('yt-dlp install stderr:', result.stderr);
    console.log('yt-dlp install code:', result.code);

    if (result.code === 0 && result.stdout.includes('OK')) {
      onProgress?.('yt-dlp הותקן בהצלחה!');
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
  if (!isTauriApp()) {
    onProgress?.('לא ניתן לעדכן - לא רץ בסביבת Tauri');
    return false;
  }

  onProgress?.('מעדכן yt-dlp...');

  // Just re-download from GitHub (simpler and more reliable)
  return await installYtDlp(onProgress);
}

// Install ffmpeg by downloading from GitHub
export async function installFfmpeg(
  onProgress?: (message: string) => void
): Promise<boolean> {
  // Check if running in Tauri
  if (!isTauriApp()) {
    onProgress?.('לא ניתן להתקין - לא רץ בסביבת Tauri');
    return false;
  }

  onProgress?.('מוריד ffmpeg...');

  try {
    const binDir = await getBinDir();
    const ffmpegPath = await getFfmpegPath();

    console.log('Installing ffmpeg to:', ffmpegPath);

    // Download ffmpeg essentials build
    const downloadCmd = Command.create('powershell', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-Command',
      `$ErrorActionPreference = 'Stop'; ` +
      `$binDir = "${binDir}"; ` +
      `$ffmpegPath = "${ffmpegPath}"; ` +
      `Write-Host "יוצר תיקייה: $binDir"; ` +
      `New-Item -ItemType Directory -Force -Path $binDir | Out-Null; ` +
      `$zip = "$env:TEMP\\ffmpeg.zip"; ` +
      `[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; ` +
      `Write-Host "מוריד ffmpeg (זה עשוי לקחת זמן)..."; ` +
      `Invoke-WebRequest -Uri "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip" -OutFile $zip -UseBasicParsing; ` +
      `Write-Host "מחלץ קבצים..."; ` +
      `Expand-Archive -Path $zip -DestinationPath $env:TEMP -Force; ` +
      `$ffmpegExe = Get-ChildItem "$env:TEMP\\ffmpeg-*-essentials_build\\bin\\ffmpeg.exe" | Select-Object -First 1; ` +
      `if ($ffmpegExe) { ` +
      `  Write-Host "מעתיק ffmpeg.exe..."; ` +
      `  Copy-Item $ffmpegExe.FullName -Destination $ffmpegPath -Force; ` +
      `  Write-Host "מנקה קבצים זמניים..."; ` +
      `  Remove-Item $zip -Force -ErrorAction SilentlyContinue; ` +
      `  Get-ChildItem "$env:TEMP\\ffmpeg-*-essentials_build" -Recurse | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue; ` +
      `  if (Test-Path $ffmpegPath) { Write-Host "הקובץ נוצר בהצלחה"; Write-Output "OK" } else { throw "הקובץ לא נוצר" } ` +
      `} else { throw "לא נמצא ffmpeg.exe בארכיון" }`
    ]);
    const result = await downloadCmd.execute();

    console.log('ffmpeg install stdout:', result.stdout);
    console.log('ffmpeg install stderr:', result.stderr);
    console.log('ffmpeg install code:', result.code);

    if (result.code === 0 && result.stdout.includes('OK')) {
      onProgress?.('ffmpeg הותקן בהצלחה!');
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

  // Log paths for debugging
  const binDir = await getBinDir();
  const ytDlpPath = await getYtDlpPath();
  const ffmpegPath = await getFfmpegPath();
  console.log('Bin directory:', binDir);
  console.log('yt-dlp path:', ytDlpPath);
  console.log('ffmpeg path:', ffmpegPath);

  let ytDlp = await isYtDlpInstalled();
  let ffmpeg = await isFfmpegInstalled();

  console.log('yt-dlp installed:', ytDlp);
  console.log('ffmpeg installed:', ffmpeg);

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
  if (!isTauriApp()) {
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
      error: 'yt-dlp לא מותקן. לחץ על "עדכן" כדי להתקין.'
    };
  }

  if (!deps.ffmpeg) {
    return {
      success: false,
      error: 'ffmpeg לא מותקן. לחץ על "עדכן" כדי להתקין.'
    };
  }

  try {
    // Get paths
    const ytDlpPath = await getYtDlpPath();
    const ffmpegPath = await getFfmpegPath();
    const outputDir = await appDataDir();

    // Verify files exist
    const ytDlpExists = await isYtDlpInstalled();
    const ffmpegExists = await isFfmpegInstalled();

    console.log('yt-dlp exists:', ytDlpExists);
    console.log('ffmpeg exists:', ffmpegExists);

    if (!ytDlpExists) {
      return {
        success: false,
        error: `yt-dlp לא נמצא בנתיב: ${ytDlpPath}`
      };
    }

    if (!ffmpegExists) {
      return {
        success: false,
        error: `ffmpeg לא נמצא בנתיב: ${ffmpegPath}`
      };
    }

    // Ensure directory ends with separator
    const outputDirFixed = outputDir.endsWith('\\') || outputDir.endsWith('/')
      ? outputDir
      : outputDir + '\\';
    const outputTemplate = `${outputDirFixed}%(title)s.%(ext)s`;

    onProgress?.({ percent: 0, status: 'downloading', message: 'מתחיל הורדה...' });

    // Build yt-dlp command with progress output
    onProgress?.({ percent: 5, status: 'downloading', message: 'מפעיל yt-dlp...' });

    // Log paths for debugging
    console.log('yt-dlp path:', ytDlpPath);
    console.log('ffmpeg path:', ffmpegPath);
    console.log('Output template:', outputTemplate);

    // Run yt-dlp directly with full paths - no PATH manipulation needed
    // Note: --ffmpeg-location expects the directory containing ffmpeg.exe, not the full path
    const binDir = await getBinDir();

    console.log('Executing yt-dlp with:');
    console.log('  yt-dlp:', ytDlpPath);
    console.log('  ffmpeg dir:', binDir);
    console.log('  URL:', url);
    console.log('  Output:', outputTemplate);

    // Run yt-dlp.exe directly - no PowerShell wrapper!
    const command = Command.create(ytDlpPath, [
      url,
      '--ffmpeg-location', binDir,
      '--no-check-certificate',
      '--newline',
      '--extract-audio',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '--embed-thumbnail',
      '--add-metadata',
      '-o', outputTemplate,
      '--print', 'after_move:filepath',
      '--no-playlist'
    ]);

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

        console.log('[yt-dlp stdout]:', trimmed);

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
        console.log('[yt-dlp stderr]:', trimmed);

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
  if (!isTauriApp()) {
    return { error: 'זמין רק בגרסת Tauri' };
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return { error: 'כתובת YouTube לא תקינה' };
  }

  try {
    const ytDlpPath = await getYtDlpPath();
    const command = Command.create('powershell', [
      '-NoProfile', '-Command',
      `& "${ytDlpPath}" "${url}" --no-check-certificate --dump-json --no-download`
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



