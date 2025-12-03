import { useState, useRef } from 'react';
import {
  Play24Filled, Pause24Filled, Previous24Filled, Next24Filled,
  Speaker224Filled, SpeakerMute24Filled,
  ArrowRepeatAll24Regular, ArrowRepeatAll24Filled, ArrowRepeat124Filled,
  ArrowShuffle24Regular, ArrowShuffle24Filled,
  Sparkle24Regular, Sparkle24Filled,
  MusicNote224Regular,
  Warning24Regular
} from '@fluentui/react-icons';
import { Slider, Tooltip, Button, MessageBar, MessageBarBody } from '@fluentui/react-components';
import { usePlayerStore } from '../../store/playerStore';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { formatTime } from '../../utils/formatTime';
import './PlayerControls.css';

export function PlayerControls() {
  const {
    currentSong, isPlaying, volume, progress, duration,
    shuffle, repeat, smartQueue, error,
    togglePlay, setVolume, toggleShuffle, cycleRepeat, toggleSmartQueue,
    nextSong, prevSong, setError
  } = usePlayerStore();

  const { seek, isReady } = useAudioPlayer();
  
  // Track if user is dragging the progress slider
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);
  const seekTimeoutRef = useRef<number | null>(null);

  const handleProgressChange = (_: unknown, data: { value: number }) => {
    setDragValue(data.value);
    setIsDragging(true);
    
    // Debounce the actual seek to prevent multiple calls
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
    }
    
    seekTimeoutRef.current = window.setTimeout(() => {
      if (isReady) {
        seek(data.value);
      }
      setIsDragging(false);
    }, 100);
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

          <Button appearance="subtle" icon={<Previous24Filled />} onClick={prevSong} />

          <Button
            appearance="primary"
            icon={isPlaying ? <Pause24Filled /> : <Play24Filled />}
            onClick={togglePlay}
            className="player__play-btn"
          />

          <Button appearance="subtle" icon={<Next24Filled />} onClick={nextSong} />

          <Tooltip content={`חזרה: ${repeat === 'none' ? 'כבוי' : repeat === 'one' ? 'שיר' : 'הכל'}`} relationship="label">
            <Button
              appearance="subtle"
              icon={getRepeatIcon()}
              onClick={cycleRepeat}
              className={repeat !== 'none' ? 'active' : ''}
            />
          </Tooltip>
        </div>

        <div className="player__progress">
          <span className="player__time">{formatTime(isDragging ? dragValue : progress)}</span>
          <Slider
            min={0}
            max={duration || 100}
            value={isDragging ? dragValue : progress}
            onChange={handleProgressChange}
            className="player__slider"
          />
          <span className="player__time">{formatTime(duration)}</span>
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
    </div>
  );
}
