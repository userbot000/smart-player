import { useMemo } from 'react';
import { Library24Regular, History24Regular, Heart24Regular } from '@fluentui/react-icons';
import { Song } from '../types';
import { SongList, FolderTreeView, LibraryActions } from '../components';

interface LibraryViewProps {
  songs: Song[];
  onDelete: (id: string) => void;
  onSongsAdded: () => void;
  onToggleFavorite: (id: string) => void;
  title?: string;
  viewType?: 'library' | 'history' | 'favorites';
  showAddButton?: boolean;
}

export function LibraryView({
  songs,
  onDelete,
  onSongsAdded,
  onToggleFavorite,
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
          {!hasFolders && songs.length > 0 && viewType === 'library' && (
            <div style={{ padding: '12px', background: 'var(--surface-secondary)', borderRadius: '8px', marginBottom: '16px' }}>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
                💡 לא נמצאו תתי-תיקיות. אם יש לך שירים בתתי-תיקיות, סרוק מחדש את התיקייה מההגדרות כדי לראות את תצוגת התיקיות.
              </p>
            </div>
          )}
          {viewMode === 'folders' && hasFolders ? (
            <FolderTreeView songs={songs} onDelete={onDelete} onToggleFavorite={onToggleFavorite} />
          ) : (
            <SongList songs={songs} onDelete={onDelete} onToggleFavorite={onToggleFavorite} showSearch={true} />
          )}
        </>
      )}
    </div>
  );
}
