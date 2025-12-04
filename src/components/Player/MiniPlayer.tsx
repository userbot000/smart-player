import { useEffect, useState } from 'react';
import {
  Play24Filled, Pause24Filled, Previous24Filled, Next24Filled,
  Speaker224Filled, SpeakerMute24Filled,
  MusicNote224Regular,
  Maximize24Regular,
} from '@fluentui/react-icons';
import { Slider, Tooltip, Button } from '@fluentui/react-components';
import { formatTime } from '../../utils/formatTime';
import './MiniPlayer.css';

interface SongInfo {
  id: string;
  title: string;
  artist: string;
  coverUrl?: string;
}

interface PlayerState {
  currentSong: SongInfo | null;
  isPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;
}

export function MiniPlayer() {
  const [state, setState] = useState<PlayerState>({
    currentSong: null,
    isPlaying: false,
    volume: 0.7,
    progress: 0,
    duration: 0,
  });

  // Listen for state updates from main window
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setup = async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        
        // Listen for player state sync from main window
        unlisten = await listen<PlayerState>('player-state-sync', (event) => {
          setState(event.payload);
        });

        // Request initial state
        const { emit } = await import('@tauri-apps/api/event');
        await emit('request-player-state');
      } catch (error) {
        console.error('Error setting up listeners:', error);
      }
    };

    setup();
    return () => { unlisten?.(); };
  }, []);

  // Send command to main window
  const sendCommand = async (command: string, data?: unknown) => {
    try {
      const { emit } = await import('@tauri-apps/api/event');
      await emit('player-command', { command, data });
    } catch (error) {
      console.error('Error sending command:', error);
    }
  };

  const handleBackToMain = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('switch_to_main_window');
    } catch (error) {
      console.error('Error switching to main window:', error);
    }
  };

  // Enable window dragging
  useEffect(() => {
    const setupDrag = async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const appWindow = getCurrentWindow();
        
        const dragArea = document.querySelector('.mini-player__drag-area');
        if (dragArea) {
          dragArea.addEventListener('mousedown', () => {
            appWindow.startDragging();
          });
        }
      } catch {
        // Not in Tauri environment
      }
    };
    setupDrag();
  }, []);

  const { currentSong, isPlaying, volume, progress, duration } = state;

  if (!currentSong) {
    return (
      <div className="mini-player mini-player--empty">
        <div className="mini-player__drag-area" />
        <p>אין שיר מתנגן</p>
        <Button appearance="subtle" icon={<Maximize24Regular />} onClick={handleBackToMain}>
          חזרה לאפליקציה
        </Button>
      </div>
    );
  }

  return (
    <div className="mini-player">
      <div className="mini-player__drag-area" />
      
      <div className="mini-player__content">
        <div className="mini-player__cover">
          {currentSong.coverUrl ? (
            <img src={currentSong.coverUrl} alt={currentSong.title} />
          ) : (
            <MusicNote224Regular />
          )}
        </div>

        <div className="mini-player__info">
          <span className="mini-player__title">{currentSong.title}</span>
          <span className="mini-player__artist">{currentSong.artist}</span>
        </div>

        <div className="mini-player__controls">
          <Button 
            appearance="subtle" 
            icon={<Previous24Filled />} 
            onClick={() => sendCommand('prev')} 
            size="small" 
          />
          <Button
            appearance="primary"
            icon={isPlaying ? <Pause24Filled /> : <Play24Filled />}
            onClick={() => sendCommand('togglePlay')}
            className="mini-player__play-btn"
          />
          <Button 
            appearance="subtle" 
            icon={<Next24Filled />} 
            onClick={() => sendCommand('next')} 
            size="small" 
          />
        </div>

        <div className="mini-player__progress">
          <Slider
            min={0}
            max={duration || 100}
            value={progress}
            onChange={(_, data) => sendCommand('seek', data.value)}
            className="mini-player__slider"
          />
          <span className="mini-player__time">{formatTime(progress)} / {formatTime(duration)}</span>
        </div>

        <div className="mini-player__volume">
          <Tooltip content={`${Math.round(volume * 100)}%`} relationship="label">
            <Button
              appearance="subtle"
              icon={volume === 0 ? <SpeakerMute24Filled /> : <Speaker224Filled />}
              onClick={() => sendCommand('setVolume', volume === 0 ? 0.7 : 0)}
              size="small"
            />
          </Tooltip>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(_, data) => sendCommand('setVolume', data.value)}
            className="mini-player__volume-slider"
          />
        </div>

        <Tooltip content="חזרה לאפליקציה" relationship="label">
          <Button
            appearance="subtle"
            icon={<Maximize24Regular />}
            onClick={handleBackToMain}
            size="small"
          />
        </Tooltip>
      </div>
    </div>
  );
}
