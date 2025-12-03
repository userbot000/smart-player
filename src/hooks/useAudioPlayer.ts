import { useEffect, useRef, useCallback } from 'react';
import { Howl } from 'howler';
import { usePlayerStore } from '../store/playerStore';
import { incrementPlayCount, revokeAudioUrl, createAudioUrl } from '../db/database';

export function useAudioPlayer() {
  const howlRef = useRef<Howl | null>(null);
  const currentSongIdRef = useRef<string | null>(null);
  const previousSongIdRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);

  const currentSong = usePlayerStore((state) => state.currentSong);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const volume = usePlayerStore((state) => state.volume);
  const setPlaying = usePlayerStore((state) => state.setPlaying);
  const setProgress = usePlayerStore((state) => state.setProgress);
  const setDuration = usePlayerStore((state) => state.setDuration);
  const setError = usePlayerStore((state) => state.setError);
  const nextSong = usePlayerStore((state) => state.nextSong);

  // Update progress loop
  const updateProgress = useCallback(() => {
    if (howlRef.current && howlRef.current.playing()) {
      setProgress(howlRef.current.seek() as number);
      requestAnimationFrame(updateProgress);
    }
  }, [setProgress]);

  // Create Howl instance when song changes
  useEffect(() => {
    if (!currentSong) return;

    // Skip if same song
    if (currentSongIdRef.current === currentSong.id) return;
    
    // Store previous song ID for cleanup
    previousSongIdRef.current = currentSongIdRef.current;
    currentSongIdRef.current = currentSong.id;

    // Cleanup previous instance
    if (howlRef.current) {
      howlRef.current.unload();
      howlRef.current = null;
    }

    // Release memory from previous song's blob URL (keep some in cache for quick switching)
    // Only revoke URLs that are definitely not needed anymore
    if (previousSongIdRef.current) {
      const prevId = previousSongIdRef.current;
      // Longer delay and more careful cleanup
      setTimeout(() => {
        const { queue, queueIndex, currentSong: nowPlaying } = usePlayerStore.getState();
        
        // Don't revoke if it's the currently playing song
        if (nowPlaying?.id === prevId) return;
        
        // Don't revoke if it's in the nearby queue (prev/next songs)
        const nearbyIndices = [queueIndex - 1, queueIndex, queueIndex + 1];
        const nearbySongIds = nearbyIndices
          .filter(i => i >= 0 && i < queue.length)
          .map(i => queue[i]?.id);
        
        if (!nearbySongIds.includes(prevId)) {
          revokeAudioUrl(prevId);
        }
      }, 10000); // Increased to 10 seconds
    }

    isLoadingRef.current = true;
    setError(null); // Clear previous errors

    const initialVolume = usePlayerStore.getState().volume;
    const songId = currentSong.id; // Capture for closure
    
    // Ensure we have a valid audio URL (recreate if needed)
    const audioUrl = currentSong.filePath || createAudioUrl(currentSong);
    
    if (!audioUrl) {
      console.error('No audio URL available for song:', currentSong.title);
      setError('לא נמצא קובץ אודיו לשיר זה');
      isLoadingRef.current = false;
      return;
    }

    const howl = new Howl({
      src: [audioUrl],
      format: ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac'],
      html5: true,
      volume: initialVolume,
      preload: true,
      onload: () => {
        isLoadingRef.current = false;
        setDuration(howl.duration() || 0);

        // Auto-play if isPlaying is true
        if (usePlayerStore.getState().isPlaying) {
          howl.play();
        }
      },
      onplay: () => {
        incrementPlayCount(songId);
        updateProgress();
      },
      onend: () => {
        nextSong();
      },
      onloaderror: (_, error) => {
        console.error('Audio load error:', error, 'URL:', audioUrl);
        isLoadingRef.current = false;
        
        // Try to recreate the blob URL if it might have been revoked
        if (currentSong.audioData) {
          console.log('Attempting to recreate audio URL...');
          const newUrl = createAudioUrl(currentSong);
          if (newUrl && newUrl !== audioUrl) {
            // Update the song's filePath and retry
            currentSong.filePath = newUrl;
            currentSongIdRef.current = null; // Force reload
            return;
          }
        }
        
        setPlaying(false);
        setError('לא ניתן לטעון את הקובץ. ייתכן שהקובץ פגום או בפורמט לא נתמך.');
      },
      onplayerror: (_, error) => {
        console.error('Audio play error:', error);
        setError('שגיאה בהפעלת השיר. מנסה שוב...');
        howl.once('unlock', () => {
          setError(null);
          howl.play();
        });
      },
    });

    howlRef.current = howl;

    return () => {
      howl.unload();
    };
  }, [currentSong, nextSong, setDuration, setPlaying, setError, updateProgress]);

  // Handle play/pause toggle
  useEffect(() => {
    if (!howlRef.current || isLoadingRef.current) return;

    if (isPlaying && !howlRef.current.playing()) {
      howlRef.current.play();
    } else if (!isPlaying && howlRef.current.playing()) {
      howlRef.current.pause();
    }
  }, [isPlaying]);

  // Handle volume changes - just update the existing Howl instance
  useEffect(() => {
    if (howlRef.current) {
      howlRef.current.volume(volume);
    }
  }, [volume]);

  // Seek function - now checks if audio is ready
  const seek = useCallback(
    (time: number) => {
      if (howlRef.current && !isLoadingRef.current) {
        howlRef.current.seek(time);
        setProgress(time);
      }
    },
    [setProgress]
  );

  const isReady = !isLoadingRef.current && howlRef.current !== null;

  return { seek, isReady };
}
