import { useState, useEffect, useMemo } from 'react';
import {
  FluentProvider,
  createDarkTheme,
  createLightTheme,
  BrandVariants,
} from '@fluentui/react-components';

import { Sidebar, PlayerControls } from './components';
import { ToastProvider } from './components/Toast/ToastProvider';
import { HomeView, LibraryView, AlbumsView, ArtistsView, DownloadsView, SettingsView, ToolsView } from './views';
import { Song, DownloadTask } from './types';
import { getAllSongs, deleteSong, getRecentlyPlayed, updateSong } from './db/database';
import { downloadAudioFromUrl } from './utils/downloadAudio';

import './styles/index.css';

type ViewType = 'home' | 'library' | 'albums' | 'artists' | 'downloads' | 'history' | 'favorites' | 'tools' | 'settings';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [songs, setSongs] = useState<Song[]>([]);
  const [recentSongs, setRecentSongs] = useState<Song[]>([]);
  const [downloads, setDownloads] = useState<DownloadTask[]>([]);
  const [isDark, setIsDark] = useState(false);
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('accentColor') || 'blue');

  // Brand color palettes for each accent color
  const brandColors: Record<string, BrandVariants> = useMemo(
    () => ({
      blue: {
        10: '#001d33',
        20: '#002d4d',
        30: '#003d66',
        40: '#004d80',
        50: '#005c99',
        60: '#006bb3',
        70: '#0078d4',
        80: '#1a86d9',
        90: '#3394de',
        100: '#4da3e3',
        110: '#66b1e8',
        120: '#80bfed',
        130: '#99cdf2',
        140: '#b3dbf7',
        150: '#cce9fc',
        160: '#e6f4fe',
      },
      purple: {
        10: '#1a0f24',
        20: '#2d1a3d',
        30: '#402657',
        40: '#533170',
        50: '#663d8a',
        60: '#7a4aa3',
        70: '#8764b8',
        80: '#9574c0',
        90: '#a384c8',
        100: '#b194d0',
        110: '#bfa4d8',
        120: '#cdb4e0',
        130: '#dbc4e8',
        140: '#e9d4f0',
        150: '#f4e9f7',
        160: '#faf4fb',
      },
      pink: {
        10: '#2d001c',
        20: '#4d0030',
        30: '#6d0044',
        40: '#8d0058',
        50: '#ad006c',
        60: '#cd0080',
        70: '#e3008c',
        80: '#e61a98',
        90: '#e933a4',
        100: '#ec4db0',
        110: '#ef66bc',
        120: '#f280c8',
        130: '#f599d4',
        140: '#f8b3e0',
        150: '#fbccec',
        160: '#fee6f6',
      },
      red: {
        10: '#2a0a0b',
        20: '#471517',
        30: '#641f22',
        40: '#812a2e',
        50: '#9e3439',
        60: '#bb3f45',
        70: '#d13438',
        80: '#d6484c',
        90: '#db5c60',
        100: '#e07074',
        110: '#e58488',
        120: '#ea989c',
        130: '#efacb0',
        140: '#f4c0c4',
        150: '#f9d4d8',
        160: '#fee8ec',
      },
      orange: {
        10: '#331c00',
        20: '#4d2a00',
        30: '#663800',
        40: '#804600',
        50: '#995400',
        60: '#b36200',
        70: '#ff8c00',
        80: '#ff981a',
        90: '#ffa433',
        100: '#ffb04d',
        110: '#ffbc66',
        120: '#ffc880',
        130: '#ffd499',
        140: '#ffe0b3',
        150: '#ffeccc',
        160: '#fff8e6',
      },
      green: {
        10: '#021a02',
        20: '#052d05',
        30: '#084008',
        40: '#0b530b',
        50: '#0e660e',
        60: '#117911',
        70: '#107c10',
        80: '#288928',
        90: '#409640',
        100: '#58a358',
        110: '#70b070',
        120: '#88bd88',
        130: '#a0caa0',
        140: '#b8d7b8',
        150: '#d0e4d0',
        160: '#e8f1e8',
      },
      teal: {
        10: '#001a17',
        20: '#002d28',
        30: '#004039',
        40: '#00534a',
        50: '#00665b',
        60: '#00796c',
        70: '#008272',
        80: '#1a8f80',
        90: '#339c8e',
        100: '#4da99c',
        110: '#66b6aa',
        120: '#80c3b8',
        130: '#99d0c6',
        140: '#b3ddd4',
        150: '#cceae2',
        160: '#e6f7f0',
      },
    }),
    []
  );

  // Create custom themes based on accent color
  const customTheme = useMemo(() => {
    const brand = brandColors[accentColor] || brandColors.blue;
    return isDark ? createDarkTheme(brand) : createLightTheme(brand);
  }, [accentColor, isDark, brandColors]);

  // Apply accent color to CSS variables
  useEffect(() => {
    const colors: Record<string, string> = {
      blue: '#0078d4',
      purple: '#8764b8',
      pink: '#e3008c',
      red: '#d13438',
      orange: '#ff8c00',
      green: '#107c10',
      teal: '#008272',
    };
    const color = colors[accentColor] || colors.blue;
    document.documentElement.style.setProperty('--color-primary', color);
    document.documentElement.style.setProperty('--color-primary-hover', color);
    document.documentElement.style.setProperty('--surface-selected', `${color}26`);
    localStorage.setItem('accentColor', accentColor);
  }, [accentColor]);

  useEffect(() => {
    loadSongs();
  }, []);

  const loadSongs = async () => {
    const allSongs = await getAllSongs();
    setSongs(allSongs);
    const recent = await getRecentlyPlayed(10);
    setRecentSongs(recent);
  };

  const handleDeleteSong = async (id: string) => {
    await deleteSong(id);
    loadSongs();
  };

  const handleToggleFavorite = async (id: string) => {
    const song = songs.find((s) => s.id === id);
    if (song) {
      await updateSong(id, { isFavorite: !song.isFavorite });
      loadSongs();
    }
  };

  // Download handlers
  const handleStartDownload = async (url: string) => {
    const downloadId = crypto.randomUUID();

    // Get filename from URL
    const urlParts = url.split('/');
    const fileName = urlParts[urlParts.length - 1].split('?')[0] || 'שיר';

    const newDownload: DownloadTask = {
      id: downloadId,
      url,
      title: decodeURIComponent(fileName),
      status: 'downloading',
      progress: 0,
    };
    setDownloads((prev) => [newDownload, ...prev]);

    try {
      await downloadAudioFromUrl(url, (progress) => {
        setDownloads((prev) =>
          prev.map((d) => (d.id === downloadId ? { ...d, progress: progress.percent } : d))
        );
      });

      setDownloads((prev) =>
        prev.map((d) => (d.id === downloadId ? { ...d, status: 'completed', progress: 100 } : d))
      );

      // Reload songs to show the new one
      loadSongs();
    } catch (error) {
      console.error('Download error:', error);
      setDownloads((prev) =>
        prev.map((d) =>
          d.id === downloadId
            ? { ...d, status: 'error', error: error instanceof Error ? error.message : 'שגיאה בהורדה' }
            : d
        )
      );
    }
  };

  const handleCancelDownload = (id: string) => {
    setDownloads((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'error', error: 'בוטל' } : d)));
  };

  const handleRemoveDownload = (id: string) => {
    setDownloads((prev) => prev.filter((d) => d.id !== id));
  };

  // Batch download multiple URLs
  const handleBatchDownload = (urls: string[]) => {
    urls.forEach((url) => {
      handleStartDownload(url);
    });
  };

  const favoriteSongs = songs.filter((s) => s.isFavorite);

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <HomeView recentSongs={recentSongs} totalSongs={songs.length} onSongsAdded={loadSongs} />;

      case 'library':
        return (
          <LibraryView
            songs={songs}
            onDelete={handleDeleteSong}
            onSongsAdded={loadSongs}
            onToggleFavorite={handleToggleFavorite}
          />
        );

      case 'albums':
        return <AlbumsView songs={songs} />;

      case 'artists':
        return <ArtistsView songs={songs} onToggleFavorite={handleToggleFavorite} />;

      case 'downloads':
        return (
          <DownloadsView
            downloads={downloads}
            onStartDownload={handleStartDownload}
            onCancelDownload={handleCancelDownload}
            onRemoveDownload={handleRemoveDownload}
            onBatchDownload={handleBatchDownload}
          />
        );

      case 'history':
        return (
          <LibraryView
            songs={recentSongs}
            onDelete={handleDeleteSong}
            onSongsAdded={loadSongs}
            onToggleFavorite={handleToggleFavorite}
            title="היסטוריה"
            viewType="history"
            showAddButton={false}
          />
        );

      case 'favorites':
        return (
          <LibraryView
            songs={favoriteSongs}
            onDelete={handleDeleteSong}
            onSongsAdded={loadSongs}
            onToggleFavorite={handleToggleFavorite}
            title="מועדפים"
            viewType="favorites"
            showAddButton={false}
          />
        );

      case 'tools':
        return <ToolsView songs={songs} onSongUpdated={loadSongs} />;

      case 'settings':
        return (
          <SettingsView
            isDark={isDark}
            onThemeChange={setIsDark}
            onFoldersChanged={loadSongs}
            accentColor={accentColor}
            onAccentColorChange={setAccentColor}
          />
        );

      default:
        return null;
    }
  };

  return (
    <FluentProvider theme={customTheme}>
      <ToastProvider>
        <div className="app" data-theme={isDark ? 'dark' : 'light'}>
          <Sidebar currentView={currentView} onViewChange={setCurrentView} />
          <main className="app__main">
            <div className="app__content">{renderView()}</div>
            <PlayerControls />
          </main>
        </div>
      </ToastProvider>
    </FluentProvider>
  );
}

export default App;
