/**
 * Simple updater without code signing
 * Uses GitHub Releases API directly
 */

interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
  }>;
}

export async function checkForUpdatesSimple(currentVersion: string) {
  try {
    const response = await fetch(
      'https://api.github.com/repos/userbot000/smart-player/releases/latest'
    );
    
    if (!response.ok) {
      throw new Error('Failed to check for updates');
    }
    
    const release: GitHubRelease = await response.json();
    const latestVersion = release.tag_name.replace('v', '');
    
    // Compare versions
    if (isNewerVersion(latestVersion, currentVersion)) {
      // Find the installer file
      const installer = release.assets.find(asset => 
        asset.name.includes('setup.exe') || asset.name.includes('setup.nsis')
      );
      
      return {
        available: true,
        version: latestVersion,
        downloadUrl: installer?.browser_download_url,
        releaseNotes: release.body,
      };
    }
    
    return { available: false };
  } catch (error) {
    console.error('Error checking for updates:', error);
    return { available: false, error };
  }
}

function isNewerVersion(latest: string, current: string): boolean {
  const latestParts = latest.split('.').map(Number);
  const currentParts = current.split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    if (latestParts[i] > currentParts[i]) return true;
    if (latestParts[i] < currentParts[i]) return false;
  }
  
  return false;
}

export async function downloadAndInstallSimple(downloadUrl: string) {
  try {
    // Open the download URL in browser
    const { open } = await import('@tauri-apps/plugin-opener');
    await open(downloadUrl);
    
    return { success: true };
  } catch (error) {
    console.error('Error downloading update:', error);
    return { success: false, error };
  }
}
