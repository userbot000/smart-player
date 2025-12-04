import { useState } from 'react';
import {
  Button,
  Text,
  Checkbox,
  Spinner,
  Input,
  Label,
  Switch,
  Card,
  Tooltip,
} from '@fluentui/react-components';
import {
  Folder24Regular,
  Wand24Regular,
  Rename24Regular,
  Info16Regular,
} from '@fluentui/react-icons';
import { useToast } from '../Toast/ToastProvider';
import { isTauriApp } from '../../utils/tauriDetect';

interface SinglesOrganizerProps {
  onSongsUpdated?: () => void;
}

export function SinglesOrganizer({ onSongsUpdated }: SinglesOrganizerProps) {
  const [sourceFolder, setSourceFolder] = useState('');
  const [targetFolder, setTargetFolder] = useState('');
  
  // Basic options
  const [moveFiles, setMoveFiles] = useState(true); // opposite of copy_mode
  const [scanSubfolders, setScanSubfolders] = useState(true); // opposite of main_dir_only
  
  // Advanced options
  const [createSinglesDir, setCreateSinglesDir] = useState(true); // opposite of no_singles_dir
  const [abcSort, setAbcSort] = useState(false);
  const [existOnly, setExistOnly] = useState(false);
  const [duetMode, setDuetMode] = useState(false);
  
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');
  const { showSuccess, showError, showWarning } = useToast();

  const handleSelectSourceFolder = async () => {
    if (!isTauriApp()) {
      showWarning('זמין רק באפליקציה');
      return;
    }

    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'בחר תיקיית מקור',
      });

      if (selected && typeof selected === 'string') {
        setSourceFolder(selected);
      }
    } catch {
      showError('שגיאה בבחירת תיקייה');
    }
  };

  const handleSelectTargetFolder = async () => {
    if (!isTauriApp()) {
      showWarning('זמין רק באפליקציה');
      return;
    }

    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'בחר תיקיית יעד',
      });

      if (selected && typeof selected === 'string') {
        setTargetFolder(selected);
      }
    } catch {
      showError('שגיאה בבחירת תיקייה');
    }
  };

  const runSorter = async (fixNamesOnly: boolean = false) => {
    if (!sourceFolder) {
      showWarning('בחר תיקיית מקור');
      return;
    }

    setIsRunning(true);
    setOutput('');

    try {
      const { Command } = await import('@tauri-apps/plugin-shell');
      const { appDataDir } = await import('@tauri-apps/api/path');
      
      const appData = await appDataDir();
      const binDir = appData.replace(/[/\\]$/, '') + '\\bin';
      const exePath = `${binDir}\\Singles-Sorter-cli.exe`;

      // Build arguments
      const args: string[] = [sourceFolder];
      
      if (targetFolder) {
        args.push(targetFolder);
      }
      
      if (!moveFiles) args.push('-c'); // copy mode
      if (abcSort) args.push('-a');
      if (existOnly) args.push('-e');
      if (!createSinglesDir) args.push('-n');
      if (!scanSubfolders) args.push('-m');
      if (duetMode) args.push('-d');
      if (fixNamesOnly) args.push('-f');

      console.log('Running Singles Sorter:', exePath, args);
      setOutput(fixNamesOnly ? 'מתקן שמות קבצים...\n' : 'ממיין שירים...\n');

      const command = Command.create('powershell', [
        '-NoProfile',
        '-Command',
        `& '${exePath}' ${args.map(a => `'${a}'`).join(' ')}`
      ]);

      let fullOutput = '';

      command.stdout.on('data', (line) => {
        fullOutput += line + '\n';
        setOutput(fullOutput);
      });

      command.stderr.on('data', (line) => {
        fullOutput += line + '\n';
        setOutput(fullOutput);
      });

      await new Promise<void>((resolve) => {
        command.on('close', () => {
          resolve();
        });
        
        command.on('error', (error) => {
          fullOutput += `שגיאה: ${error}\n`;
          setOutput(fullOutput);
          resolve();
        });

        command.spawn().catch((err) => {
          fullOutput += `שגיאה בהפעלה: ${err}\n`;
          fullOutput += `\nוודא שהקובץ Singles-Sorter-cli.exe נמצא בתיקייה:\n${binDir}\n`;
          setOutput(fullOutput);
          resolve();
        });
      });

      showSuccess(fixNamesOnly ? 'תיקון השמות הושלם!' : 'המיון הושלם!');
      onSongsUpdated?.();
    } catch (error) {
      console.error('Error running Singles Sorter:', error);
      showError('שגיאה בהפעלת מסדר הסינגלים');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="singles-organizer">
      {/* Folders Section */}
      <div className="singles-organizer__folders">
        <div className="singles-organizer__folder-field">
          <Label>תיקיית מקור</Label>
          <div className="singles-organizer__folder-row">
            <Input
              value={sourceFolder}
              placeholder="C:\סינגלים\Music"
              readOnly
              style={{ flex: 1, direction: 'ltr', textAlign: 'right' }}
            />
            <Button
              appearance="secondary"
              icon={<Folder24Regular />}
              onClick={handleSelectSourceFolder}
            >
              בחר תיקייה
            </Button>
          </div>
        </div>

        <div className="singles-organizer__folder-field">
          <Label>תיקיית יעד</Label>
          <div className="singles-organizer__folder-row">
            <Input
              value={targetFolder}
              placeholder="תיקיית יעד"
              readOnly
              style={{ flex: 1, direction: 'ltr', textAlign: 'right' }}
            />
            <Button
              appearance="secondary"
              icon={<Folder24Regular />}
              onClick={handleSelectTargetFolder}
            >
              בחר תיקייה
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="singles-organizer__actions">
          <Button
            appearance="primary"
            icon={isRunning ? <Spinner size="tiny" /> : <Wand24Regular />}
            onClick={() => runSorter(false)}
            disabled={isRunning || !sourceFolder}
            size="large"
          >
            מיין שירים
          </Button>
          <Button
            appearance="secondary"
            icon={<Rename24Regular />}
            onClick={() => runSorter(true)}
            disabled={isRunning || !sourceFolder}
            size="large"
          >
            תקן שמות
          </Button>
        </div>
      </div>

      {/* Options Section */}
      <Card className="singles-organizer__options-card">
        <Text weight="semibold" size={400} style={{ marginBottom: 16, display: 'block' }}>
          ⚙ אפשרויות מיון
        </Text>

        <div className="singles-organizer__options-section">
          <Text weight="semibold" size={300}>בסיסי</Text>
          <div className="singles-organizer__option">
            <Switch
              checked={moveFiles}
              onChange={(_, data) => setMoveFiles(data.checked)}
            />
            <span>העבר קבצים</span>
            <Tooltip content="העבר קבצים במקום להעתיק" relationship="description">
              <Info16Regular className="singles-organizer__info-icon" />
            </Tooltip>
          </div>
          <div className="singles-organizer__option">
            <Switch
              checked={scanSubfolders}
              onChange={(_, data) => setScanSubfolders(data.checked)}
            />
            <span>סרוק עץ תיקיות</span>
            <Tooltip content="סרוק גם תיקיות משנה" relationship="description">
              <Info16Regular className="singles-organizer__info-icon" />
            </Tooltip>
          </div>
        </div>

        <div className="singles-organizer__options-section">
          <Text weight="semibold" size={300}>מתקדם</Text>
          <div className="singles-organizer__checkbox-option">
            <Checkbox
              checked={createSinglesDir}
              onChange={(_, data) => setCreateSinglesDir(!!data.checked)}
              label="צור תיקיות סינגלים"
            />
            <Tooltip content="צור תיקיית 'סינגלים' בתוך תיקיות האמנים" relationship="description">
              <Info16Regular className="singles-organizer__info-icon" />
            </Tooltip>
          </div>
          <div className="singles-organizer__checkbox-option">
            <Checkbox
              checked={abcSort}
              onChange={(_, data) => setAbcSort(!!data.checked)}
              label="מיון אלפביתי"
            />
            <Tooltip content="מיין תיקיות לפי א-ב (א-ה, ו-י, וכו')" relationship="description">
              <Info16Regular className="singles-organizer__info-icon" />
            </Tooltip>
          </div>
          <div className="singles-organizer__checkbox-option">
            <Checkbox
              checked={existOnly}
              onChange={(_, data) => setExistOnly(!!data.checked)}
              label="שימוש בתיקיות קיימות"
            />
            <Tooltip content="העבר רק לתיקיות אמנים שכבר קיימות" relationship="description">
              <Info16Regular className="singles-organizer__info-icon" />
            </Tooltip>
          </div>
          <div className="singles-organizer__checkbox-option">
            <Checkbox
              checked={duetMode}
              onChange={(_, data) => setDuetMode(!!data.checked)}
              label="מצב דואטים"
            />
            <Tooltip content="העתק שירי דואט לתיקיות של כל הזמרים" relationship="description">
              <Info16Regular className="singles-organizer__info-icon" />
            </Tooltip>
          </div>
        </div>
      </Card>

      {/* Info Card */}
      <Card className="singles-organizer__info-card">
        <Text weight="semibold" size={400}>
          👁 מאחורי הקלעים
        </Text>
        <Text size={300} style={{ marginTop: 8, display: 'block' }}>
          התוכנה נעזרת במודל AI קומפקטי ומהיר כדי לזהות אמנים!
          המודל מאפשר זיהוי שמות זמרים גם אם הם אינם קיימים ברשימה המובנית
        </Text>
      </Card>

      {/* Output */}
      {output && (
        <div className="singles-organizer__output">
          <Label>פלט</Label>
          <pre className="singles-organizer__output-text">{output}</pre>
        </div>
      )}

      <style>{`
        .singles-organizer {
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: var(--space-lg);
        }
        .singles-organizer__folders {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }
        .singles-organizer__folder-field {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }
        .singles-organizer__folder-row {
          display: flex;
          gap: var(--space-sm);
        }
        .singles-organizer__actions {
          display: flex;
          gap: var(--space-md);
          margin-top: var(--space-md);
        }
        .singles-organizer__options-card {
          padding: var(--space-md);
          grid-row: 1 / 3;
          grid-column: 2;
          height: fit-content;
        }
        .singles-organizer__options-section {
          margin-bottom: var(--space-md);
        }
        .singles-organizer__options-section > span:first-child {
          display: block;
          margin-bottom: var(--space-sm);
          color: var(--text-secondary);
        }
        .singles-organizer__option {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          margin-bottom: var(--space-sm);
        }
        .singles-organizer__checkbox-option {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          margin-bottom: var(--space-xs);
        }
        .singles-organizer__info-icon {
          color: var(--text-secondary);
          cursor: help;
        }
        .singles-organizer__info-card {
          grid-column: 1 / -1;
          padding: var(--space-md);
          background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
          border: none;
        }
        .singles-organizer__output {
          grid-column: 1 / -1;
          margin-top: var(--space-md);
        }
        .singles-organizer__output-text {
          background: var(--surface-secondary);
          padding: var(--space-md);
          border-radius: var(--radius-md);
          font-family: monospace;
          font-size: var(--font-size-sm);
          max-height: 200px;
          overflow-y: auto;
          white-space: pre-wrap;
          word-break: break-word;
          margin-top: var(--space-xs);
        }
        @media (max-width: 700px) {
          .singles-organizer {
            grid-template-columns: 1fr;
          }
          .singles-organizer__options-card {
            grid-row: auto;
            grid-column: 1;
          }
        }
      `}</style>
    </div>
  );
}
