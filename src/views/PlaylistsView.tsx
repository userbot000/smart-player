import { useState, useEffect } from 'react';
import { Button, Input, Dialog, DialogTrigger, DialogSurface, DialogTitle, DialogBody, DialogActions, DialogContent } from '@fluentui/react-components';
import { MusicNote224Regular, Add24Regular, Delete24Regular, Play24Filled, ArrowLeft24Regular } from '@fluentui/react-icons';
import { Song, Playlist } from '../types';
import { getAllPlaylists, createPlaylist, deletePlaylist, getPlaylistSongs } from '../db/database';
import { SongList } from '../components';
import { useToast } from '../components/Toast/ToastProvider';

interface PlaylistsViewProps {
  onOpenRingtone?: (song: Song) => void;
  onOpenMetadata?: (song: Song) => void;
}

export function PlaylistsView({ onOpenRingtone, onOpenMetadata }: PlaylistsViewProps = {}) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<Song[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    loadPlaylists();
  }, []);

  useEffect(() => {
    if (selectedPlaylist) {
      loadPlaylistSongs(selectedPlaylist.id);
    }
  }, [selectedPlaylist]);

  const loadPlaylists = async () => {
    const data = await getAllPlaylists();
    setPlaylists(data);
  };

  const loadPlaylistSongs = async (playlistId: string) => {
    const songs = await getPlaylistSongs(playlistId);
    setPlaylistSongs(songs);
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      showError('נא להזין שם לרשימת ההשמעה');
      return;
    }

    try {
      await createPlaylist(newPlaylistName);
      setNewPlaylistName('');
      setIsDialogOpen(false);
      loadPlaylists();
      showSuccess('רשימת השמעה נוצרה בהצלחה');
    } catch (error) {
      showError('שגיאה ביצירת רשימת השמעה');
    }
  };

  const handleDeletePlaylist = async (id: string) => {
    try {
      await deletePlaylist(id);
      loadPlaylists();
      if (selectedPlaylist?.id === id) {
        setSelectedPlaylist(null);
      }
      showSuccess('רשימת השמעה נמחקה');
    } catch (error) {
      showError('שגיאה במחיקת רשימת השמעה');
    }
  };

  if (selectedPlaylist) {
    return (
      <div className="view playlists-view">
        <div className="view__header">
          <Button
            appearance="subtle"
            icon={<ArrowLeft24Regular />}
            onClick={() => setSelectedPlaylist(null)}
          >
            חזרה
          </Button>
          <h2 className="view__title">{selectedPlaylist.name}</h2>
          <div className="view__header-actions">
            <Button
              appearance="secondary"
              icon={<Delete24Regular />}
              onClick={() => handleDeletePlaylist(selectedPlaylist.id)}
            >
              מחק רשימה
            </Button>
          </div>
        </div>

        {playlistSongs.length === 0 ? (
          <div className="empty-state">
            <MusicNote224Regular className="empty-state__icon" />
            <p className="empty-state__title">הרשימה ריקה</p>
            <p className="empty-state__text">הוסף שירים מהספרייה</p>
          </div>
        ) : (
          <SongList songs={playlistSongs} showSearch={false} onOpenRingtone={onOpenRingtone} onOpenMetadata={onOpenMetadata} />
        )}
      </div>
    );
  }

  return (
    <div className="view playlists-view">
      <div className="view__header">
        <h2 className="view__title">רשימות השמעה</h2>
        <div className="view__header-actions">
          <Dialog open={isDialogOpen} onOpenChange={(_, data) => setIsDialogOpen(data.open)}>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="primary" icon={<Add24Regular />}>
                רשימה חדשה
              </Button>
            </DialogTrigger>
            <DialogSurface dir="rtl">
              <DialogBody>
                <DialogTitle>צור רשימת השמעה חדשה</DialogTitle>
                <DialogContent>
                  <Input
                    placeholder="שם הרשימה"
                    value={newPlaylistName}
                    onChange={(_, data) => setNewPlaylistName(data.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
                    style={{ width: '100%' }}
                  />
                </DialogContent>
                <DialogActions style={{ flexDirection: 'row-reverse', justifyContent: 'flex-start' }}>
                  <Button appearance="primary" onClick={handleCreatePlaylist}>
                    צור
                  </Button>
                  <DialogTrigger disableButtonEnhancement>
                    <Button appearance="secondary">ביטול</Button>
                  </DialogTrigger>
                </DialogActions>
              </DialogBody>
            </DialogSurface>
          </Dialog>
        </div>
      </div>

      {playlists.length === 0 ? (
        <div className="empty-state">
          <MusicNote224Regular className="empty-state__icon" />
          <p className="empty-state__title">אין רשימות השמעה</p>
          <p className="empty-state__text">צור רשימת השמעה חדשה</p>
        </div>
      ) : (
        <div className="playlists-grid">
          {playlists.map((playlist) => (
            <div
              key={playlist.id}
              className="playlist-card"
              onClick={() => setSelectedPlaylist(playlist)}
            >
              <div className="playlist-card__icon">
                <MusicNote224Regular />
                <div className="playlist-card__play-overlay">
                  <Play24Filled />
                </div>
              </div>
              <div className="playlist-card__info">
                <span className="playlist-card__name">{playlist.name}</span>
                <span className="playlist-card__count">{playlist.songIds.length} שירים</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .playlists-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
          padding: 8px;
        }

        .playlist-card {
          background: var(--surface-card);
          border-radius: 8px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .playlist-card:hover {
          background: var(--surface-hover);
          transform: translateY(-2px);
        }

        .playlist-card__icon {
          width: 100%;
          aspect-ratio: 1;
          background: var(--surface-secondary);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .playlist-card__icon svg {
          font-size: 48px;
          color: var(--text-secondary);
        }

        .playlist-card__play-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .playlist-card:hover .playlist-card__play-overlay {
          opacity: 1;
        }

        .playlist-card__play-overlay svg {
          font-size: 32px;
          color: white;
        }

        .playlist-card__info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .playlist-card__name {
          font-weight: 500;
          font-size: 14px;
        }

        .playlist-card__count {
          font-size: 12px;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}
