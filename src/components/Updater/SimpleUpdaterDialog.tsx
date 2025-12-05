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
import { checkForUpdatesSimple, downloadAndInstallSimple } from '../../utils/simpleUpdater';
import './UpdaterDialog.css';

interface SimpleUpdaterDialogProps {
    open: boolean;
    onClose: () => void;
    autoCheck?: boolean;
    currentVersion: string;
}

export function SimpleUpdaterDialog({ open, onClose, autoCheck = false, currentVersion }: SimpleUpdaterDialogProps) {
    const [checking, setChecking] = useState(false);
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [latestVersion, setLatestVersion] = useState('');
    const [releaseNotes, setReleaseNotes] = useState('');
    const [downloadUrl, setDownloadUrl] = useState('');
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
            const result = await checkForUpdatesSimple(currentVersion);

            if (result.available && result.downloadUrl) {
                setUpdateAvailable(true);
                setLatestVersion(result.version || '');
                setReleaseNotes(result.releaseNotes || 'אין פרטים זמינים');
                setDownloadUrl(result.downloadUrl);
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

    const handleDownload = async () => {
        if (!downloadUrl) return;

        try {
            await downloadAndInstallSimple(downloadUrl);
            // Show success message
            setError('');
        } catch (err) {
            console.error('Error downloading update:', err);
            setError('שגיאה בהורדת העדכון. אנא נסה שוב מאוחר יותר.');
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

                        {updateAvailable && (
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

                                <Text size={200} style={{ color: 'var(--text-secondary)' }}>
                                    💡 הלחיצה על "הורד" תפתח את דף ההורדה בדפדפן
                                </Text>
                            </div>
                        )}

                        {error && updateAvailable && (
                            <div className="updater-dialog__error">
                                <Text>{error}</Text>
                            </div>
                        )}
                    </DialogContent>
                    <DialogActions>
                        {!checking && !updateAvailable && (
                            <>
                                <Button appearance="secondary" onClick={onClose}>
                                    סגור
                                </Button>
                                <Button appearance="primary" onClick={checkForUpdates}>
                                    בדוק שוב
                                </Button>
                            </>
                        )}

                        {updateAvailable && (
                            <>
                                <Button appearance="secondary" onClick={onClose}>
                                    אחר כך
                                </Button>
                                <Button appearance="primary" onClick={handleDownload} icon={<ArrowDownload24Regular />}>
                                    הורד עדכון
                                </Button>
                            </>
                        )}
                    </DialogActions>
                </DialogBody>
            </DialogSurface>
        </Dialog>
    );
}
