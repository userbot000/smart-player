import { useState, useRef } from 'react';
import { Button, Spinner } from '@fluentui/react-components';
import { FolderAdd24Regular, ArrowSync24Regular } from '@fluentui/react-icons';
import { invoke } from '@tauri-apps/api/core';
import { Song } from '../../types';
import { addSong } from '../../db/database';
import {
  addWatchedFolder,
  getWatchedFolderByName,
  WatchedFolder,
  updateFolderSongCount,
  updateFolderScanTime,
  getSongFileNamesInFolder,
  countSongsInFolder,
} from '../../db/watchedFolders';
import { extractMetadataFromBuffer } from '../../utils/audioMetadata';
import { useToast } from '../Toast/ToastProvider';

interface AddSongsButtonProps {
  onSongsAdded: () => void;
  mode?: 'add' | 'rescan';
  folderId?: string;
  folderName?: string;
  folderPath?: string;
}

interface AudioFileFromRust {
  name: string;
  path: string;
  data: number[];
}

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac', '.wma', '.opus'];

function isAudioFile(fileName: string): boolean {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
  return AUDIO_EXTENSIONS.includes(ext);
}

async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}


export function AddSongsButton({ onSongsAdded, mode = 'add', folderId, folderName, folderPath }: AddSongsButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, skipped: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showSuccess, showWarning, showError } = useToast();

  // Rescan using Tauri - no dialog needed
  const handleRescan = async () => {
    if (!folderPath || !folderId) {
      showError('נתיב התיקייה לא נמצא');
      return;
    }

    setIsLoading(true);
    try {
      const files: AudioFileFromRust[] = await invoke('scan_folder', { folderPath });

      if (files.length === 0) {
        showWarning('לא נמצאו קבצי אודיו בתיקייה');
        setIsLoading(false);
        return;
      }

      const existingFileNames = await getSongFileNamesInFolder(folderId);
      const newFiles = files.filter(f => !existingFileNames.has(f.name));
      const skippedCount = files.length - newFiles.length;

      if (newFiles.length === 0) {
        showSuccess(`כל ${files.length} השירים כבר קיימים בספרייה`, 'הכל מעודכן');
        setIsLoading(false);
        return;
      }

      setProgress({ current: 0, total: newFiles.length, skipped: skippedCount });

      let addedCount = 0;
      for (const file of newFiles) {
        try {
          const audioData = new Uint8Array(file.data).buffer;
          const metadata = await extractMetadataFromBuffer(audioData, file.name);

          const song: Song = {
            id: crypto.randomUUID(),
            title: metadata.title,
            artist: metadata.artist,
            album: metadata.album,
            duration: metadata.duration,
            genre: metadata.genre,
            coverUrl: metadata.coverUrl,
            filePath: file.path,
            originalPath: file.path,
            audioData,
            addedAt: Date.now(),
            playCount: 0,
            folderId,
            fileName: file.name,
          };

          await addSong(song);
          addedCount++;
          setProgress({ current: addedCount, total: newFiles.length, skipped: skippedCount });
        } catch (err) {
          console.error(`Error processing ${file.name}:`, err);
        }
      }

      const totalSongs = await countSongsInFolder(folderId);
      await updateFolderSongCount(folderId, totalSongs);
      await updateFolderScanTime(folderId);

      if (skippedCount > 0) {
        showSuccess(`נוספו ${addedCount} שירים חדשים (${skippedCount} כבר קיימים)`, 'הושלם');
      } else {
        showSuccess(`נוספו ${addedCount} שירים`, 'הושלם');
      }

      onSongsAdded();
    } catch (error) {
      console.error('Error rescanning folder:', error);
      showError('שגיאה בסריקת התיקייה');
    } finally {
      setIsLoading(false);
      setProgress({ current: 0, total: 0, skipped: 0 });
    }
  };

  const handleClick = () => {
    if (mode === 'rescan' && folderPath) {
      handleRescan();
    } else {
      fileInputRef.current?.click();
    }
  };

  const processFiles = async (audioFiles: File[], targetFolderId?: string, targetFolderName?: string) => {
    if (audioFiles.length === 0) {
      showWarning('לא נמצאו קבצי אודיו בתיקייה');
      return;
    }

    let currentFolderId = targetFolderId;
    let existingFileNames = new Set<string>();

    // Get folder path from first file
    const firstFile = audioFiles[0];
    const webkitPath = firstFile.webkitRelativePath;
    const detectedFolderName = targetFolderName || webkitPath.split('/')[0] || 'תיקייה חדשה';

    // Try to get full path - in Tauri we can access it
    let fullFolderPath = detectedFolderName;
    if ((firstFile as any).path) {
      const filePath = (firstFile as any).path as string;
      fullFolderPath = filePath.substring(0, filePath.lastIndexOf('\\') || filePath.lastIndexOf('/'));
    }

    const existingFolder = await getWatchedFolderByName(detectedFolderName);

    if (existingFolder) {
      currentFolderId = existingFolder.id;
      existingFileNames = await getSongFileNamesInFolder(existingFolder.id);
    } else {
      currentFolderId = crypto.randomUUID();
      const watchedFolder: WatchedFolder = {
        id: currentFolderId,
        path: fullFolderPath,
        name: detectedFolderName,
        addedAt: Date.now(),
        lastScanned: Date.now(),
        songCount: 0,
      };
      await addWatchedFolder(watchedFolder);
    }

    const newFiles = audioFiles.filter((file) => !existingFileNames.has(file.name));
    const skippedCount = audioFiles.length - newFiles.length;

    if (newFiles.length === 0) {
      showSuccess(`כל ${audioFiles.length} השירים כבר קיימים בספרייה`, 'הכל מעודכן');
      return;
    }

    setProgress({ current: 0, total: newFiles.length, skipped: skippedCount });

    let addedCount = 0;
    for (const file of newFiles) {
      try {
        const audioData = await fileToArrayBuffer(file);
        const metadata = await extractMetadataFromBuffer(audioData, file.name);

        // Get original file path if available
        const originalPath = (file as any).path || '';

        const song: Song = {
          id: crypto.randomUUID(),
          title: metadata.title,
          artist: metadata.artist,
          album: metadata.album,
          duration: metadata.duration,
          genre: metadata.genre,
          coverUrl: metadata.coverUrl,
          filePath: '',
          originalPath,
          audioData,
          addedAt: Date.now(),
          playCount: 0,
          folderId: currentFolderId,
          fileName: file.name,
        };

        await addSong(song);
        addedCount++;
        setProgress({ current: addedCount, total: newFiles.length, skipped: skippedCount });
      } catch (err) {
        console.error(`Error processing ${file.name}:`, err);
      }
    }

    const totalSongs = await countSongsInFolder(currentFolderId!);
    await updateFolderSongCount(currentFolderId!, totalSongs);
    await updateFolderScanTime(currentFolderId!);

    if (skippedCount > 0) {
      showSuccess(`נוספו ${addedCount} שירים חדשים (${skippedCount} כבר קיימים)`, 'הושלם');
    } else {
      showSuccess(`נוספו ${addedCount} שירים`, 'הושלם');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);

    try {
      const audioFiles = Array.from(files).filter((file) => isAudioFile(file.name));
      await processFiles(audioFiles, folderId, folderName);
      onSongsAdded();
    } catch (error) {
      console.error('Error adding songs:', error);
      showError('שגיאה בהוספת שירים');
    } finally {
      setIsLoading(false);
      setProgress({ current: 0, total: 0, skipped: 0 });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const buttonText = () => {
    if (isLoading) {
      const skipText = progress.skipped > 0 ? ` (דילוג על ${progress.skipped})` : '';
      return `מוסיף... ${progress.current}/${progress.total}${skipText}`;
    }
    return mode === 'rescan' ? 'סרוק מחדש' : 'הוסף תיקייה';
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
      />
      <Button
        appearance={mode === 'rescan' ? 'outline' : 'primary'}
        icon={isLoading ? <Spinner size="tiny" /> : mode === 'rescan' ? <ArrowSync24Regular /> : <FolderAdd24Regular />}
        onClick={handleClick}
        disabled={isLoading}
      >
        {buttonText()}
      </Button>
    </>
  );
}
