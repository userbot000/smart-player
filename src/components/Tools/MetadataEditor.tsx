import { useState } from 'react';
import {
  Button,
  Input,
  Label,
  Text,
  Combobox,
  Option,
} from '@fluentui/react-components';
import {
  Tag24Regular,
  MusicNote224Regular,
  Save24Regular,
} from '@fluentui/react-icons';
import { Song } from '../../types';
import { useToast } from '../Toast/ToastProvider';
import { updateAndSaveWithTags } from '../../utils/audioProcessor';

interface MetadataEditorProps {
  songs: Song[];
  onSongUpdated?: () => void;
}

interface EditableMetadata {
  title: string;
  artist: string;
  album: string;
  genre: string;
}

export function MetadataEditor({ songs }: MetadataEditorProps) {
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [metadata, setMetadata] = useState<EditableMetadata>({
    title: '',
    artist: '',
    album: '',
    genre: '',
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleSongSelect = (songId: string) => {
    const song = songs.find((s) => s.id === songId);
    if (song) {
      setSelectedSong(song);
      setMetadata({
        title: song.title,
        artist: song.artist,
        album: song.album || '',
        genre: song.genre || '',
      });
      setHasChanges(false);
    }
  };

  const handleFieldChange = (field: keyof EditableMetadata, value: string) => {
    setMetadata((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleReset = () => {
    if (selectedSong) {
      setMetadata({
        title: selectedSong.title,
        artist: selectedSong.artist,
        album: selectedSong.album || '',
        genre: selectedSong.genre || '',
      });
      setHasChanges(false);
    }
  };

  const handleExportWithTags = async () => {
    if (!selectedSong || !selectedSong.audioData) {
      showError('לא נמצא קובץ אודיו לשיר זה');
      return;
    }

    setIsSaving(true);

    try {
      const fileName = `${metadata.title} - ${metadata.artist}.mp3`;
      // Pass originalPath for Tauri to save to original file
      await updateAndSaveWithTags(
        selectedSong.audioData,
        metadata,
        fileName,
        selectedSong.originalPath
      );
      
      if (selectedSong.originalPath) {
        showSuccess('התגיות נשמרו בקובץ המקורי!');
      } else {
        showSuccess(`הקובץ "${fileName}" נשמר עם התגיות החדשות!`);
      }
    } catch (error) {
      console.error('Error saving tags:', error);
      showError('שגיאה בשמירת התגיות');
    } finally {
      setIsSaving(false);
    }
  };

  // Common genres for suggestions
  const genres = [
    'חסידי',
    'מזרחי',
    'פופ',
    'רוק',
    'ג\'אז',
    'קלאסי',
    'אלקטרוני',
    'היפ הופ',
    'ווקאלי',
    'חתונות',
    'ילדים',
    'אחר',
  ];

  return (
    <div className="metadata-editor">
      <div className="metadata-editor__section">
        <Label>בחר שיר לעריכה</Label>
        <Combobox
          placeholder="חפש שיר..."
          onOptionSelect={(_, data) => handleSongSelect(data.optionValue || '')}
          className="metadata-editor__select"
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
          <div className="metadata-editor__song-info">
            <div className="metadata-editor__cover">
              {selectedSong.coverUrl ? (
                <img src={selectedSong.coverUrl} alt={selectedSong.title} />
              ) : (
                <MusicNote224Regular />
              )}
            </div>
            <div className="metadata-editor__current">
              <Text weight="semibold">{selectedSong.title}</Text>
              <Text size={200}>{selectedSong.artist}</Text>
              {selectedSong.fileName && (
                <Text size={200} className="metadata-editor__filename">
                  {selectedSong.fileName}
                </Text>
              )}
            </div>
          </div>

          <div className="metadata-editor__fields">
            <div className="metadata-editor__field">
              <Label htmlFor="title">שם השיר</Label>
              <Input
                id="title"
                value={metadata.title}
                onChange={(_, data) => handleFieldChange('title', data.value)}
                placeholder="שם השיר"
              />
            </div>

            <div className="metadata-editor__field">
              <Label htmlFor="artist">אמן</Label>
              <Input
                id="artist"
                value={metadata.artist}
                onChange={(_, data) => handleFieldChange('artist', data.value)}
                placeholder="שם האמן"
              />
            </div>

            <div className="metadata-editor__field">
              <Label htmlFor="album">אלבום</Label>
              <Input
                id="album"
                value={metadata.album}
                onChange={(_, data) => handleFieldChange('album', data.value)}
                placeholder="שם האלבום"
              />
            </div>

            <div className="metadata-editor__field">
              <Label htmlFor="genre">ז'אנר</Label>
              <Combobox
                id="genre"
                value={metadata.genre}
                onOptionSelect={(_, data) => handleFieldChange('genre', data.optionText || '')}
                placeholder="בחר או הקלד ז'אנר"
                freeform
              >
                {genres.map((genre) => (
                  <Option key={genre} value={genre} text={genre}>
                    {genre}
                  </Option>
                ))}
              </Combobox>
            </div>
          </div>

          <div className="metadata-editor__actions">
            <Button
              appearance="primary"
              icon={<Save24Regular />}
              onClick={handleExportWithTags}
              disabled={!selectedSong?.audioData || isSaving || !hasChanges}
            >
              {isSaving ? 'שומר...' : 'עדכן תגיות'}
            </Button>
            <Button appearance="subtle" onClick={handleReset} disabled={!hasChanges || isSaving}>
              בטל שינויים
            </Button>
          </div>
        </>
      )}

      {!selectedSong && (
        <div className="metadata-editor__empty">
          <Tag24Regular className="metadata-editor__empty-icon" />
          <Text>בחר שיר כדי לערוך את התגיות שלו</Text>
        </div>
      )}

      <style>{`
        .metadata-editor__section {
          margin-bottom: var(--space-lg);
        }
        .metadata-editor__select {
          width: 100%;
          margin-top: var(--space-xs);
        }
        .metadata-editor__song-info {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding: var(--space-md);
          background: var(--surface-hover);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-lg);
        }
        .metadata-editor__cover {
          width: 64px;
          height: 64px;
          border-radius: var(--radius-md);
          background: var(--surface-card);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }
        .metadata-editor__cover img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .metadata-editor__cover svg {
          font-size: 32px;
          color: var(--text-secondary);
        }
        .metadata-editor__current {
          flex: 1;
          min-width: 0;
        }
        .metadata-editor__current > * {
          display: block;
        }
        .metadata-editor__filename {
          color: var(--text-disabled);
          font-family: monospace;
          font-size: var(--font-size-xs);
          margin-top: var(--space-xs);
        }
        .metadata-editor__fields {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-md);
          margin-bottom: var(--space-lg);
        }
        .metadata-editor__field {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }
        .metadata-editor__actions {
          display: flex;
          gap: var(--space-sm);
        }
        .metadata-editor__empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-md);
          padding: var(--space-2xl);
          color: var(--text-secondary);
        }
        .metadata-editor__empty-icon {
          font-size: 48px;
          opacity: 0.5;
        }
        @media (max-width: 600px) {
          .metadata-editor__fields {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
