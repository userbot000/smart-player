import { useState, useRef } from 'react';
import { Button, Spinner } from '@fluentui/react-components';
import { FolderAdd24Regular, ArrowSync24Regular } from '@fluentui/react-icons';
import { Song } from '../../types';
import { addSongsBulk } from '../../db/database';
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

// Process files in parallel batches for faster indexing
const BATCH_SIZE = 10;

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

// Read only first 256KB for metadata (much faster than full file)
const METADATA_CHUNK_SIZE = 256 * 1024;

async function readFileMetadataChunk(file: File): Promise<ArrayBuffer> {
  // Read only what we need for metadata
  const chunk = file.slice(0, METADATA_CHUNK_SIZE);
  return chunk.arrayBuffer();
}

// Process batch of files in parallel
async function processBatch<T>(
  items: T[],
  processor: (item: T) => Promise<Song | null>,
  batchSize: number
): Promise<Song[]> {
  const results: Song[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    for (const r of batchResults) {
      if (r !== null) results.push(r);
    }
  }
  return results;
}


export function AddSongsButton({ onSongsAdded, mode = 'add', folderId, folderName, folderPath }: AddSongsButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, skipped: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showSuccess, showWarning, showError } = useToast();

  // Check if running in Tauri - check for actual Tauri API
  const isTauri = typeof window !== 'undefined' && 
    typeof (window as any).__TAURI_INTERNALS__ !== 'undefined';

  // Rescan using Tauri - no dialog needed
  const handleRescan = async () => {
    if (!folderPath || !folderId) {
      showError('נתיב התיקייה לא נמצא');
      return;
    }

    // If not in Tauri, fall back to file picker
    if (!isTauri) {
      fileInputRef.current?.click();
      return;
    }

    setIsLoading(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
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

      // Process files in parallel batches
      let processedCount = 0;
      const songs: Song[] = [];

      const processFile = async (file: AudioFileFromRust): Promise<Song | null> => {
        try {
          // Data already limited to 256KB from Rust
          const metadataBuffer = new Uint8Array(file.data).buffer;
          const metadata = await extractMetadataFromBuffer(metadataBuffer, file.name);

          processedCount++;
          setProgress({ current: processedCount, total: newFiles.length, skipped: skippedCount });

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
            addedAt: Date.now(),
            playCount: 0,
            folderId,
            fileName: file.name,
          };
        } catch (err) {
          console.error(`Error processing ${file.name}:`, err);
          return null;
        }
      };

      const processedSongs = await processBatch(newFiles, processFile, BATCH_SIZE);
      songs.push(...processedSongs);

      // Bulk insert all songs at once
      if (songs.length > 0) {
        await addSongsBulk(songs);
      }

      const totalSongs = await countSongsInFolder(folderId);
      await updateFolderSongCount(folderId, totalSongs);
      await updateFolderScanTime(folderId);

      if (skippedCount > 0) {
        showSuccess(`נוספו ${songs.length} שירים חדשים (${skippedCount} כבר קיימים)`, 'הושלם');
      } else {
        showSuccess(`נוספו ${songs.length} שירים`, 'הושלם');
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

  // Handle folder selection using Tauri dialog
  const handleAddFolder = async () => {
    if (!isTauri) {
      // Fallback to browser file picker
      fileInputRef.current?.click();
      return;
    }

    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'בחר תיקיית מוזיקה',
      });

      if (!selected || typeof selected !== 'string') return;

      setIsLoading(true);
      const folderPathSelected = selected;
      const folderNameSelected = folderPathSelected.split(/[/\\]/).pop() || 'תיקייה חדשה';

      const { invoke } = await import('@tauri-apps/api/core');
      const files: AudioFileFromRust[] = await invoke('scan_folder', { folderPath: folderPathSelected });

      if (files.length === 0) {
        showWarning('לא נמצאו קבצי אודיו בתיקייה');
        setIsLoading(false);
        return;
      }

      // Check if folder already exists
      const existingFolder = await getWatchedFolderByName(folderNameSelected);
      let currentFolderId: string;
      let existingFileNames = new Set<string>();

      if (existingFolder) {
        currentFolderId = existingFolder.id;
        existingFileNames = await getSongFileNamesInFolder(existingFolder.id);
      } else {
        currentFolderId = crypto.randomUUID();
        const watchedFolder: WatchedFolder = {
          id: currentFolderId,
          path: folderPathSelected,
          name: folderNameSelected,
          addedAt: Date.now(),
          lastScanned: Date.now(),
          songCount: 0,
        };
        await addWatchedFolder(watchedFolder);
      }

      const newFiles = files.filter(f => !existingFileNames.has(f.name));
      const skippedCount = files.length - newFiles.length;

      if (newFiles.length === 0) {
        showSuccess(`כל ${files.length} השירים כבר קיימים בספרייה`, 'הכל מעודכן');
        setIsLoading(false);
        return;
      }

      setProgress({ current: 0, total: newFiles.length, skipped: skippedCount });

      let processedCount = 0;
      const songs: Song[] = [];

      const processFile = async (file: AudioFileFromRust): Promise<Song | null> => {
        try {
          const metadataBuffer = new Uint8Array(file.data).buffer;
          const metadata = await extractMetadataFromBuffer(metadataBuffer, file.name);

          processedCount++;
          setProgress({ current: processedCount, total: newFiles.length, skipped: skippedCount });

          // Calculate relative subfolder path
          const relativePath = file.path.replace(folderPathSelected, '').replace(/^[/\\]/, '');
          const subFolder = relativePath.includes('/') || relativePath.includes('\\')
            ? relativePath.substring(0, relativePath.lastIndexOf(relativePath.includes('/') ? '/' : '\\'))
            : undefined;
          
          if (subFolder) {
            console.log('Found subfolder:', subFolder, 'for file:', file.name);
          }

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
          };
        } catch (err) {
          console.error(`Error processing ${file.name}:`, err);
          return null;
        }
      };

      const processedSongs = await processBatch(newFiles, processFile, BATCH_SIZE);
      songs.push(...processedSongs);

      if (songs.length > 0) {
        await addSongsBulk(songs);
      }

      const totalSongs = await countSongsInFolder(currentFolderId);
      await updateFolderSongCount(currentFolderId, totalSongs);
      await updateFolderScanTime(currentFolderId);

      if (skippedCount > 0) {
        showSuccess(`נוספו ${songs.length} שירים חדשים (${skippedCount} כבר קיימים)`, 'הושלם');
      } else {
        showSuccess(`נוספו ${songs.length} שירים`, 'הושלם');
      }

      onSongsAdded();
    } catch (error) {
      console.error('Error adding folder:', error);
      showError('שגיאה בהוספת תיקייה');
    } finally {
      setIsLoading(false);
      setProgress({ current: 0, total: 0, skipped: 0 });
    }
  };

  const handleClick = () => {
    if (mode === 'rescan' && folderPath) {
      handleRescan();
    } else {
      handleAddFolder();
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

    // Process files in parallel batches
    let processedCount = 0;
    const finalFolderId = currentFolderId!;

    const processFile = async (file: File): Promise<Song | null> => {
      try {
        // Read only first 256KB for metadata (much faster!)
        const metadataBuffer = await readFileMetadataChunk(file);
        const metadata = await extractMetadataFromBuffer(metadataBuffer, file.name);

        const originalPath = (file as any).path || '';

        processedCount++;
        setProgress({ current: processedCount, total: newFiles.length, skipped: skippedCount });

        return {
          id: crypto.randomUUID(),
          title: metadata.title,
          artist: metadata.artist,
          album: metadata.album,
          duration: metadata.duration,
          genre: metadata.genre,
          coverUrl: metadata.coverUrl,
          filePath: '',
          originalPath,
          addedAt: Date.now(),
          playCount: 0,
          folderId: finalFolderId,
          fileName: file.name,
        };
      } catch (err) {
        console.error(`Error processing ${file.name}:`, err);
        return null;
      }
    };

    const songs = await processBatch(newFiles, processFile, BATCH_SIZE);

    // Bulk insert all songs at once
    if (songs.length > 0) {
      await addSongsBulk(songs);
    }

    const totalSongs = await countSongsInFolder(finalFolderId);
    await updateFolderSongCount(finalFolderId, totalSongs);
    await updateFolderScanTime(finalFolderId);

    if (skippedCount > 0) {
      showSuccess(`נוספו ${songs.length} שירים חדשים (${skippedCount} כבר קיימים)`, 'הושלם');
    } else {
      showSuccess(`נוספו ${songs.length} שירים`, 'הושלם');
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
