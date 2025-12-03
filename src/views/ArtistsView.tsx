import { useMemo, useState } from 'react';
import { Button } from '@fluentui/react-components';
import { Person24Regular, Play24Filled, ArrowLeft24Regular } from '@fluentui/react-icons';
import { Song } from '../types';
import { SongList } from '../components';
import './ArtistsView.css';

interface Artist {
  name: string;
  coverUrl?: string;
  songs: Song[];
}

interface ArtistsViewProps {
  songs: Song[];
  onToggleFavorite?: (id: string) => void;
}

export function ArtistsView({ songs, onToggleFavorite }: ArtistsViewProps) {
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);

  const artists = useMemo(() => {
    const artistMap = new Map<string, Artist>();

    songs.forEach((song) => {
      const key = song.artist;
      if (!artistMap.has(key)) {
        artistMap.set(key, {
          name: song.artist,
          coverUrl: song.coverUrl,
          songs: [],
        });
      }
      const artist = artistMap.get(key)!;
      artist.songs.push(song);
      // Use first song with cover as artist cover
      if (!artist.coverUrl && song.coverUrl) {
        artist.coverUrl = song.coverUrl;
      }
    });

    return Array.from(artistMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [songs]);

  if (selectedArtist) {
    return (
      <div className="view artists-view">
        <div className="artists-view__artist-header">
          <Button appearance="subtle" icon={<ArrowLeft24Regular />} onClick={() => setSelectedArtist(null)}>
            חזרה
          </Button>
          <div className="artists-view__artist-info">
            <div
              className="artists-view__artist-cover-large"
              style={{ backgroundImage: selectedArtist.coverUrl ? `url(${selectedArtist.coverUrl})` : undefined }}
            >
              {!selectedArtist.coverUrl && <Person24Regular />}
            </div>
            <div>
              <h2 className="artists-view__artist-name">{selectedArtist.name}</h2>
              <p className="artists-view__artist-count">{selectedArtist.songs.length} שירים</p>
            </div>
          </div>
        </div>
        <SongList songs={selectedArtist.songs} onToggleFavorite={onToggleFavorite} showSearch={false} />
      </div>
    );
  }

  return (
    <div className="view artists-view">
      <div className="view__header">
        <h2 className="view__title">אמנים</h2>
      </div>

      {artists.length === 0 ? (
        <div className="empty-state">
          <Person24Regular className="empty-state__icon" />
          <p className="empty-state__title">אין אמנים</p>
          <p className="empty-state__text">הוסף שירים לספרייה</p>
        </div>
      ) : (
        <div className="artists-view__grid">
          {artists.map((artist) => (
            <div key={artist.name} className="artists-view__card" onClick={() => setSelectedArtist(artist)}>
              <div
                className="artists-view__cover"
                style={{ backgroundImage: artist.coverUrl ? `url(${artist.coverUrl})` : undefined }}
              >
                {!artist.coverUrl && <Person24Regular />}
                <div className="artists-view__play-overlay">
                  <Play24Filled />
                </div>
              </div>
              <div className="artists-view__info">
                <span className="artists-view__name">{artist.name}</span>
                <span className="artists-view__count">{artist.songs.length} שירים</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
