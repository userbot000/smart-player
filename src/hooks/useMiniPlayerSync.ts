import { useEffect, useCallback } from 'react';
import { usePlayerStore } from '../store/playerStore';

interface PlayerCommand {
  command: string;
  data?: unknown;
}

export function useMiniPlayerSync(seek: (time: number) => void) {
  const {
    currentSong,
    isPlaying,
    volume,
    progress,
    duration,
    togglePlay,
    setVolume,
    nextSong,
    prevSong,
  } = usePlayerStore();

  // Send state to mini player
  const syncState = useCallback(async () => {
    try {
      const { emit } = await import('@tauri-apps/api/event');
      await emit('player-state-sync', {
        currentSong: currentSong ? {
          id: currentSong.id,
          title: currentSong.title,
          artist: currentSong.artist,
          coverUrl: currentSong.coverUrl,
        } : null,
        isPlaying,
        volume,
        progress,
        duration,
      });
    } catch {
      // Not in Tauri environment
    }
  }, [currentSong, isPlaying, volume, progress, duration]);

  // Sync state periodically and on changes
  useEffect(() => {
    syncState();
  }, [syncState]);

  // Also sync progress more frequently
  useEffect(() => {
    const interval = setInterval(syncState, 500);
    return () => clearInterval(interval);
  }, [syncState]);

  // Listen for commands from mini player
  useEffect(() => {
    let unlisten1: (() => void) | undefined;
    let unlisten2: (() => void) | undefined;

    const setup = async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');

        // Listen for state request
        unlisten1 = await listen('request-player-state', () => {
          syncState();
        });

        // Listen for commands
        unlisten2 = await listen<PlayerCommand>('player-command', (event) => {
          const { command, data } = event.payload;
          
          switch (command) {
            case 'togglePlay':
              togglePlay();
              break;
            case 'next':
              nextSong();
              break;
            case 'prev':
              prevSong();
              break;
            case 'setVolume':
              setVolume(data as number);
              break;
            case 'seek':
              seek(data as number);
              break;
          }
        });
      } catch {
        // Not in Tauri environment
      }
    };

    setup();

    return () => {
      unlisten1?.();
      unlisten2?.();
    };
  }, [togglePlay, nextSong, prevSong, setVolume, seek, syncState]);
}
