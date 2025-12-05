import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Button,
  ProgressBar,
  Text,
  Spinner,
} from '@fluentui/react-components';
import { ArrowDownload24Regular, Checkmark24Regular, Dismiss24Regular } from '@fluentui/react-icons';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import './UpdaterDialog.css';

interface UpdaterDialogProps {
  open: boolean;
  onClose: () => void;
  autoCheck?: boolean;
}

export function UpdaterDialog({ open, onClose, autoCheck = false }: UpdaterDialogProps) {
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('');
  const [latestVersion, setLatestVersion] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && autoCheck) {
      checkForUpdates();
    }
  }, [open, autoCheck]);

  const checkForUpdates = async () => {
    setChecking(true);
    setError('');
    
    try {
      const update = await check();
      
      if (update) {
        setUpdateAvailable(true);
        setCurrentVersion(update.currentVersion);
        setLatestVersion(update.version);
        setReleaseNotes(update.body || 'אין פרטים זמינים');
      } else {
        setUpdateAvailable(false);
        setError('אין עדכונים זמינים. אתה משתמש בגרסה העדכנית ביותר!');
      }
    } catch (err) {
      console.error('Error checking for updates:', err);
      setError('שגיאה בבדיקת עדכונים. אנא נסה שוב מאוחר יותר.');
    } finally {
      setChecking(false);
    }
  };

  const downloadAndInstall = async () => {
    setDownloading(true);
    setError('');
    
    try {
      const update = await check();
      
      if (!update) {
        setError('לא נמצא עדכון להורדה');
        setDownloading(false);
        return;
      }

      // Download with progress
      let totalDownloaded = 0;
      let totalSize = 0;
      
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            setDownloadProgress(0);
            totalDownloaded = 0;
            totalSize = event.data.contentLength || 0;
            break;
          case 'Progress':
            totalDownloaded += event.data.chunkLength;
            if (totalSize > 0) {
              setDownloadProgress(Math.round((totalDownloaded / totalSize) * 100));
            }
            break;
          case 'Finished':
            setDownloadProgress(100);
            break;
        }
      });

      // Relaunch the app to apply the update
      await relaunch();
    } catch (err) {
      console.error('Error downloading update:', err);
      setError('שגיאה בהורדת העדכון. אנא נסה שוב מאוחר יותר.');
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => !downloading && onClose()}>
      <DialogSurface className="updater-dialog">
        <DialogBody>
          <DialogTitle>עדכון תוכנה</DialogTitle>
          <DialogContent className="updater-dialog__content">
            {checking && (
              <div className="updater-dialog__checking">
                <Spinner size="medium" label="בודק עדכונים..." />
              </div>
            )}

            {!checking && !updateAvailable && !error && (
              <div className="updater-dialog__no-update">
                <Checkmark24Regular />
                <Text>אתה משתמש בגרסה העדכנית ביותר</Text>
              </div>
            )}

            {error && !updateAvailable && (
              <div className="updater-dialog__error">
                <Text>{error}</Text>
              </div>
            )}

            {updateAvailable && !downloading && (
              <div className="updater-dialog__available">
                <div className="updater-dialog__version-info">
                  <Text>גרסה נוכחית: {currentVersion}</Text>
                  <Text weight="semibold">גרסה חדשה: {latestVersion}</Text>
                </div>
                
                <div className="updater-dialog__release-notes">
                  <Text weight="semibold">מה חדש:</Text>
                  <div className="updater-dialog__notes-content">
                    {releaseNotes}
                  </div>
                </div>
              </div>
            )}

            {downloading && (
              <div className="updater-dialog__downloading">
                <Text>מוריד עדכון...</Text>
                <ProgressBar value={downloadProgress} max={100} />
                <Text size={200}>{downloadProgress}%</Text>
              </div>
            )}

            {error && updateAvailable && (
              <div className="updater-dialog__error">
                <Text>{error}</Text>
              </div>
            )}
          </DialogContent>
          <DialogActions>
            {!checking && !downloading && !updateAvailable && (
              <>
                <Button appearance="secondary" onClick={onClose}>
                  סגור
                </Button>
                <Button appearance="primary" onClick={checkForUpdates}>
                  בדוק שוב
                </Button>
              </>
            )}

            {updateAvailable && !downloading && (
              <>
                <Button appearance="secondary" onClick={onClose} icon={<Dismiss24Regular />}>
                  אחר כך
                </Button>
                <Button appearance="primary" onClick={downloadAndInstall} icon={<ArrowDownload24Regular />}>
                  הורד והתקן
                </Button>
              </>
            )}

            {downloading && (
              <Button appearance="secondary" disabled>
                מוריד...
              </Button>
            )}
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
