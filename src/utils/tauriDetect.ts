// Reliable Tauri detection - try to actually use the API
let _isTauri: boolean | null = null;

export function isTauriApp(): boolean {
  if (_isTauri !== null) {
    return _isTauri;
  }

  if (typeof window === 'undefined') {
    _isTauri = false;
    return false;
  }

  // The ONLY reliable way: check if @tauri-apps/api actually works
  // In Tauri, window.__TAURI__ is ALWAYS defined
  // In browser, it's undefined
  try {
    const w = window as any;
    
    // Tauri v2 always has __TAURI__ object with invoke function
    if (w.__TAURI__ && typeof w.__TAURI__.invoke === 'function') {
      _isTauri = true;
      console.log('[Tauri Detection] ✓ Detected via __TAURI__.invoke');
      return true;
    }
    
    // Fallback: check for any Tauri-specific globals
    if (w.__TAURI_INTERNALS__ || w.__TAURI_METADATA__ || w.__TAURI_IPC__) {
      _isTauri = true;
      console.log('[Tauri Detection] ✓ Detected via internals');
      return true;
    }
    
    // Last resort: check if we're in Electron or NW.js (not Tauri)
    if (w.process?.type || w.nw) {
      _isTauri = false;
      console.log('[Tauri Detection] ✗ Detected Electron/NW.js');
      return false;
    }
    
    // If none of the above, we're in a browser
    _isTauri = false;
    console.log('[Tauri Detection] ✗ Browser environment');
    return false;
    
  } catch (error) {
    console.error('[Tauri Detection] Error:', error);
    _isTauri = false;
    return false;
  }
}
