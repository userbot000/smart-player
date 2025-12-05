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

export async function downloadUpdate(downloadUrl: string): Promise<void> {
  // Simply open the download URL in the default browser
  // User will download and install manually
  window.open(downloadUrl, '_blank');
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
