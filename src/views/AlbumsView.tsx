import { useMemo, useState } from 'react';
import { Button } from '@fluentui/react-components';
import { Album24Regular, Play24Filled, ArrowLeft24Regular } from '@fluentui/react-icons';
import { Song } from '../types';
import { SongList } from '../components';
import './AlbumsView.css';

interface Album {
  name: string;
  artist: string;
  coverUrl?: string;
  songs: Song[];
}

interface AlbumsViewProps {
  songs: Song[];
  onOpenRingtone?: (song: Song) => void;
  onOpenMetadata?: (song: Song) => void;
}

export function AlbumsView({ songs, onOpenRingtone, onOpenMetadata }: AlbumsViewProps) {
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);

  const albums = useMemo(() => {
    const albumMap = new Map<string, Album>();

    songs.forEach((song) => {
      if (song.album) {
        const key = song.album; // Group only by album name
        if (!albumMap.has(key)) {
          albumMap.set(key, {
            name: song.album,
            artist: song.artist,
            coverUrl: song.coverUrl,
            songs: [],
          });
        } else {
          // If album exists, merge artists
          const album = albumMap.get(key)!;
          if (!album.artist.includes(song.artist)) {
            album.artist = `${album.artist} & ${song.artist}`;
          }
          // Update cover if current song has one and album doesn't
          if (!album.coverUrl && song.coverUrl) {
            album.coverUrl = song.coverUrl;
          }
        }
        albumMap.get(key)!.songs.push(song);
      }
    });

    return Array.from(albumMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [songs]);

  if (selectedAlbum) {
    return (
      <div className="view albums-view">
        <div className="albums-view__album-header">
          <Button
            appearance="subtle"
            icon={<ArrowLeft24Regular />}
            onClick={() => setSelectedAlbum(null)}
          >
            חזרה
          </Button>
          <div className="albums-view__album-info">
            <div
              className="albums-view__album-cover-large"
              style={{ backgroundImage: selectedAlbum.coverUrl ? `url(${selectedAlbum.coverUrl})` : undefined }}
            >
              {!selectedAlbum.coverUrl && <Album24Regular />}
            </div>
            <div>
              <h2 className="albums-view__album-title">{selectedAlbum.name}</h2>
              <p className="albums-view__album-artist">{selectedAlbum.artist}</p>
              <p className="albums-view__album-count">{selectedAlbum.songs.length} שירים</p>
            </div>
          </div>
        </div>
        <SongList songs={selectedAlbum.songs} showSearch={false} onOpenRingtone={onOpenRingtone} onOpenMetadata={onOpenMetadata} />
      </div>
    );
  }

  return (
    <div className="view albums-view">
      <div className="view__header">
        <h2 className="view__title">אלבומים</h2>
      </div>

      {albums.length === 0 ? (
        <div className="empty-state">
          <Album24Regular className="empty-state__icon" />
          <p className="empty-state__title">אין אלבומים</p>
          <p className="empty-state__text">שירים עם מטאדאטה של אלבום יופיעו כאן</p>
        </div>
      ) : (
        <div className="albums-view__grid">
          {albums.map((album) => (
            <div
              key={album.name}
              className="albums-view__card"
              onClick={() => setSelectedAlbum(album)}
            >
              <div
                className="albums-view__cover"
                style={{ backgroundImage: album.coverUrl ? `url(${album.coverUrl})` : undefined }}
              >
                {!album.coverUrl && <Album24Regular />}
                <div className="albums-view__play-overlay">
                  <Play24Filled />
                </div>
              </div>
              <div className="albums-view__info">
                <span className="albums-view__name">{album.name}</span>
                <span className="albums-view__artist">{album.artist}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
