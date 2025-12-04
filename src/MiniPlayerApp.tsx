import { useMemo, useState, useEffect } from 'react';
import {
  FluentProvider,
  createDarkTheme,
  createLightTheme,
  BrandVariants,
} from '@fluentui/react-components';
import { MiniPlayer } from './components/Player/MiniPlayer';
import { getPreferences, ThemeMode } from './db/database';
import './styles/index.css';

function MiniPlayerApp() {
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [systemDark, setSystemDark] = useState(false);
  const [accentColor, setAccentColor] = useState('blue');

  const isDark = themeMode === 'system' ? systemDark : themeMode === 'dark';

  const brandColors: Record<string, BrandVariants> = useMemo(
    () => ({
      blue: {
        10: '#001d33', 20: '#002d4d', 30: '#003d66', 40: '#004d80',
        50: '#005c99', 60: '#006bb3', 70: '#0078d4', 80: '#1a86d9',
        90: '#3394de', 100: '#4da3e3', 110: '#66b1e8', 120: '#80bfed',
        130: '#99cdf2', 140: '#b3dbf7', 150: '#cce9fc', 160: '#e6f4fe',
      },
      purple: {
        10: '#1a0f24', 20: '#2d1a3d', 30: '#402657', 40: '#533170',
        50: '#663d8a', 60: '#7a4aa3', 70: '#8764b8', 80: '#9574c0',
        90: '#a384c8', 100: '#b194d0', 110: '#bfa4d8', 120: '#cdb4e0',
        130: '#dbc4e8', 140: '#e9d4f0', 150: '#f4e9f7', 160: '#faf4fb',
      },
      teal: {
        10: '#001a17', 20: '#002d28', 30: '#004039', 40: '#00534a',
        50: '#00665b', 60: '#00796c', 70: '#008272', 80: '#1a8f80',
        90: '#339c8e', 100: '#4da99c', 110: '#66b6aa', 120: '#80c3b8',
        130: '#99d0c6', 140: '#b3ddd4', 150: '#cceae2', 160: '#e6f7f0',
      },
    }),
    []
  );

  const customTheme = useMemo(() => {
    const brand = brandColors[accentColor] || brandColors.blue;
    return isDark ? createDarkTheme(brand) : createLightTheme(brand);
  }, [accentColor, isDark, brandColors]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const loadPrefs = async () => {
      const prefs = await getPreferences();
      setAccentColor(prefs.accentColor);
      setThemeMode(prefs.themeMode);
    };
    loadPrefs();
  }, []);

  return (
    <FluentProvider theme={customTheme}>
      <div data-theme={isDark ? 'dark' : 'light'} style={{ height: '100vh' }}>
        <MiniPlayer />
      </div>
    </FluentProvider>
  );
}

export default MiniPlayerApp;
