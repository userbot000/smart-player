import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Button,
  Text,
  Spinner,
} from '@fluentui/react-components';
import { ArrowDownload24Regular, Checkmark24Regular } from '@fluentui/react-icons';
import { checkForUpdate, downloadUpdate } from '../../utils/githubUpdater';
import './UpdaterDialog.css';

interface GithubUpdaterDialogProps {
  open: boolean;
  onClose: () => void;
  currentVersion: string;
}

export function GithubUpdaterDialog({ open, onClose, currentVersion }: GithubUpdaterDialogProps) {
  const [checking, setChecking] = useState(false);

  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      checkUpdates();
    }
  }, [open]);

  const checkUpdates = async () => {
    setChecking(true);
    setError('');
    
    const info = await checkForUpdate(currentVersion);
    
    if (info.available) {
      setUpdateInfo(info);
    } else {
      setError('אין עדכונים זמינים');
    }
    
    setChecking(false);
  };

  const handleDownload = async () => {
    if (!updateInfo?.downloadUrl) return;
    
    try {
      await downloadUpdate(updateInfo.downloadUrl);
      onClose();
    } catch (err) {
      setError('שגיאה בפתיחת הדפדפן');
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogSurface className="updater-dialog">
        <DialogBody>
          <DialogTitle>עדכון תוכנה</DialogTitle>
          <DialogContent className="updater-dialog__content">
            
            {checking && (
              <div className="updater-dialog__checking">
                <Spinner label="בודק עדכונים..." />
              </div>
            )}

            {!checking && !updateInfo && error && (
              <div className="updater-dialog__no-update">
                <Checkmark24Regular />
                <Text>{error}</Text>
              </div>
            )}

            {updateInfo && (
              <div className="updater-dialog__available">
                <div className="updater-dialog__version-info">
                  <Text>גרסה נוכחית: {currentVersion}</Text>
                  <Text weight="semibold">גרסה חדשה: {updateInfo.version}</Text>
                </div>
                
                {updateInfo.releaseNotes && (
                  <div className="updater-dialog__release-notes">
                    <Text weight="semibold">מה חדש:</Text>
                    <div className="updater-dialog__notes-content">
                      {updateInfo.releaseNotes}
                    </div>
                  </div>
                )}
              </div>
            )}



            {error && updateInfo && (
              <Text style={{ color: 'var(--colorPaletteRedForeground1)' }}>
                {error}
              </Text>
            )}
            
          </DialogContent>
          <DialogActions>
            {!checking && (
              <>
                <Button appearance="secondary" onClick={onClose}>
                  {updateInfo ? 'אחר כך' : 'סגור'}
                </Button>
                {updateInfo && (
                  <Button 
                    appearance="primary" 
                    onClick={handleDownload}
                    icon={<ArrowDownload24Regular />}
                  >
                    הורד עדכון
                  </Button>
                )}
              </>
            )}
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
