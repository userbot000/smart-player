import { useState, useMemo, useEffect } from 'react';
import { Input, Button, Menu, MenuTrigger, MenuPopover, MenuList, MenuItem, MenuDivider } from '@fluentui/react-components';
import {
  Search24Regular,
  Play24Filled,
  MoreVertical24Regular,
  Delete24Regular,
  MusicNote224Regular,
  Heart24Regular,
  Heart24Filled,
  Add24Regular,
} from '@fluentui/react-icons';
import { Song, Playlist } from '../../types';
import { usePlayerStore } from '../../store/playerStore';
import { formatTime } from '../../utils/formatTime';
import { getAllPlaylists, addSongToPlaylist } from '../../db/database';
import { useToast } from '../Toast/ToastProvider';
import './SongList.css';

interface SongListProps {
  songs: Song[];
  onDelete?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  title?: string;
  showSearch?: boolean;
  showMenu?: boolean;
}

export function SongList({ songs, onDelete, onToggleFavorite, title, showSearch = true, showMenu = true }: SongListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const { currentSong, setSong, setQueue, setQueueIndex, setPlaying } = usePlayerStore();
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    const data = await getAllPlaylists();
    setPlaylists(data);
  };

  const handleAddToPlaylist = async (songId: string, playlistId: string) => {
    try {
      await addSongToPlaylist(playlistId, songId);
      showSuccess('השיר נוסף לרשימת ההשמעה');
    } catch (error) {
      showError('שגיאה בהוספת השיר');
    }
  };

  const filteredSongs = useMemo(() => {
    if (!searchQuery) return songs;
    const query = searchQuery.toLowerCase();
    return songs.filter(
      (song) => song.title.toLowerCase().includes(query) || song.artist.toLowerCase().includes(query)
    );
  }, [songs, searchQuery]);

  const handlePlaySong = (song: Song, index: number) => {
    setQueue(filteredSongs);
    setQueueIndex(index);
    setSong(song);
    setPlaying(true);
  };

  const handlePlayAll = () => {
    if (filteredSongs.length > 0) {
      setQueue(filteredSongs);
      setQueueIndex(0);
      setSong(filteredSongs[0]);
      setPlaying(true);
    }
  };

  if (songs.length === 0) {
    return null;
  }

  return (
    <div className="song-list">
      {(title || showSearch) && (
        <div className="song-list__header">
          {title && <h3 className="song-list__title">{title}</h3>}
          <div className="song-list__actions">
            {showSearch ? (
              <Input
                placeholder="חיפוש..."
                contentBefore={<Search24Regular />}
                value={searchQuery}
                onChange={(_, data) => setSearchQuery(data.value)}
                className="song-list__search"
              />
            ) : (
              <div />
            )}
            <Button appearance="primary" icon={<Play24Filled />} onClick={handlePlayAll}>
              נגן הכל
            </Button>
          </div>
        </div>
      )}

      {filteredSongs.length === 0 ? (
        <div className="song-list__empty">
          <MusicNote224Regular className="song-list__empty-icon" />
          <p>לא נמצאו תוצאות</p>
        </div>
      ) : (
        <div className="song-list__items">
          {filteredSongs.map((song, index) => (
            <div
              key={song.id}
              className={`song-item ${currentSong?.id === song.id ? 'song-item--active' : ''}`}
              onClick={() => handlePlaySong(song, index)}
            >
              <div className="song-item__cover">
                {song.coverUrl ? (
                  <img src={song.coverUrl} alt={song.title} className="song-item__cover-img" />
                ) : (
                  <MusicNote224Regular />
                )}
                <div className="song-item__play-overlay">
                  <Play24Filled />
                </div>
              </div>

              <div className="song-item__info">
                <span className="song-item__title">{song.title}</span>
                <span className="song-item__artist">{song.artist}</span>
              </div>

              <span className="song-item__duration">{formatTime(song.duration)}</span>

              {showMenu && (
                <Menu>
                  <MenuTrigger disableButtonEnhancement>
                    <Button
                      appearance="subtle"
                      icon={<MoreVertical24Regular />}
                      onClick={(e) => e.stopPropagation()}
                      className="song-item__menu-button"
                    />
                  </MenuTrigger>
                  <MenuPopover>
                    <MenuList>
                      {onToggleFavorite && (
                        <MenuItem
                          icon={song.isFavorite ? <Heart24Filled /> : <Heart24Regular />}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(song.id);
                          }}
                        >
                          {song.isFavorite ? 'הסר ממועדפים' : 'הוסף למועדפים'}
                        </MenuItem>
                      )}
                      {playlists.length > 0 && (
                        <>
                          <MenuDivider />
                          <Menu>
                            <MenuTrigger disableButtonEnhancement>
                              <MenuItem icon={<Add24Regular />}>הוסף לרשימת השמעה</MenuItem>
                            </MenuTrigger>
                            <MenuPopover>
                              <MenuList>
                                {playlists.map((playlist) => (
                                  <MenuItem
                                    key={playlist.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddToPlaylist(song.id, playlist.id);
                                    }}
                                  >
                                    {playlist.name}
                                  </MenuItem>
                                ))}
                              </MenuList>
                            </MenuPopover>
                          </Menu>
                        </>
                      )}
                      {onDelete && (
                        <>
                          <MenuDivider />
                          <MenuItem
                            icon={<Delete24Regular />}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(song.id);
                            }}
                          >
                            מחק
                          </MenuItem>
                        </>
                      )}
                    </MenuList>
                  </MenuPopover>
                </Menu>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
