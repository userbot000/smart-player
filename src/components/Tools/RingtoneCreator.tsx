import { useState, useRef, useEffect } from 'react';
import {
  Button,
  Input,
  Label,
  Slider,
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
}

export function RingtoneCreator({ songs }: RingtoneCreatorProps) {
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [ringtoneTitle, setRingtoneTitle] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { showSuccess, showError } = useToast();

  // Update end time when song changes
  useEffect(() => {
    if (selectedSong) {
      const maxDuration = Math.min(selectedSong.duration, 30);
      setEndTime(maxDuration);
      setStartTime(0);
      setRingtoneTitle(`${selectedSong.title} - רינגטון`);
    }
  }, [selectedSong]);

  // Handle audio playback
  useEffect(() => {
    if (!audioRef.current || !selectedSong) return;

    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      // Stop at end time
      if (audio.currentTime >= endTime) {
        audio.pause();
        audio.currentTime = startTime;
        setIsPlaying(false);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
  }, [startTime, endTime, selectedSong]);

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

  const handleStartChange = (_: unknown, data: { value: number }) => {
    const newStart = data.value;
    setStartTime(newStart);
    if (newStart >= endTime) {
      setEndTime(Math.min(newStart + 5, selectedSong?.duration || 30));
    }
  };

  const handleEndChange = (_: unknown, data: { value: number }) => {
    const newEnd = data.value;
    setEndTime(newEnd);
    if (newEnd <= startTime) {
      setStartTime(Math.max(newEnd - 5, 0));
    }
  };

  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRingtone = async () => {
    if (!selectedSong || !selectedSong.audioData) {
      showError('לא נמצא קובץ אודיו לשיר זה');
      return;
    }

    setIsCreating(true);

    try {
      // Cut the audio and save as WAV file
      await createRingtone(
        selectedSong.audioData,
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

  const duration = selectedSong?.duration || 100;
  const clipDuration = endTime - startTime;

  return (
    <div className="ringtone-creator">
      <div className="ringtone-creator__section">
        <Label>בחר שיר</Label>
        <Combobox
          placeholder="חפש שיר..."
          onOptionSelect={(_, data) => handleSongSelect(data.optionValue || '')}
          className="ringtone-creator__select"
        >
          {songs.map((song) => (
            <Option key={song.id} value={song.id} text={`${song.title} - ${song.artist}`}>
              {song.title} - {song.artist}
            </Option>
          ))}
        </Combobox>
      </div>

      {selectedSong && (
        <>
          <audio ref={audioRef} src={selectedSong.filePath} preload="metadata" />

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

            <div className="ringtone-creator__sliders">
              <div className="ringtone-creator__slider">
                <Text size={200}>התחלה</Text>
                <Slider
                  min={0}
                  max={duration}
                  value={startTime}
                  onChange={handleStartChange}
                />
                <Text size={200}>{formatTime(startTime)}</Text>
              </div>

              <div className="ringtone-creator__slider">
                <Text size={200}>סיום</Text>
                <Slider
                  min={0}
                  max={duration}
                  value={endTime}
                  onChange={handleEndChange}
                />
                <Text size={200}>{formatTime(endTime)}</Text>
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

            <div className="ringtone-creator__progress">
              <div
                className="ringtone-creator__progress-bar"
                style={{ width: `${((currentTime - startTime) / clipDuration) * 100}%` }}
              />
            </div>
          </div>

          <div className="ringtone-creator__actions">
            <Button
              appearance="primary"
              icon={<Cut24Regular />}
              onClick={handleCreateRingtone}
              disabled={clipDuration < 1 || isCreating}
            >
              {isCreating ? 'יוצר...' : 'צור רינגטון'}
            </Button>
            <Text size={200} className="ringtone-creator__hint">
              * הרינגטון יישמר כקובץ WAV
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
          margin-bottom: var(--space-sm);
        }
        .ringtone-creator__sliders {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }
        .ringtone-creator__slider {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }
        .ringtone-creator__slider .fui-Slider {
          flex: 1;
        }
        .ringtone-creator__preview {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          margin-bottom: var(--space-lg);
          padding: var(--space-md);
          background: var(--surface-hover);
          border-radius: var(--radius-md);
        }
        .ringtone-creator__progress {
          flex: 1;
          height: 4px;
          background: var(--border-subtle);
          border-radius: 2px;
          overflow: hidden;
        }
        .ringtone-creator__progress-bar {
          height: 100%;
          background: var(--color-primary);
          transition: width 0.1s;
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
