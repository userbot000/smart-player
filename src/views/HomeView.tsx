import { MusicNote224Regular } from '@fluentui/react-icons';
import { Song } from '../types';
import { SongList, AddSongsButton } from '../components';

interface HomeViewProps {
  recentSongs: Song[];
  totalSongs: number;
  onSongsAdded: () => void;
  onOpenRingtone?: (song: Song) => void;
  onOpenMetadata?: (song: Song) => void;
}

export function HomeView({ recentSongs, totalSongs, onSongsAdded, onOpenRingtone, onOpenMetadata }: HomeViewProps) {
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
          <p className="empty-state__text">הוסף שירים כדי להתחיל</p>
          <div style={{ marginTop: 16 }}>
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
