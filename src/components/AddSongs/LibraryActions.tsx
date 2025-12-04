import { useState } from 'react';
import { Button } from '@fluentui/react-components';
import { ArrowSync24Regular } from '@fluentui/react-icons';
import { AddSongsButton } from './AddSongsButton';
import { getWatchedFolders } from '../../db/watchedFolders';
import { useToast } from '../Toast/ToastProvider';

interface LibraryActionsProps {
  onSongsAdded: () => void;
}

export function LibraryActions({ onSongsAdded }: LibraryActionsProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      const folders = await getWatchedFolders();
      
      if (folders.length === 0) {
        showError('אין תיקיות לרענן');
        setIsRefreshing(false);
        return;
      }

      // Import AddSongsButton's rescan logic
      const { invoke } = await import('@tauri-apps/api/core');
      
      let totalAdded = 0;
      for (const folder of folders) {
        try {
          // Scan folder with progress tracking
          const files: any[] = await invoke('scan_folder', { folderPath: folder.path });
          totalAdded += files.length;
        } catch (error) {
          console.error(`Error scanning ${folder.name}:`, error);
        }
      }
      
      showSuccess(`סריקה הושלמה! נמצאו ${totalAdded} קבצים`);
      onSongsAdded();
    } catch (error) {
      console.error('Error refreshing folders:', error);
      showError('שגיאה ברענון התיקיות');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <AddSongsButton onSongsAdded={onSongsAdded} />
      <Button
        appearance="secondary"
        icon={<ArrowSync24Regular />}
        onClick={handleRefreshAll}
        disabled={isRefreshing}
      >
        {isRefreshing ? 'מרענן...' : 'רענן תיקיות'}
      </Button>
    </div>
  );
}
