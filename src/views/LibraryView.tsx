import { Library24Regular, History24Regular, Heart24Regular } from '@fluentui/react-icons';
import { Song } from '../types';
import { SongList, AddSongsButton } from '../components';

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
        {showAddButton && (
          <div className="view__header-actions">
            <AddSongsButton onSongsAdded={onSongsAdded} />
          </div>
        )}
      </div>

      {songs.length === 0 ? (
        <div className="empty-state">
          {getEmptyIcon()}
          <p className="empty-state__title">{emptyText.title}</p>
          <p className="empty-state__text">{emptyText.text}</p>
        </div>
      ) : (
        <SongList songs={songs} onDelete={onDelete} onToggleFavorite={onToggleFavorite} showSearch={true} />
      )}
    </div>
  );
}
