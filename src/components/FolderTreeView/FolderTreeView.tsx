import { useState, useMemo, useEffect } from 'react';
import { Input, Button, Menu, MenuTrigger, MenuPopover, MenuList, MenuItem, MenuDivider } from '@fluentui/react-components';
import {
  Search24Regular,
  Folder24Regular,
  ArrowLeft24Regular,
  MusicNote224Regular,
  Play24Filled,
  MoreVertical24Regular,
  Delete24Regular,
  Heart24Regular,
  Heart24Filled,
  Cut24Regular,
  Tag24Regular,
  Add24Regular,
} from '@fluentui/react-icons';
import { Song } from '../../types';
import { usePlayerStore } from '../../store/playerStore';
import { formatTime } from '../../utils/formatTime';
import './FolderTreeView.css';

interface FolderTreeViewProps {
  songs: Song[];
  onDelete?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onOpenRingtone?: (song: Song) => void;
  onOpenMetadata?: (song: Song) => void;
}

interface FolderItem {
  name: string;
  path: string;
  songCount: number;
}

export function FolderTreeView({ songs, onDelete, onToggleFavorite, onOpenRingtone, onOpenMetadata }: FolderTreeViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const { currentSong, setSong, setQueue, setQueueIndex, setPlaying } = usePlayerStore();

  useEffect(() => {
    const loadPlaylists = async () => {
      const { getAllPlaylists } = await import('../../db/database');
      const data = await getAllPlaylists();
      setPlaylists(data);
    };
    loadPlaylists();
  }, []);

  const handleAddToPlaylist = async (songId: string, playlistId: string) => {
    try {
      const { addSongToPlaylist } = await import('../../db/database');
      await addSongToPlaylist(playlistId, songId);
    } catch (error) {
      console.error('Error adding song to playlist:', error);
    }
  };

  // Build folder structure
  const { folders, currentSongs } = useMemo(() => {
    const pathStr = currentPath.join('/');
    
    // Get all items in current folder
    const foldersMap = new Map<string, number>();
    const songsInFolder: Song[] = [];

    songs.forEach((song) => {
      const subFolder = song.subFolder || '';
      
      // Normalize path separators
      const normalizedSubFolder = subFolder.replace(/\\/g, '/');
      const normalizedPath = pathStr.replace(/\\/g, '/');
      
      // Check if song is in current folder or subfolder
      if (normalizedPath === '') {
        // Root level
        if (!normalizedSubFolder) {
          songsInFolder.push(song);
        } else {
          const firstPart = normalizedSubFolder.split('/')[0];
          foldersMap.set(firstPart, (foldersMap.get(firstPart) || 0) + 1);
        }
      } else {
        // Inside a folder
        if (normalizedSubFolder === normalizedPath) {
          // Song directly in this folder
          songsInFolder.push(song);
        } else if (normalizedSubFolder.startsWith(normalizedPath + '/')) {
          // Song in subfolder
          const remaining = normalizedSubFolder.substring(normalizedPath.length + 1);
          const nextPart = remaining.split('/')[0];
          if (nextPart) {
            foldersMap.set(nextPart, (foldersMap.get(nextPart) || 0) + 1);
          }
        }
      }
    });

    const foldersList: FolderItem[] = Array.from(foldersMap.entries()).map(([name, count]) => ({
      name,
      path: pathStr ? `${pathStr}/${name}` : name,
      songCount: count,
    }));

    return { folders: foldersList, currentSongs: songsInFolder };
  }, [songs, currentPath]);

  // Filter songs and folders by search
  const { filteredSongs, filteredFolders } = useMemo(() => {
    if (!searchQuery) {
      return { filteredSongs: currentSongs, filteredFolders: folders };
    }
    
    const query = searchQuery.toLowerCase();
    
    // Search in all songs (not just current folder)
    const matchingSongs = songs.filter(
      (song) => 
        song.title.toLowerCase().includes(query) || 
        song.artist.toLowerCase().includes(query) ||
        (song.album && song.album.toLowerCase().includes(query)) ||
        (song.subFolder && song.subFolder.toLowerCase().includes(query))
    );
    
    // Search in folder names
    const matchingFolders = folders.filter(
      (folder) => folder.name.toLowerCase().includes(query)
    );
    
    return { filteredSongs: matchingSongs, filteredFolders: matchingFolders };
  }, [currentSongs, folders, songs, searchQuery]);

  const handleFolderClick = (folderPath: string) => {
    const newPath = folderPath.split('/');
    setCurrentPath(newPath);
    setSearchQuery('');
  };

  const handleBack = () => {
    setCurrentPath((prev) => prev.slice(0, -1));
    setSearchQuery('');
  };

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

  return (
    <div className="folder-tree">
      <div className="folder-tree__header">
        <div className="folder-tree__actions">
          <Input
            placeholder="חיפוש..."
            contentBefore={<Search24Regular />}
            value={searchQuery}
            onChange={(_, data) => setSearchQuery(data.value)}
            className="folder-tree__search"
          />
          {filteredSongs.length > 0 && (
            <Button appearance="primary" icon={<Play24Filled />} onClick={handlePlayAll}>
              נגן הכל
            </Button>
          )}
        </div>
        <div className="folder-tree__nav">
          {currentPath.length > 0 && (
            <Button
              appearance="subtle"
              icon={<ArrowLeft24Regular />}
              onClick={handleBack}
            >
              חזור
            </Button>
          )}
          <span className="folder-tree__path">
            {currentPath.length === 0 ? 'תיקייה ראשית' : currentPath.join(' / ')}
          </span>
        </div>
      </div>

      <div className="folder-tree__content">
        {/* Show folders */}
        {filteredFolders.map((folder) => (
          <div
            key={folder.path}
            className="song-item song-item--folder"
            onClick={() => handleFolderClick(folder.path)}
          >
            <div className="song-item__cover song-item__cover--folder">
              <Folder24Regular />
            </div>
            <div className="song-item__info">
              <span className="song-item__title">{folder.name}</span>
              <span className="song-item__artist">
                {folder.songCount} {folder.songCount === 1 ? 'שיר' : 'שירים'}
              </span>
            </div>
            <span className="song-item__duration"></span>
            <div className="song-item__menu"></div>
          </div>
        ))}

        {/* Show songs */}
        {filteredSongs.length === 0 && filteredFolders.length === 0 ? (
          <div className="folder-tree__empty">
            <MusicNote224Regular />
            <p>{searchQuery ? 'לא נמצאו תוצאות' : 'אין שירים בתיקייה זו'}</p>
          </div>
        ) : (
          filteredSongs.map((song, index) => (
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

              <Menu>
                <MenuTrigger disableButtonEnhancement>
                  <Button
                    appearance="subtle"
                    icon={<MoreVertical24Regular />}
                    onClick={(e) => e.stopPropagation()}
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
                    <MenuDivider />
                    <MenuItem
                      icon={<Cut24Regular />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenRingtone?.(song);
                      }}
                    >
                      צור רינגטון
                    </MenuItem>
                    <MenuItem
                      icon={<Tag24Regular />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenMetadata?.(song);
                      }}
                    >
                      ערוך תגיות
                    </MenuItem>
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}
