import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Button,
  Input,
  Label,
  Text,
  Combobox,
  Option,
} from '@fluentui/react-components';
import {
  Play24Filled,
  Pause24Filled,
  Cut24Regular,
} from '@fluentui/react-icons';
import { Song } from '../../types';
import { formatTime } from '../../utils/formatTime';
import { useToast } from '../Toast/ToastProvider';
import { createRingtone } from '../../utils/audioProcessor';

interface RingtoneCreatorProps {
  songs: Song[];
  initialSong?: Song;
}

export function RingtoneCreator({ songs, initialSong }: RingtoneCreatorProps) {
  const [selectedSong, setSelectedSong] = useState<Song | null>(initialSong || null);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [ringtoneTitle, setRingtoneTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [dragging, setDragging] = useState<'start' | 'end' | 'range' | null>(null);
  const [loadedAudioData, setLoadedAudioData] = useState<ArrayBuffer | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rangeRef = useRef<HTMLDivElement | null>(null);
  const dragStartX = useRef(0);
  const dragStartValue = useRef({ start: 0, end: 0 });
  const { showSuccess, showError } = useToast();

  const duration = selectedSong?.duration || 100;
  const clipDuration = endTime - startTime;

  // Set initial song if provided
  useEffect(() => {
    if (initialSong && !selectedSong) {
      setSelectedSong(initialSong);
    }
  }, [initialSong]);

  // Update end time when song changes
  useEffect(() => {
    if (selectedSong) {
      const maxDuration = Math.min(selectedSong.duration, 30);
      setEndTime(maxDuration);
      setStartTime(0);
      setRingtoneTitle(`${selectedSong.title} - רינגטון`);
    }
  }, [selectedSong]);

  // Load audio URL and data when song changes
  useEffect(() => {
    if (!selectedSong || !audioRef.current) return;

    let cancelled = false;

    const loadAudio = async () => {
      if (!audioRef.current) return;
      
      // Load audio data for ringtone creation
      let audioData: ArrayBuffer | null = null;
      
      if (selectedSong.audioData) {
        audioData = selectedSong.audioData;
      } else if (selectedSong.originalPath) {
        try {
          const { readAudioFile } = await import('../../db/database');
          audioData = await readAudioFile(selectedSong.originalPath);
          
          if (!audioData) {
            console.warn('Failed to load audio data for:', selectedSong.originalPath);
            showError('לא ניתן לטעון את קובץ האודיו. נסה לבחור שיר אחר.');
          }
        } catch (err) {
          console.error('Failed to load audio data:', err);
          showError('שגיאה בטעינת קובץ האודיו');
        }
      }
      
      if (!cancelled) {
        setLoadedAudioData(audioData);
      }
      
      // Get audio URL for playback
      const { createAudioUrlAsync } = await import('../../db/database');
      const url = await createAudioUrlAsync(selectedSong);
      
      if (url && audioRef.current && !cancelled) {
        audioRef.current.src = url;
        audioRef.current.load();
      }
    };

    loadAudio();

    return () => {
      cancelled = true;
    };
  }, [selectedSong, showError]);

  // Handle audio playback
  useEffect(() => {
    if (!audioRef.current || !selectedSong) return;

    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.currentTime >= endTime) {
        audio.pause();
        audio.currentTime = startTime;
        setIsPlaying(false);
      }
    };

    const handleLoadedMetadata = () => {
      // Update duration if it was unknown
      if (audio.duration && audio.duration !== Infinity) {
        setSelectedSong(prev => prev ? { ...prev, duration: audio.duration } : null);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [startTime, endTime, selectedSong]);


  // Convert pixel position to time
  const positionToTime = useCallback((clientX: number): number => {
    if (!rangeRef.current) return 0;
    const rect = rangeRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return percent * duration;
  }, [duration]);

  // Handle mouse/touch drag
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent, type: 'start' | 'end' | 'range') => {
    e.preventDefault();
    setDragging(type);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    dragStartX.current = clientX;
    dragStartValue.current = { start: startTime, end: endTime };
  }, [startTime, endTime]);

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragging || !rangeRef.current) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const rect = rangeRef.current.getBoundingClientRect();
    const deltaPercent = (clientX - dragStartX.current) / rect.width;
    const deltaTime = deltaPercent * duration;

    if (dragging === 'start') {
      const newStart = Math.max(0, Math.min(endTime - 1, dragStartValue.current.start + deltaTime));
      setStartTime(newStart);
    } else if (dragging === 'end') {
      const newEnd = Math.max(startTime + 1, Math.min(duration, dragStartValue.current.end + deltaTime));
      setEndTime(newEnd);
    } else if (dragging === 'range') {
      const rangeDuration = dragStartValue.current.end - dragStartValue.current.start;
      let newStart = dragStartValue.current.start + deltaTime;
      let newEnd = dragStartValue.current.end + deltaTime;

      if (newStart < 0) {
        newStart = 0;
        newEnd = rangeDuration;
      }
      if (newEnd > duration) {
        newEnd = duration;
        newStart = duration - rangeDuration;
      }

      setStartTime(newStart);
      setEndTime(newEnd);
    }
  }, [dragging, duration, startTime, endTime]);

  const handleDragEnd = useCallback(() => {
    setDragging(null);
  }, []);

  // Add/remove global event listeners for dragging
  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [dragging, handleDragMove, handleDragEnd]);

  // Click on track to set position
  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    if (dragging) return;
    const time = positionToTime(e.clientX);
    // Click closer to start or end?
    const distToStart = Math.abs(time - startTime);
    const distToEnd = Math.abs(time - endTime);
    if (distToStart < distToEnd) {
      setStartTime(Math.min(time, endTime - 1));
    } else {
      setEndTime(Math.max(time, startTime + 1));
    }
  }, [dragging, positionToTime, startTime, endTime]);

  const handleSongSelect = (songId: string) => {
    const song = songs.find((s) => s.id === songId);
    if (song) {
      setSelectedSong(song);
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.currentTime = startTime;
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleCreateRingtone = async () => {
    if (!selectedSong) {
      showError('לא נבחר שיר');
      return;
    }

    if (!loadedAudioData) {
      showError('נתוני האודיו לא נטענו. נסה לבחור שיר אחר.');
      return;
    }

    setIsCreating(true);

    try {
      await createRingtone(
        loadedAudioData,
        startTime,
        endTime,
        `${ringtoneTitle}.wav`
      );

      showSuccess(`רינגטון "${ringtoneTitle}" נוצר בהצלחה!`);
    } catch (error) {
      console.error('Error creating ringtone:', error);
      showError('שגיאה ביצירת הרינגטון');
    } finally {
      setIsCreating(false);
    }
  };

  const startPercent = (startTime / duration) * 100;
  const endPercent = (endTime / duration) * 100;
  const playheadPercent = ((currentTime - startTime) / clipDuration) * 100;


  const handleFileSelect = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Audio',
          extensions: ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac']
        }]
      });

      if (selected && typeof selected === 'string') {
        // Create temporary song object
        const fileName = selected.split(/[/\\]/).pop() || 'Unknown';
        
        // Try to load metadata from file
        let title = fileName.replace(/\.[^.]+$/, '');
        let duration = 180; // Default
        
        try {
          const { readAudioFile } = await import('../../db/database');
          const { extractMetadataFromBuffer } = await import('../../utils/audioMetadata');
          
          const audioData = await readAudioFile(selected);
          if (audioData) {
            const meta = await extractMetadataFromBuffer(audioData, fileName);
            title = meta.title || title;
            duration = meta.duration || duration;
          }
        } catch (err) {
          console.warn('Could not extract metadata:', err);
        }
        
        const tempSong: Song = {
          id: 'temp-' + Date.now(),
          title,
          artist: 'קובץ מקומי',
          duration,
          filePath: selected,
          originalPath: selected,
          addedAt: Date.now(),
          playCount: 0,
          isFavorite: false,
        };
        setSelectedSong(tempSong);
      }
    } catch (error) {
      showError('שגיאה בבחירת קובץ');
    }
  };

  return (
    <div className="ringtone-creator">
      <div className="ringtone-creator__section">
        <Label>בחר שיר</Label>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <Combobox
            placeholder="חפש שיר מהספרייה..."
            onOptionSelect={(_, data) => handleSongSelect(data.optionValue || '')}
            className="ringtone-creator__select"
            style={{ flex: 1 }}
          >
            {songs.map((song) => (
              <Option key={song.id} value={song.id} text={`${song.title} - ${song.artist}`}>
                {song.title} - {song.artist}
              </Option>
            ))}
          </Combobox>
          <Button appearance="secondary" onClick={handleFileSelect}>
            בחר קובץ מהמחשב
          </Button>
        </div>
      </div>

      {selectedSong && (
        <>
          <audio ref={audioRef} preload="metadata" />
          
          {!loadedAudioData && (
            <div style={{ padding: '12px', background: 'var(--surface-secondary)', borderRadius: '8px', marginBottom: '16px', color: 'var(--text-secondary)' }}>
              ⚠️ טוען נתוני אודיו... אם זה לוקח זמן רב, נסה לבחור שיר אחר.
            </div>
          )}

          <div className="ringtone-creator__section">
            <Label>שם הרינגטון</Label>
            <Input
              value={ringtoneTitle}
              onChange={(_, data) => setRingtoneTitle(data.value)}
              placeholder="שם הרינגטון"
            />
          </div>

          <div className="ringtone-creator__section">
            <div className="ringtone-creator__time-header">
              <Label>טווח חיתוך</Label>
              <Text size={200}>
                {formatTime(startTime)} - {formatTime(endTime)} ({formatTime(clipDuration)})
              </Text>
            </div>

            {/* Range Slider */}
            <div
              ref={rangeRef}
              className="range-slider"
              onClick={handleTrackClick}
            >
              {/* Track background */}
              <div className="range-slider__track" />

              {/* Selected range (blue bar) */}
              <div
                className="range-slider__range"
                style={{
                  left: `${startPercent}%`,
                  width: `${endPercent - startPercent}%`
                }}
                onMouseDown={(e) => handleDragStart(e, 'range')}
                onTouchStart={(e) => handleDragStart(e, 'range')}
              />

              {/* Playhead indicator */}
              {isPlaying && (
                <div
                  className="range-slider__playhead"
                  style={{ left: `${startPercent + (playheadPercent * (endPercent - startPercent) / 100)}%` }}
                />
              )}

              {/* Start handle */}
              <div
                className="range-slider__handle range-slider__handle--start"
                style={{ left: `${startPercent}%` }}
                onMouseDown={(e) => handleDragStart(e, 'start')}
                onTouchStart={(e) => handleDragStart(e, 'start')}
              />

              {/* End handle */}
              <div
                className="range-slider__handle range-slider__handle--end"
                style={{ left: `${endPercent}%` }}
                onMouseDown={(e) => handleDragStart(e, 'end')}
                onTouchStart={(e) => handleDragStart(e, 'end')}
              />

              {/* Time markers */}
              <div className="range-slider__markers">
                <span>0:00</span>
                <span>{formatTime(duration / 2)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          <div className="ringtone-creator__preview">
            <Button
              appearance="outline"
              icon={isPlaying ? <Pause24Filled /> : <Play24Filled />}
              onClick={handlePlayPause}
            >
              {isPlaying ? 'עצור' : 'השמע קטע'}
            </Button>
          </div>

          <div className="ringtone-creator__actions">
            <Button
              appearance="primary"
              icon={<Cut24Regular />}
              onClick={handleCreateRingtone}
              disabled={clipDuration < 1 || isCreating || !loadedAudioData}
              title={!loadedAudioData ? 'נתוני האודיו לא נטענו' : ''}
            >
              {isCreating ? 'יוצר...' : 'צור רינגטון'}
            </Button>
            <Text size={200} className="ringtone-creator__hint">
              * גרור את הפס הכחול או את הידיות לבחירת הטווח
            </Text>
          </div>
        </>
      )}

      {!selectedSong && (
        <div className="ringtone-creator__empty">
          <Cut24Regular className="ringtone-creator__empty-icon" />
          <Text>בחר שיר כדי ליצור ממנו רינגטון</Text>
        </div>
      )}


      <style>{`
        .ringtone-creator__section {
          margin-bottom: var(--space-lg);
        }
        .ringtone-creator__select {
          width: 100%;
          margin-top: var(--space-xs);
        }
        .ringtone-creator__time-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-md);
        }
        
        /* Range Slider Styles */
        .range-slider {
          position: relative;
          height: 48px;
          margin: var(--space-md) 0;
          padding-top: 16px;
          cursor: pointer;
          user-select: none;
        }
        .range-slider__track {
          position: absolute;
          top: 16px;
          left: 0;
          right: 0;
          height: 16px;
          background: var(--surface-hover);
          border-radius: 8px;
        }
        .range-slider__range {
          position: absolute;
          top: 16px;
          height: 16px;
          background: var(--color-primary);
          border-radius: 8px;
          cursor: grab;
          transition: opacity 0.15s;
        }
        .range-slider__range:hover {
          opacity: 0.9;
        }
        .range-slider__range:active {
          cursor: grabbing;
        }
        .range-slider__handle {
          position: absolute;
          top: 10px;
          width: 8px;
          height: 28px;
          background: white;
          border: 2px solid var(--color-primary);
          border-radius: 4px;
          transform: translateX(-50%);
          cursor: ew-resize;
          z-index: 2;
          transition: transform 0.1s, box-shadow 0.1s;
        }
        .range-slider__handle:hover {
          transform: translateX(-50%) scale(1.1);
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .range-slider__handle:active {
          transform: translateX(-50%) scale(1.15);
        }
        .range-slider__playhead {
          position: absolute;
          top: 12px;
          width: 2px;
          height: 24px;
          background: white;
          border-radius: 1px;
          transform: translateX(-50%);
          z-index: 1;
          box-shadow: 0 0 4px rgba(0,0,0,0.3);
        }
        .range-slider__markers {
          position: absolute;
          top: 36px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: space-between;
          font-size: var(--font-size-xs);
          color: var(--text-secondary);
        }
        
        .ringtone-creator__preview {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          margin-bottom: var(--space-lg);
        }
        .ringtone-creator__actions {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }
        .ringtone-creator__hint {
          color: var(--text-secondary);
        }
        .ringtone-creator__empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-md);
          padding: var(--space-2xl);
          color: var(--text-secondary);
        }
        .ringtone-creator__empty-icon {
          font-size: 48px;
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}
