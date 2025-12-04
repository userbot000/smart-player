import { useState, useRef, useEffect } from 'react';
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
  Save24Regular,
  Image24Regular,
  Delete24Regular,
} from '@fluentui/react-icons';
import { Song } from '../../types';
import { useToast } from '../Toast/ToastProvider';
import { updateAndSaveWithTags } from '../../utils/audioProcessor';

interface MetadataEditorProps {
  songs: Song[];
  onSongUpdated?: () => void;
  initialSong?: Song;
}

interface EditableMetadata {
  title: string;
  artist: string;
  album: string;
  genre: string;
}

export function MetadataEditor({ songs, initialSong }: MetadataEditorProps) {
  const [selectedSong, setSelectedSong] = useState<Song | null>(initialSong || null);
  const [metadata, setMetadata] = useState<EditableMetadata>({
    title: '',
    artist: '',
    album: '',
    genre: '',
  });
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverImageData, setCoverImageData] = useState<ArrayBuffer | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showSuccess, showError } = useToast();

  // Set initial song if provided
  useEffect(() => {
    if (initialSong && !selectedSong) {
      setSelectedSong(initialSong);
      setMetadata({
        title: initialSong.title,
        artist: initialSong.artist,
        album: initialSong.album || '',
        genre: initialSong.genre || '',
      });
      setCoverImage(initialSong.coverUrl || null);
      setCoverImageData(null);
      setHasChanges(false);
    }
  }, [initialSong]);

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
      setCoverImage(song.coverUrl || null);
      setCoverImageData(null);
      setHasChanges(false);
    }
  };

  const handleFieldChange = (field: keyof EditableMetadata, value: string) => {
    setMetadata((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('יש לבחור קובץ תמונה');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCoverImage(dataUrl);
      
      // Also store as ArrayBuffer for ID3 tag
      const arrayReader = new FileReader();
      arrayReader.onload = (e) => {
        setCoverImageData(e.target?.result as ArrayBuffer);
      };
      arrayReader.readAsArrayBuffer(file);
      
      setHasChanges(true);
    };
    reader.readAsDataURL(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveCover = () => {
    setCoverImage(null);
    setCoverImageData(null);
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
      setCoverImage(selectedSong.coverUrl || null);
      setCoverImageData(null);
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
      await updateAndSaveWithTags(
        selectedSong.audioData,
        { ...metadata, coverImage: coverImageData || undefined },
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

  const genres = [
    'חסידי', 'מזרחי', 'פופ', 'רוק', 'ג\'אז', 'קלאסי',
    'אלקטרוני', 'היפ הופ', 'ווקאלי', 'חתונות', 'ילדים', 'אחר',
  ];


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
        const tempSong: Song = {
          id: 'temp-' + Date.now(),
          title: fileName.replace(/\.[^.]+$/, ''),
          artist: 'קובץ מקומי',
          duration: 0,
          filePath: selected,
          originalPath: selected,
          addedAt: Date.now(),
          playCount: 0,
          isFavorite: false,
        };
        setSelectedSong(tempSong);
        setMetadata({
          title: tempSong.title,
          artist: tempSong.artist,
          album: '',
          genre: '',
        });
        setCoverImage(null);
        setCoverImageData(null);
        setHasChanges(false);
      }
    } catch (error) {
      showError('שגיאה בבחירת קובץ');
    }
  };

  return (
    <div className="metadata-editor">
      <div className="metadata-editor__section">
        <Label>בחר שיר לעריכה</Label>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <Combobox
            placeholder="חפש שיר מהספרייה..."
            onOptionSelect={(_, data) => handleSongSelect(data.optionValue || '')}
            className="metadata-editor__select"
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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />

          <div className="metadata-editor__song-info">
            <div 
              className="metadata-editor__cover metadata-editor__cover--editable"
              onClick={() => fileInputRef.current?.click()}
              title="לחץ להחלפת תמונה"
            >
              {coverImage ? (
                <>
                  <img src={coverImage} alt={selectedSong.title} />
                  <div className="metadata-editor__cover-overlay">
                    <Image24Regular />
                  </div>
                </>
              ) : (
                <div className="metadata-editor__cover-empty">
                  <Image24Regular />
                  <span>הוסף תמונה</span>
                </div>
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
              {coverImage && (
                <Button
                  appearance="subtle"
                  size="small"
                  icon={<Delete24Regular />}
                  onClick={handleRemoveCover}
                  className="metadata-editor__remove-cover"
                >
                  הסר תמונה
                </Button>
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
          align-items: flex-start;
          gap: var(--space-md);
          padding: var(--space-md);
          background: var(--surface-hover);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-lg);
        }
        .metadata-editor__cover {
          width: 100px;
          height: 100px;
          border-radius: var(--radius-md);
          background: var(--surface-card);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
          position: relative;
        }
        .metadata-editor__cover--editable {
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .metadata-editor__cover--editable:hover {
          transform: scale(1.02);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .metadata-editor__cover img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .metadata-editor__cover-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.15s;
          color: white;
        }
        .metadata-editor__cover--editable:hover .metadata-editor__cover-overlay {
          opacity: 1;
        }
        .metadata-editor__cover-overlay svg {
          font-size: 32px;
        }
        .metadata-editor__cover-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-xs);
          color: var(--text-secondary);
          font-size: var(--font-size-xs);
        }
        .metadata-editor__cover-empty svg {
          font-size: 28px;
        }
        .metadata-editor__cover svg {
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
        .metadata-editor__remove-cover {
          margin-top: var(--space-sm);
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
