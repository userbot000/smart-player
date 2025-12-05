/**
 * Simple GitHub-based updater
 * No signing, no complexity - just works!
 */

interface UpdateInfo {
  available: boolean;
  version?: string;
  downloadUrl?: string;
  releaseNotes?: string;
}

const REPO_OWNER = 'userbot000';
const REPO_NAME = 'smart-player';

export async function checkForUpdate(currentVersion: string): Promise<UpdateInfo> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`
    );
    
    if (!response.ok) {
      return { available: false };
    }
    
    const release = await response.json();
    const latestVersion = release.tag_name.replace('v', '');
    
    // Compare versions
    if (!isNewer(latestVersion, currentVersion)) {
      return { available: false };
    }
    
    // Find installer
    const installer = release.assets.find((asset: any) => 
      asset.name.endsWith('.exe') && asset.name.includes('setup')
    );
    
    if (!installer) {
      return { available: false };
    }
    
    return {
      available: true,
      version: latestVersion,
      downloadUrl: installer.browser_download_url,
      releaseNotes: release.body || 'אין פרטים',
    };
  } catch (error) {
    console.error('Update check failed:', error);
    return { available: false };
  }
}

export async function downloadAndInstall(downloadUrl: string): Promise<void> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    
    // Download file
    const response = await fetch(downloadUrl);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Save to temp
    const tempPath = await invoke<string>('plugin:shell|execute', {
      program: 'cmd',
      args: ['/c', 'echo', '%TEMP%\\smart-player-update.exe']
    });
    
    await invoke('write_file', {
      path: tempPath.trim(),
      data: Array.from(bytes)
    });
    
    // Run installer
    await invoke('plugin:shell|execute', {
      program: tempPath.trim(),
      args: ['/SILENT']
    });
    
    // Exit current app
    const { exit } = await import('@tauri-apps/plugin-process');
    await exit(0);
  } catch (error) {
    console.error('Install failed:', error);
    throw error;
  }
}

function isNewer(latest: string, current: string): boolean {
  const l = latest.split('.').map(Number);
  const c = current.split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    if (l[i] > c[i]) return true;
    if (l[i] < c[i]) return false;
  }
  
  return false;
}
