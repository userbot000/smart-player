import { useState, useRef } from 'react';
import { Button, Spinner } from '@fluentui/react-components';
import { FolderAdd24Regular, ArrowSync24Regular } from '@fluentui/react-icons';
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
import { extractMetadata } from '../../utils/audioMetadata';
import { useToast } from '../Toast/ToastProvider';

interface AddSongsButtonProps {
  onSongsAdded: () => void;
  mode?: 'add' | 'rescan';
  folderId?: string;
  folderName?: string;
}

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac', '.wma', '.opus'];

function isAudioFile(fileName: string): boolean {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
  return AUDIO_EXTENSIONS.includes(ext);
}

// Read file as ArrayBuffer for storage
async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function AddSongsButton({ onSongsAdded, mode = 'add', folderId }: AddSongsButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, skipped: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showSuccess, showWarning, showError } = useToast();

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);

    try {
      const audioFiles = Array.from(files).filter((file) => isAudioFile(file.name));

      if (audioFiles.length === 0) {
        showWarning('לא נמצאו קבצי אודיו בתיקייה');
        setIsLoading(false);
        return;
      }

      // Get folder name from first file's path
      const firstFile = audioFiles[0];
      const pathParts = firstFile.webkitRelativePath.split('/');
      const detectedFolderName = pathParts[0] || 'תיקייה חדשה';

      // Check if folder already exists
      let currentFolderId = folderId;
      let existingFileNames = new Set<string>();

      const existingFolder = await getWatchedFolderByName(detectedFolderName);

      if (existingFolder) {
        // Folder exists - get existing song filenames to skip duplicates
        currentFolderId = existingFolder.id;
        existingFileNames = await getSongFileNamesInFolder(existingFolder.id);
        console.log(`Folder "${detectedFolderName}" exists with ${existingFileNames.size} songs`);
      } else {
        // Create new watched folder entry
        currentFolderId = crypto.randomUUID();
        const watchedFolder: WatchedFolder = {
          id: currentFolderId,
          path: detectedFolderName,
          name: detectedFolderName,
          addedAt: Date.now(),
          lastScanned: Date.now(),
          songCount: 0,
        };
        await addWatchedFolder(watchedFolder);
        console.log(`Created new folder "${detectedFolderName}"`);
      }

      // Filter out files that already exist
      const newFiles = audioFiles.filter((file) => !existingFileNames.has(file.name));
      const skippedCount = audioFiles.length - newFiles.length;

      if (newFiles.length === 0) {
        showSuccess(`כל ${audioFiles.length} השירים כבר קיימים בספרייה`, 'הכל מעודכן');
        setIsLoading(false);
        return;
      }

      if (skippedCount > 0) {
        console.log(`Skipping ${skippedCount} existing files, adding ${newFiles.length} new files`);
      }

      setProgress({ current: 0, total: newFiles.length, skipped: skippedCount });

      let addedCount = 0;
      for (const file of newFiles) {
        try {
          // Extract metadata including cover art
          const metadata = await extractMetadata(file);

          // Store the actual audio data
          const audioData = await fileToArrayBuffer(file);

          const song: Song = {
            id: crypto.randomUUID(),
            title: metadata.title,
            artist: metadata.artist,
            album: metadata.album,
            duration: metadata.duration,
            genre: metadata.genre,
            coverUrl: metadata.coverUrl,
            filePath: '', // Will be created from audioData when needed
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
          console.error(`Error Musicprocessing ${file.name}:`, err);
        }
      }

      // Update folder stats
      const totalSongs = await countSongsInFolder(currentFolderId!);
      await updateFolderSongCount(currentFolderId!, totalSongs);
      await updateFolderScanTime(currentFolderId!);

      // Show summary toast
      if (skippedCount > 0) {
        showSuccess(`נוספו ${addedCount} שירים חדשים (${skippedCount} כבר קיימים)`, 'הושלם');
      } else {
        showSuccess(`נוספו ${addedCount} שירים`, 'הושלם');
      }

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
