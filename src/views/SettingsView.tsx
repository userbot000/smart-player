import { useState, useEffect } from 'react';
import { Switch, Label, Button, Text, Input, Spinner } from '@fluentui/react-components';
import { Folder24Regular, Delete24Regular, Add24Regular, Video24Regular } from '@fluentui/react-icons';
import { getWatchedFolders, removeWatchedFolder, WatchedFolder } from '../db/watchedFolders';
import { AddSongsButton } from '../components/AddSongs/AddSongsButton';
import { getArtistFiltersAsync, saveArtistFilters, ArtistFilters } from '../utils/artistFilters';
import {
  getTrackedChannels,
  getTrackedChannelsAsync,
  addTrackedChannel,
  removeTrackedChannel,
  TrackedChannel,
} from '../utils/ytChannelTracker';

interface SettingsViewProps {
  isDark: boolean;
  onThemeChange: (dark: boolean) => void;
  onFoldersChanged: () => void;
  accentColor?: string;
  onAccentColorChange?: (color: string) => void;
}

const ACCENT_COLORS = [
  { id: 'blue', name: 'כחול', color: '#0078d4' },
  { id: 'purple', name: 'סגול', color: '#8764b8' },
  { id: 'pink', name: 'ורוד', color: '#e3008c' },
  { id: 'red', name: 'אדום', color: '#d13438' },
  { id: 'orange', name: 'כתום', color: '#ff8c00' },
  { id: 'green', name: 'ירוק', color: '#107c10' },
  { id: 'teal', name: 'טורקיז', color: '#008272' },
];

