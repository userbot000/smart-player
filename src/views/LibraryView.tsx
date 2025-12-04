import { useMemo } from 'react';
import { Library24Regular, History24Regular, Heart24Regular } from '@fluentui/react-icons';
import { Song } from '../types';
import { SongList, FolderTreeView, LibraryActions } from '../components';

interface LibraryViewProps {
  songs: Song[];
  onDelete: (id: string) => void;
  onSongsAdded: () => void;
  onToggleFavorite: (id: string) => void;
  onOpenRingtone?: (song: Song) => void;
  onOpenMetadata?: (song: Song) => void;
  title?: string;
  viewType?: 'library' | 'history' | 'favorites';
  showAddButton?: boolean;
}

export function LibraryView({
  songs,
  onDelete,
  onSongsAdded,
  onToggleFavorite,
  onOpenRingtone,
  onOpenMetadata,
  title = 'הספרייה שלי',
  viewType = 'library',
  showAddButton = true,
}: LibraryViewProps) {
  // Always use folder view if there are subfolders
  const viewMode = 'folders';

  // Check if any songs have subfolders
  const hasFolders = useMemo(() => {
    return songs.some(song => song.subFolder);
  }, [songs]);

  const getEmptyIcon = () => {
    switch (viewType) {
      case 'history':
        return <History24Regular className="empty-state__icon" />;
      case 'favorites':
        return <Heart24Regular className="empty-state__icon" />;
      default:
        return <Library24Regular className="empty-state__icon" />;
    }
  };

  const getEmptyText = () => {
    switch (viewType) {
      case 'history':
        return { title: 'אין היסטוריה', text: 'שירים שתנגן יופיעו כאן' };
      case 'favorites':
        return { title: 'אין מועדפים', text: 'הוסף שירים למועדפים מהתפריט' };
      default:
        return { title: 'אין שירים בספרייה', text: 'לחץ על "הוסף תיקייה" להתחיל' };
    }
  };

  const emptyText = getEmptyText();

  return (
    <div className="view">
      <div className="view__header">
        <h2 className="view__title">{title}</h2>
        <div className="view__header-actions">
          {showAddButton && <LibraryActions onSongsAdded={onSongsAdded} />}
        </div>
      </div>

      {songs.length === 0 ? (
        <div className="empty-state">
          {getEmptyIcon()}
          <p className="empty-state__title">{emptyText.title}</p>
          <p className="empty-state__text">{emptyText.text}</p>
        </div>
      ) : (
        <>
          {viewMode === 'folders' && hasFolders ? (
            <FolderTreeView songs={songs} onDelete={onDelete} onToggleFavorite={onToggleFavorite} onOpenRingtone={onOpenRingtone} onOpenMetadata={onOpenMetadata} />
          ) : (
            <SongList songs={songs} onDelete={onDelete} onToggleFavorite={onToggleFavorite} onOpenRingtone={onOpenRingtone} onOpenMetadata={onOpenMetadata} showSearch={true} />
          )}
        </>
      )}
    </div>
  );
}
