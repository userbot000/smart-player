import { useState, useEffect } from 'react';
import {
  Play24Filled, Pause24Filled, Previous24Filled, Next24Filled,
  Speaker224Filled, SpeakerMute24Filled,
  ArrowRepeatAll24Regular, ArrowRepeatAll24Filled, ArrowRepeat124Filled,
  ArrowShuffle24Regular, ArrowShuffle24Filled,
  Sparkle24Regular, Sparkle24Filled,
  MusicNote224Regular,
  Warning24Regular,
  Bookmark24Regular,
  Bookmark24Filled,
  Delete24Regular,
  TopSpeed24Regular,
  ArrowMinimize24Regular,
} from '@fluentui/react-icons';
import { Slider, Tooltip, Button, MessageBar, MessageBarBody, Menu, MenuTrigger, MenuPopover, MenuList, MenuItem } from '@fluentui/react-components';
import { usePlayerStore } from '../../store/playerStore';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { formatTime } from '../../utils/formatTime';
import { getBookmarks, addBookmark, removeBookmark, Bookmark } from '../../db/bookmarks';
import './PlayerControls.css';

export function PlayerControls() {
  const {
    currentSong, isPlaying, volume, progress, duration,
    shuffle, repeat, smartQueue, error, playbackRate,
    togglePlay, setVolume, toggleShuffle, cycleRepeat, toggleSmartQueue,
    nextSong, prevSong, setError, setPlaybackRate
  } = usePlayerStore();

  const { seek, isReady } = useAudioPlayer();
  
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);

  useEffect(() => {
    if (currentSong) {
      getBookmarks(currentSong.id).then(setBookmarks);
    }
  }, [currentSong]);

  const handleAddBookmark = async () => {
    if (currentSong) {
      await addBookmark(currentSong.id, progress);
      const updated = await getBookmarks(currentSong.id);
      setBookmarks(updated);
    }
  };

  const handleRemoveBookmark = async (id: string) => {
    await removeBookmark(id);
    if (currentSong) {
      const updated = await getBookmarks(currentSong.id);
      setBookmarks(updated);
    }
  };

  const handleJumpToBookmark = (timestamp: number) => {
    if (isReady) seek(timestamp);
  };

  const handleProgressChange = (_: unknown, data: { value: number }) => {
    if (isReady) seek(data.value);
  };
  const handleVolumeChange = (_: unknown, data: { value: number }) => setVolume(data.value);

  const getRepeatIcon = () => {
    if (repeat === 'one') return <ArrowRepeat124Filled />;
    if (repeat === 'all') return <ArrowRepeatAll24Filled />;
    return <ArrowRepeatAll24Regular />;
  };

  if (!currentSong) {
    return (
      <div className="player player--empty">
        <p>בחר שיר להתחיל לנגן</p>
      </div>
    );
  }

  return (
    <div className="player">
      {error && (
        <div className="player__error">
          <MessageBar intent="warning" onClick={() => setError(null)}>
            <MessageBarBody>
              <Warning24Regular /> {error}
            </MessageBarBody>
          </MessageBar>
        </div>
      )}
      <div className="player__song">
        <div className="player__cover">
          {currentSong.coverUrl ? (
            <img src={currentSong.coverUrl} alt={currentSong.title} className="player__cover-img" />
          ) : (
            <MusicNote224Regular />
          )}
        </div>
        <div className="player__info">
          <span className="player__title">{currentSong.title}</span>
          <span className="player__artist">{currentSong.artist}</span>
        </div>
      </div>

      <div className="player__main">
        <div className="player__buttons">
          <Tooltip content={smartQueue ? 'תור חכם פעיל' : 'תור חכם כבוי'} relationship="label">
            <Button
              appearance="subtle"
              icon={smartQueue ? <Sparkle24Filled /> : <Sparkle24Regular />}
              onClick={toggleSmartQueue}
              className={smartQueue ? 'active' : ''}
            />
          </Tooltip>

          <Tooltip content="ערבוב" relationship="label">
            <Button
              appearance="subtle"
              icon={shuffle ? <ArrowShuffle24Filled /> : <ArrowShuffle24Regular />}
              onClick={toggleShuffle}
              className={shuffle ? 'active' : ''}
            />
          </Tooltip>

          <Button appearance="subtle" icon={<Previous24Filled />} onClick={nextSong} />

          <Button
            appearance="primary"
            icon={isPlaying ? <Pause24Filled /> : <Play24Filled />}
            onClick={togglePlay}
            className="player__play-btn"
          />

          <Button appearance="subtle" icon={<Next24Filled />} onClick={prevSong} />

          <Tooltip content={`חזרה: ${repeat === 'none' ? 'כבוי' : repeat === 'one' ? 'שיר' : 'הכל'}`} relationship="label">
            <Button
              appearance="subtle"
              icon={getRepeatIcon()}
              onClick={cycleRepeat}
              className={repeat !== 'none' ? 'active' : ''}
            />
          </Tooltip>

          <Tooltip content="הוסף סימנייה" relationship="label">
            <Button
              appearance="subtle"
              icon={bookmarks.length > 0 ? <Bookmark24Filled /> : <Bookmark24Regular />}
              onClick={() => setShowBookmarks(!showBookmarks)}
              onDoubleClick={handleAddBookmark}
              className={bookmarks.length > 0 ? 'active' : ''}
            />
          </Tooltip>

          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <Tooltip content={`מהירות: ${playbackRate}x`} relationship="label">
                <Button
                  appearance="subtle"
                  icon={<TopSpeed24Regular />}
                  className={playbackRate !== 1 ? 'active' : ''}
                />
              </Tooltip>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem onClick={() => setPlaybackRate(0.5)}>0.5x איטי</MenuItem>
                <MenuItem onClick={() => setPlaybackRate(0.75)}>0.75x</MenuItem>
                <MenuItem onClick={() => setPlaybackRate(1)}>1x רגיל</MenuItem>
                <MenuItem onClick={() => setPlaybackRate(1.25)}>1.25x</MenuItem>
                <MenuItem onClick={() => setPlaybackRate(1.5)}>1.5x מהיר</MenuItem>
                <MenuItem onClick={() => setPlaybackRate(1.75)}>1.75x</MenuItem>
                <MenuItem onClick={() => setPlaybackRate(2)}>2x מהיר מאוד</MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        </div>

        {showBookmarks && bookmarks.length > 0 && (
          <div className="player__bookmarks">
            {bookmarks.map(b => (
              <div key={b.id} className="player__bookmark">
                <button 
                  className="player__bookmark-time"
                  onClick={() => handleJumpToBookmark(b.timestamp)}
                >
                  {b.label}
                </button>
                <button 
                  className="player__bookmark-delete"
                  onClick={() => handleRemoveBookmark(b.id)}
                >
                  <Delete24Regular />
                </button>
              </div>
            ))}
            <button className="player__bookmark-add" onClick={handleAddBookmark}>
              + הוסף סימנייה
            </button>
          </div>
        )}

        <div className="player__progress">
          <span className="player__time">{formatTime(duration)}</span>
          <Slider
            min={0}
            max={duration || 100}
            value={progress}
            onChange={handleProgressChange}
            className="player__slider"
          />
          <span className="player__time">{formatTime(progress)}</span>
        </div>
      </div>

      <div className="player__volume">
        <Tooltip content={`${Math.round(volume * 100)}%`} relationship="label">
          <Button
            appearance="subtle"
            icon={volume === 0 ? <SpeakerMute24Filled /> : <Speaker224Filled />}
            onClick={() => setVolume(volume === 0 ? 0.7 : 0)}
          />
        </Tooltip>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={handleVolumeChange}
          className="player__volume-slider"
        />
        <span className="player__volume-percent">{Math.round(volume * 100)}%</span>
      </div>

      <Tooltip content="מצב מיני" relationship="label">
        <Button
          appearance="subtle"
          icon={<ArrowMinimize24Regular />}
          onClick={async () => {
            try {
              const { invoke } = await import('@tauri-apps/api/core');
              await invoke('switch_to_mini_player');
            } catch (error) {
              console.error('Error switching to mini player:', error);
            }
          }}
          className="player__mini-btn"
        />
      </Tooltip>
    </div>
  );
}