export function SettingsView({ isDark, onThemeChange, onFoldersChanged, accentColor = 'blue', onAccentColorChange }: SettingsViewProps) {
  const [folders, setFolders] = useState<WatchedFolder[]>([]);
  const [filters, setFilters] = useState<ArtistFilters>({ id: 'filters', whitelist: [], blacklist: [] });
  const [newWhitelistArtist, setNewWhitelistArtist] = useState('');
  const [newBlacklistArtist, setNewBlacklistArtist] = useState('');

  // YouTube channel tracking
  const [trackedChannels, setTrackedChannels] = useState<TrackedChannel[]>([]);
  const [newChannelUrl, setNewChannelUrl] = useState('');
  const [addingChannel, setAddingChannel] = useState(false);
  const [channelError, setChannelError] = useState<string | null>(null);

  useEffect(() => {
    loadFolders();
    getArtistFiltersAsync().then(setFilters);
    getTrackedChannelsAsync().then(setTrackedChannels);
  }, []);

  const loadFolders = async () => {
    const watchedFolders = await getWatchedFolders();
    setFolders(watchedFolders);
  };

  const handleRemoveFolder = async (id: string) => {
    await removeWatchedFolder(id);
    loadFolders();
    onFoldersChanged();
  };

  const handleAddWhitelist = () => {
    if (newWhitelistArtist.trim()) {
      const updated = { ...filters };
      if (!updated.whitelist.includes(newWhitelistArtist.trim())) {
        updated.whitelist.push(newWhitelistArtist.trim());
        updated.blacklist = updated.blacklist.filter((a: string) => a !== newWhitelistArtist.trim());
        saveArtistFilters(updated);
        setFilters(updated);
      }
      setNewWhitelistArtist('');
    }
  };

  const handleAddBlacklist = () => {
    if (newBlacklistArtist.trim()) {
      const updated = { ...filters };
      if (!updated.blacklist.includes(newBlacklistArtist.trim())) {
        updated.blacklist.push(newBlacklistArtist.trim());
        updated.whitelist = updated.whitelist.filter((a: string) => a !== newBlacklistArtist.trim());
        saveArtistFilters(updated);
        setFilters(updated);
      }
      setNewBlacklistArtist('');
    }
  };

  const handleRemoveWhitelist = (artist: string) => {
    const updated = { ...filters, whitelist: filters.whitelist.filter((a: string) => a !== artist) };
    saveArtistFilters(updated);
    setFilters(updated);
  };

  const handleRemoveBlacklist = (artist: string) => {
    const updated = { ...filters, blacklist: filters.blacklist.filter((a: string) => a !== artist) };
    saveArtistFilters(updated);
    setFilters(updated);
  };

  const handleAddChannel = async () => {
    if (!newChannelUrl.trim()) return;

    setAddingChannel(true);
    setChannelError(null);

    try {
      const result = await addTrackedChannel(newChannelUrl.trim());
      if (result.success) {
        setTrackedChannels(getTrackedChannels());
        setNewChannelUrl('');
      } else {
        setChannelError(result.error || 'שגיאה בהוספת ערוץ');
      }
    } catch {
      setChannelError('שגיאה בהוספת ערוץ');
    } finally {
      setAddingChannel(false);
    }
  };

  const handleRemoveChannel = (channelId: string) => {
    removeTrackedChannel(channelId);
    setTrackedChannels(getTrackedChannels());
  };

  return (
    <div className="view settings-view">
      <div className="view__header">
        <h2 className="view__title">הגדרות</h2>
      </div>

      <section className="settings-section">
        <h3 className="settings-section__title">מראה</h3>
        <div className="settings-item">
          <Label htmlFor="dark-mode">מצב כהה</Label>
          <Switch
            id="dark-mode"
            checked={isDark}
            onChange={(_, data) => onThemeChange(data.checked)}
          />
        </div>
        <div className="settings-item settings-item--colors">
          <Label>צבע בסיס</Label>
          <div className="color-picker">
            {ACCENT_COLORS.map((c) => (
              <button
                key={c.id}
                className={`color-picker__color ${accentColor === c.id ? 'color-picker__color--active' : ''}`}
                style={{ backgroundColor: c.color }}
                onClick={() => onAccentColorChange?.(c.id)}
                title={c.name}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h3 className="settings-section__title">תיקיות מוזיקה ({folders.length})</h3>
        <p className="settings-section__desc">
          התיקיות הבאות נסרקות לשירים. הוסף תיקיות מדף הספרייה.
        </p>

        {folders.length === 0 ? (
          <div className="settings-empty">
            <Folder24Regular />
            <span>אין תיקיות מנוטרות</span>
          </div>
        ) : (
          <div className="settings-folders">
            {folders.map((folder) => (
              <div key={folder.id} className="settings-folder">
                <div className="settings-folder__info">
                  <Folder24Regular className="settings-folder__icon" />
                  <div className="settings-folder__text">
                    <Text weight="semibold">{folder.name}</Text>
                    <Text size={200} className="settings-folder__meta">
                      {folder.songCount} שירים
                      {folder.lastScanned && (
                        <> • סריקה: {new Date(folder.lastScanned).toLocaleDateString('he-IL')}</>
                      )}
                    </Text>
                  </div>
                </div>
                <div className="settings-folder__actions">
                  <AddSongsButton
                    onSongsAdded={() => {
                      loadFolders();
                      onFoldersChanged();
                    }}
                    mode="rescan"
                    folderId={folder.id}
                    folderName={folder.name}
                    folderPath={folder.path}
                  />
                  <Button
                    appearance="subtle"
                    icon={<Delete24Regular />}
                    onClick={() => handleRemoveFolder(folder.id)}
                    title="הסר תיקייה"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="settings-section">
        <h3 className="settings-section__title">ניגון</h3>
        <div className="settings-item">
          <Label htmlFor="smart-queue">תור חכם (המלצות אוטומטיות)</Label>
          <Switch id="smart-queue" defaultChecked />
        </div>
      </section>

      <section className="settings-section">
        <h3 className="settings-section__title">מעקב ערוצי YouTube</h3>
        <p className="settings-section__desc">
          קבל התראה כשיש סרטון חדש בערוץ והורד אוטומטית
        </p>

        <div className="filter-list__input">
          <Input
            placeholder="https://youtube.com/@channel או קישור לערוץ"
            value={newChannelUrl}
            onChange={(_, data) => setNewChannelUrl(data.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddChannel()}
            disabled={addingChannel}
          />
          <Button
            icon={addingChannel ? <Spinner size="tiny" /> : <Add24Regular />}
            onClick={handleAddChannel}
            disabled={addingChannel || !newChannelUrl.trim()}
          >
            {addingChannel ? 'מוסיף...' : 'הוסף'}
          </Button>
        </div>

        {channelError && (
          <p className="settings-error">{channelError}</p>
        )}

        <div className="settings-channels">
          {trackedChannels.length === 0 ? (
            <div className="settings-empty">
              <Video24Regular />
              <span>אין ערוצים במעקב</span>
            </div>
          ) : (
            trackedChannels.map((channel) => (
              <div key={channel.id} className="settings-channel">
                <div className="settings-channel__info">
                  <Video24Regular className="settings-channel__icon" />
                  <div className="settings-channel__text">
                    <Text weight="semibold">{channel.name}</Text>
                    <Text size={200} className="settings-channel__meta">
                      בדיקה אחרונה: {new Date(channel.lastCheck).toLocaleDateString('he-IL')}
                    </Text>
                  </div>
                </div>
                <Button
                  appearance="subtle"
                  icon={<Delete24Regular />}
                  onClick={() => handleRemoveChannel(channel.id)}
                  title="הסר ערוץ"
                />
              </div>
            ))
          )}
        </div>
      </section>

      <section className="settings-section">
        <h3 className="settings-section__title">סינון הורדות</h3>
        <p className="settings-section__desc">
          סנן שירים בעדכון אוטומטי לפי שם זמר או מילות מפתח
        </p>

        {/* Whitelist */}
        <div className="filter-list">
          <Label className="filter-list__label">רשימה לבנה (הורד רק אלה)</Label>
          <p className="filter-list__hint">אם הרשימה לא ריקה, יורדו רק שירים שמכילים את השמות האלה</p>
          <div className="filter-list__input">
            <Input
              placeholder="הוסף זמר..."
              value={newWhitelistArtist}
              onChange={(_, data) => setNewWhitelistArtist(data.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddWhitelist()}
            />
            <Button icon={<Add24Regular />} onClick={handleAddWhitelist}>הוסף</Button>
          </div>
          <div className="filter-list__tags">
            {filters.whitelist.map((artist: string) => (
              <span key={artist} className="filter-tag filter-tag--white">
                {artist}
                <button onClick={() => handleRemoveWhitelist(artist)}>×</button>
              </span>
            ))}
            {filters.whitelist.length === 0 && (
              <span className="filter-list__empty">ריק - כל הזמרים יורדו</span>
            )}
          </div>
        </div>

        {/* Blacklist */}
        <div className="filter-list">
          <Label className="filter-list__label">רשימה שחורה (אל תוריד)</Label>
          <p className="filter-list__hint">שירים שמכילים את השמות האלה לא יורדו</p>
          <div className="filter-list__input">
            <Input
              placeholder="הוסף זמר..."
              value={newBlacklistArtist}
              onChange={(_, data) => setNewBlacklistArtist(data.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddBlacklist()}
            />
            <Button icon={<Add24Regular />} onClick={handleAddBlacklist}>הוסף</Button>
          </div>
          <div className="filter-list__tags">
            {filters.blacklist.map((artist: string) => (
              <span key={artist} className="filter-tag filter-tag--black">
                {artist}
                <button onClick={() => handleRemoveBlacklist(artist)}>×</button>
              </span>
            ))}
            {filters.blacklist.length === 0 && (
              <span className="filter-list__empty">ריק - אף זמר לא חסום</span>
            )}
          </div>
        </div>
      </section>

      <style>{`
        .settings-view {
          max-width: 600px;
        }
        .settings-section {
          background: var(--surface-card);
          border-radius: var(--radius-lg);
          padding: var(--space-md);
          margin-bottom: var(--space-md);
        }
        .settings-section__title {
          font-size: var(--font-size-md);
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 var(--space-md);
          text-align: right;
        }
        .settings-section__desc {
          font-size: var(--font-size-sm);
          color: var(--text-secondary);
          margin: 0 0 var(--space-md);
          text-align: right;
        }
        .settings-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-sm) 0;
        }
        .settings-empty {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          color: var(--text-secondary);
          padding: var(--space-md);
          justify-content: center;
        }
        .settings-folders {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }
        .settings-folder {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-md);
          background: var(--surface-hover);
          border-radius: var(--radius-md);
          gap: var(--space-md);
        }
        .settings-folder__info {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          flex: 1;
          min-width: 0;
        }
        .settings-folder__icon {
          flex-shrink: 0;
          color: var(--color-primary);
        }
        .settings-folder__text {
          min-width: 0;
          text-align: right;
        }
        .settings-folder__meta {
          display: block;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .settings-folder__actions {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          flex-shrink: 0;
        }
        .settings-item--colors {
          flex-direction: column;
          align-items: flex-start;
          gap: var(--space-sm);
        }
        .color-picker {
          display: flex;
          gap: var(--space-sm);
          flex-wrap: wrap;
        }
        .color-picker__color {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-full);
          border: 2px solid transparent;
          cursor: pointer;
          transition: transform 0.15s, border-color 0.15s;
        }
        .color-picker__color:hover {
          transform: scale(1.1);
        }
        .color-picker__color--active {
          border-color: var(--text-primary);
          transform: scale(1.15);
        }
        .filter-list {
          margin-bottom: var(--space-lg);
        }
        .filter-list__label {
          display: block;
          font-weight: 600;
          margin-bottom: var(--space-xs);
        }
        .filter-list__hint {
          font-size: var(--font-size-xs);
          color: var(--text-secondary);
          margin: 0 0 var(--space-sm);
        }
        .filter-list__input {
          display: flex;
          gap: var(--space-sm);
          margin-bottom: var(--space-sm);
        }
        .filter-list__input input {
          flex: 1;
        }
        .filter-list__tags {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-xs);
          min-height: 32px;
          align-items: center;
        }
        .filter-list__empty {
          font-size: var(--font-size-sm);
          color: var(--text-disabled);
          font-style: italic;
        }
        .filter-tag {
          display: inline-flex;
          align-items: center;
          gap: var(--space-xs);
          padding: 4px 8px;
          border-radius: var(--radius-full);
          font-size: var(--font-size-sm);
        }
        .filter-tag--white {
          background: rgba(16, 124, 16, 0.15);
          color: #107c10;
        }
        .filter-tag--black {
          background: rgba(209, 52, 56, 0.15);
          color: #d13438;
        }
        .filter-tag button {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
          opacity: 0.7;
          color: inherit;
        }
        .filter-tag button:hover {
          opacity: 1;
        }
        .settings-channels {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          margin-top: var(--space-md);
        }
        .settings-channel {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-md);
          background: var(--surface-hover);
          border-radius: var(--radius-md);
        }
        .settings-channel__info {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          flex: 1;
        }
        .settings-channel__icon {
          color: #ff0000;
        }
        .settings-channel__text {
          text-align: right;
        }
        .settings-channel__meta {
          display: block;
          color: var(--text-secondary);
        }
        .settings-error {
          color: var(--color-error);
          font-size: var(--font-size-sm);
          margin: var(--space-sm) 0;
        }
      `}</style>
    </div>
  );
}
