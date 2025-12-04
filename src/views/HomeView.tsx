import { useState } from 'react';
import { Button, Spinner } from '@fluentui/react-components';
import { MusicNote224Regular, MusicNote124Regular } from '@fluentui/react-icons';
import { Song } from '../types';
import { SongList, AddSongsButton } from '../components';
import { useToast } from '../components/Toast/ToastProvider';
import { isTauriApp } from '../utils/tauriDetect';

interface HomeViewProps {
  recentSongs: Song[];
  totalSongs: number;
  onSongsAdded: () => void;
  onOpenRingtone?: (song: Song) => void;
  onOpenMetadata?: (song: Song) => void;
}

export function HomeView({ recentSongs, totalSongs, onSongsAdded, onOpenRingtone, onOpenMetadata }: HomeViewProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const { showSuccess, showWarning, showError } = useToast();

  const handleImportMusicFolder = async () => {
    if (!isTauriApp()) {
      showWarning('ייבוא אוטומטי זמין רק באפליקציה');
      return;
    }

    setIsImporting(true);
    
    try {
      const { audioDir } = await import('@tauri-apps/api/path');
      const { invoke } = await import('@tauri-apps/api/core');
      const { listen } = await import('@tauri-apps/api/event');
      const { addSongsBulk } = await import('../db/database');
      const { addWatchedFolder, getWatchedFolderByName, getSongFileNamesInFolder, updateFolderSongCount, updateFolderScanTime, countSongsInFolder } = await import('../db/watchedFolders');
      const { extractMetadataFromBuffer } = await import('../utils/audioMetadata');
      
      // Get user's Music folder
      const musicPath = await audioDir();
      const folderName = 'Music';
      
      // Listen for scan progress
      const unlisten = await listen('scan-progress', (event: any) => {
        const data = event.payload;
        if (data.phase === 'counting') {
          setImportProgress({ current: 0, total: data.total });
        } else if (data.phase === 'scanning') {
          setImportProgress({ current: data.processed, total: data.total });
        }
      });

      interface AudioFileFromRust {
        name: string;
        path: string;
        data: number[];
      }

      const files: AudioFileFromRust[] = await invoke('scan_folder', { folderPath: musicPath });
      unlisten();

      if (files.length === 0) {
        showWarning('לא נמצאו קבצי אודיו בתיקיית המוזיקה');
        setIsImporting(false);
        return;
      }

      // Check if folder already exists
      const existingFolder = await getWatchedFolderByName(folderName);
      let currentFolderId: string;
      let existingFileNames = new Set<string>();

      if (existingFolder) {
        currentFolderId = existingFolder.id;
        existingFileNames = await getSongFileNamesInFolder(existingFolder.id);
      } else {
        currentFolderId = crypto.randomUUID();
        await addWatchedFolder({
          id: currentFolderId,
          path: musicPath,
          name: folderName,
          addedAt: Date.now(),
          lastScanned: Date.now(),
          songCount: 0,
        });
      }

      const newFiles = files.filter(f => !existingFileNames.has(f.name));
      
      if (newFiles.length === 0) {
        showSuccess(`כל ${files.length} השירים כבר קיימים בספרייה`, 'הכל מעודכן');
        setIsImporting(false);
        return;
      }

      setImportProgress({ current: 0, total: newFiles.length });

      const songs: Song[] = [];
      const BATCH_SIZE = 10;

      for (let i = 0; i < newFiles.length; i += BATCH_SIZE) {
        const batch = newFiles.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(batch.map(async (file) => {
          try {
            const metadataBuffer = new Uint8Array(file.data).buffer;
            const metadata = await extractMetadataFromBuffer(metadataBuffer, file.name);
            
            const relativePath = file.path.replace(musicPath, '').replace(/^[/\\]/, '');
            const subFolder = relativePath.includes('/') || relativePath.includes('\\')
              ? relativePath.substring(0, relativePath.lastIndexOf(relativePath.includes('/') ? '/' : '\\'))
              : undefined;

            return {
              id: crypto.randomUUID(),
              title: metadata.title,
              artist: metadata.artist,
              album: metadata.album,
              duration: metadata.duration,
              genre: metadata.genre,
              coverUrl: metadata.coverUrl,
              filePath: '',
              originalPath: file.path,
              subFolder,
              addedAt: Date.now(),
              playCount: 0,
              folderId: currentFolderId,
              fileName: file.name,
            } as Song;
          } catch {
            return null;
          }
        }));
        
        songs.push(...batchResults.filter((s): s is Song => s !== null));
        setImportProgress({ current: Math.min(i + BATCH_SIZE, newFiles.length), total: newFiles.length });
      }

      if (songs.length > 0) {
        await addSongsBulk(songs);
      }

      const totalSongsCount = await countSongsInFolder(currentFolderId);
      await updateFolderSongCount(currentFolderId, totalSongsCount);
      await updateFolderScanTime(currentFolderId);

      showSuccess(`יובאו ${songs.length} שירים מתיקיית המוזיקה!`);
      onSongsAdded();
    } catch (error) {
      console.error('Error importing music folder:', error);
      showError('שגיאה בייבוא תיקיית המוזיקה');
    } finally {
      setIsImporting(false);
      setImportProgress({ current: 0, total: 0 });
    }
  };

  return (
    <div className="view home-view">
      <header className="home-view__header">
        <img src="/icon.png" alt="Smart Player" className="home-view__logo" />
        <h1 className="home-view__title">Smart Player</h1>
        <p className="home-view__subtitle">נגן האודיו החכם שלך</p>
      </header>

      {totalSongs === 0 ? (
        <div className="empty-state">
          <MusicNote224Regular className="empty-state__icon" />
          <p className="empty-state__title">הספרייה ריקה</p>
          <p className="empty-state__text">האם תרצה לייבא את תיקיית המוזיקה שלך?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16, alignItems: 'center' }}>
            {isImporting ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Spinner size="tiny" />
                  <span>מייבא... {importProgress.total > 0 ? `${importProgress.current}/${importProgress.total}` : ''}</span>
                </div>
                {importProgress.total > 0 && (
                  <div style={{ 
                    width: '100%', 
                    height: 4, 
                    background: 'var(--surface-secondary)', 
                    borderRadius: 2,
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      width: `${(importProgress.current / importProgress.total) * 100}%`, 
                      height: '100%', 
                      background: 'var(--color-primary)',
                      transition: 'width 0.3s'
                    }} />
                  </div>
                )}
              </div>
            ) : (
              <Button 
                appearance="primary" 
                icon={<MusicNote124Regular />}
                onClick={handleImportMusicFolder}
              >
                ייבא תיקיית מוזיקה
              </Button>
            )}
            <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>או</span>
            <AddSongsButton onSongsAdded={onSongsAdded} />
          </div>
        </div>
      ) : (
        <>
          {recentSongs.length > 0 && (
            <SongList
              songs={recentSongs}
              title="הושמעו לאחרונה"
              showSearch={false}
              onOpenRingtone={onOpenRingtone}
              onOpenMetadata={onOpenMetadata}
            />
          )}
        </>
      )}
    </div>
  );
}
