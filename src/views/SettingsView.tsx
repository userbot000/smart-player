import { useState, useEffect } from 'react';
import { Switch, Label, Button, Text } from '@fluentui/react-components';
import { Folder24Regular, Delete24Regular } from '@fluentui/react-icons';
import { getWatchedFolders, removeWatchedFolder, WatchedFolder } from '../db/watchedFolders';
import { AddSongsButton } from '../components/AddSongs/AddSongsButton';

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

  useEffect(() => {
    loadFolders();
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
      `}</style>
    </div>
  );
}
