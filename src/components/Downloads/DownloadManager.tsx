import { useState, useEffect } from 'react';
import {
  Input,
  Button,
  ProgressBar,
  Card,
  CardHeader,
  Text,
  Spinner,
  Badge,
} from '@fluentui/react-components';
import {
  ArrowDownload24Regular,
  Checkmark24Regular,
  Dismiss24Regular,
  Delete24Regular,
  Link24Regular,
  ArrowSync24Regular,
  Info24Regular,
  Open24Regular,
  Video24Regular,
} from '@fluentui/react-icons';
import { DownloadTask } from '../../types';
import {
  getBlogSyncStatus,
  getBlogSyncState,
  markPostAsDownloaded,
  formatPostDate,
  fetchPostsByDate,
  BlogPost,
} from '../../utils/blogScraper';

import { filterUrlsByArtist } from '../../utils/artistFilters';
import { downloadYouTubeAudio, updateYtDlp, YtDownloadProgress } from '../../utils/ytDownloader';
import './DownloadManager.css';

interface DownloadManagerProps {
  downloads: DownloadTask[];
  onStartDownload: (url: string) => void;
  onCancelDownload: (id: string) => void;
  onRemoveDownload: (id: string) => void;
  onBatchDownload: (urls: string[]) => void;
}

export function DownloadManager({
  downloads,
  onStartDownload,
  onCancelDownload,
  onRemoveDownload,
  onBatchDownload,
}: DownloadManagerProps) {
  const [url, setUrl] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [newPosts, setNewPosts] = useState<BlogPost[]>([]);
  const [syncStatus, setSyncStatus] = useState(getBlogSyncStatus());
  const [error, setError] = useState<string | null>(null);
  
  // YouTube download state
  const [ytUrl, setYtUrl] = useState('');
  const [ytDownloading, setYtDownloading] = useState(false);
  const [ytProgress, setYtProgress] = useState<YtDownloadProgress | null>(null);
  const [ytError, setYtError] = useState<string | null>(null);
  const [ytUpdating, setYtUpdating] = useState(false);
  


  useEffect(() => {
    setSyncStatus(getBlogSyncStatus());
  }, [downloads]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onStartDownload(url.trim());
      setUrl('');
    }
  };

  const handleYouTubeDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ytUrl.trim()) return;

    setYtDownloading(true);
    setYtError(null);
    setYtProgress({ percent: 0, status: 'checking', message: 'מתחיל...' });

    try {
      const result = await downloadYouTubeAudio(ytUrl.trim(), (progress) => {
        setYtProgress(progress);
      });

      if (result.success) {
        setYtProgress({ percent: 100, status: 'done', message: `הורד: ${result.title}` });
        setYtUrl('');
      } else {
        setYtError(result.error || 'שגיאה בהורדה');
        setYtProgress(null);
      }
    } catch (err) {
      setYtError(err instanceof Error ? err.message : 'שגיאה בהורדה');
      setYtProgress(null);
    } finally {
      setYtDownloading(false);
    }
  };

  const handleUpdateYtDlp = async () => {
    setYtUpdating(true);
    setYtError(null);
    setYtProgress({ percent: 0, status: 'checking', message: 'מעדכן yt-dlp...' });
    
    try {
      const success = await updateYtDlp((msg) => {
        setYtProgress({ percent: 50, status: 'checking', message: msg });
      });
      
      if (success) {
        setYtProgress({ percent: 100, status: 'done', message: 'yt-dlp עודכן בהצלחה!' });
      } else {
        setYtError('לא ניתן לעדכן. נסה: winget upgrade yt-dlp');
        setYtProgress(null);
      }
    } catch {
      setYtError('שגיאה בעדכון');
      setYtProgress(null);
    } finally {
      setYtUpdating(false);
    }
  };



  const handleCheckForUpdates = async () => {
    setIsChecking(true);
    setNewPosts([]);
    setError(null);

    try {
      // Always fetch current month
      const now = new Date();
      const posts = await fetchPostsByDate(now.getFullYear(), now.getMonth() + 1);
      
      // Filter out already downloaded posts
      const state = getBlogSyncStatus();
      const syncState = getBlogSyncState();
      const newPostsFiltered = posts.filter(
        (post) => !syncState.downloadedPostIds.includes(post.id)
      );
      
      setNewPosts(newPostsFiltered);
      setSyncStatus(state);
    } catch (err) {
      console.error('Error checking for updates:', err);
      setError(err instanceof Error ? err.message : 'שגיאה בבדיקת עדכונים');
    } finally {
      setIsChecking(false);
    }
  };

  const handleDownloadPost = (post: BlogPost) => {
    // Filter URLs by artist whitelist/blacklist
    const filteredUrls = filterUrlsByArtist(post.audioUrls);
    if (filteredUrls.length > 0) {
      onBatchDownload(filteredUrls);
    }
    markPostAsDownloaded(post.id);
    setSyncStatus(getBlogSyncStatus());
    setNewPosts((prev) => prev.filter((p) => p.id !== post.id));
  };

  const handleDownloadAllNew = () => {
    for (const post of newPosts) {
      // Filter URLs by artist whitelist/blacklist
      const filteredUrls = filterUrlsByArtist(post.audioUrls);
      if (filteredUrls.length > 0) {
        onBatchDownload(filteredUrls);
      }
      markPostAsDownloaded(post.id);
    }
    setSyncStatus(getBlogSyncStatus());
    setNewPosts([]);
  };

  const getStatusText = (status: DownloadTask['status']) => {
    const map = {
      pending: 'ממתין...',
      downloading: 'מוריד...',
      completed: 'הושלם',
      error: 'שגיאה',
    };
    return map[status];
  };

  const getStatusIcon = (status: DownloadTask['status']) => {
    switch (status) {
      case 'completed':
        return <Checkmark24Regular className="icon--success" />;
      case 'error':
        return <Dismiss24Regular className="icon--error" />;
      default:
        return <ArrowDownload24Regular className={status === 'downloading' ? 'icon--pulse' : ''} />;
    }
  };

  const totalNewFiles = newPosts.reduce((sum, p) => sum + p.audioUrls.length, 0);

  return (
    <div className="download-manager">
      {/* Smart Update Section */}
      <div className="download-manager__smart-update">
        <div className="smart-update__header">
          <h3>עדכון שירים חדשים</h3>
          <Button
            appearance="primary"
            icon={isChecking ? <Spinner size="tiny" /> : <ArrowSync24Regular />}
            onClick={handleCheckForUpdates}
            disabled={isChecking}
          >
            {isChecking ? 'בודק...' : 'בדוק עדכונים'}
          </Button>
        </div>

        <div className="smart-update__status">
          <Info24Regular />
          <span>
            {syncStatus.lastSync
              ? `סנכרון אחרון: ${syncStatus.lastSync} | הורדו ${syncStatus.downloadedCount} פוסטים`
              : 'טרם בוצע סנכרון - לחץ "בדוק עדכונים" להתחיל'}
          </span>
        </div>

        {error && (
          <div className="smart-update__error">
            <Dismiss24Regular className="icon--error" />
            <span>{error}</span>
          </div>
        )}

        {newPosts.length > 0 && (
          <div className="smart-update__results">
            <div className="smart-update__results-header">
              <span>
                נמצאו {newPosts.length} פוסטים חדשים ({totalNewFiles} שירים)
              </span>
              <Button appearance="primary" onClick={handleDownloadAllNew}>
                הורד הכל
              </Button>
            </div>

            <div className="smart-update__posts">
              {newPosts.map((post) => (
                <Card key={post.id} className="post-card">
                  <CardHeader
                    image={
                      post.imageUrl ? (
                        <img src={post.imageUrl} alt="" className="post-card__image" />
                      ) : undefined
                    }
                    header={<Text weight="semibold">{post.title}</Text>}
                    description={
                      <div className="post-card__meta">
                        {post.date && <span>{formatPostDate(post.date)}</span>}
                        <Badge appearance="filled" color="informative">
                          {post.audioUrls.length} שירים
                        </Badge>
                      </div>
                    }
                    action={
                      <div className="post-card__actions">
                        {post.postUrl && (
                          <Button
                            appearance="subtle"
                            icon={<Open24Regular />}
                            as="a"
                            href={post.postUrl}
                            target="_blank"
                            title="פתח בדפדפן"
                          />
                        )}
                        <Button
                          appearance="outline"
                          icon={<ArrowDownload24Regular />}
                          onClick={() => handleDownloadPost(post)}
                        >
                          הורד
                        </Button>
                      </div>
                    }
                  />
                </Card>
              ))}
            </div>
          </div>
        )}

        {!isChecking && !error && newPosts.length === 0 && syncStatus.lastSync && (
          <div className="smart-update__empty">
            <Checkmark24Regular className="icon--success" />
            <span>הכל מעודכן!</span>
          </div>
        )}
      </div>

      {/* YouTube Download */}
      <div className="download-manager__manual">
        <div className="smart-update__header">
          <h3>הורדה מיוטיוב</h3>
          <Button
            appearance="subtle"
            icon={ytUpdating ? <Spinner size="tiny" /> : <ArrowSync24Regular />}
            onClick={handleUpdateYtDlp}
            disabled={ytUpdating || ytDownloading}
            title="עדכן yt-dlp"
          >
            עדכן
          </Button>
        </div>
        <p className="download-manager__hint">
          הדבק קישור YouTube להורדת אודיו באיכות גבוהה
        </p>
        <form className="download-manager__form" onSubmit={handleYouTubeDownload}>
          <Input
            placeholder="https://youtube.com/watch?v=..."
            contentBefore={<Video24Regular />}
            value={ytUrl}
            onChange={(_, data) => setYtUrl(data.value)}
            className="download-manager__input"
            disabled={ytDownloading}
          />
          <Button
            appearance="primary"
            icon={ytDownloading ? <Spinner size="tiny" /> : <ArrowDownload24Regular />}
            type="submit"
            disabled={!ytUrl.trim() || ytDownloading}
          >
            {ytDownloading ? 'מוריד...' : 'הורד'}
          </Button>
        </form>
        {ytProgress && (
          <div className="yt-progress">
            <span className="yt-progress__message">{ytProgress.message}</span>
            {ytProgress.status === 'downloading' && (
              <ProgressBar value={ytProgress.percent / 100} />
            )}
          </div>
        )}
        {ytError && (
          <div className="smart-update__error">
            <Dismiss24Regular className="icon--error" />
            <span>{ytError}</span>
          </div>
        )}
      </div>

      {/* Direct Download */}
      <div className="download-manager__manual">
        <h3>הורדה ישירה</h3>
        <p className="download-manager__hint">
          הדבק קישור ישיר לקובץ אודיו (mp3, wav, flac...)
        </p>
        <form className="download-manager__form" onSubmit={handleSubmit}>
          <Input
            placeholder="https://example.com/song.mp3"
            contentBefore={<Link24Regular />}
            value={url}
            onChange={(_, data) => setUrl(data.value)}
            className="download-manager__input"
          />
          <Button
            appearance="primary"
            icon={<ArrowDownload24Regular />}
            type="submit"
            disabled={!url.trim()}
          >
            הורד
          </Button>
        </form>
      </div>

      {/* Downloads List */}
      <div className="download-manager__list">
        <h3>הורדות ({downloads.length})</h3>

        {downloads.length === 0 ? (
          <div className="empty-state">
            <ArrowDownload24Regular className="empty-state__icon" />
            <p className="empty-state__title">אין הורדות</p>
            <p className="empty-state__text">בדוק עדכונים או הדבק קישור</p>
          </div>
        ) : (
          <div className="download-manager__items">
            {downloads.map((download) => (
              <Card key={download.id} className="download-item">
                <CardHeader
                  image={getStatusIcon(download.status)}
                  header={<Text weight="semibold">{download.title}</Text>}
                  description={
                    <span className="download-item__status">
                      {getStatusText(download.status)}
                      {download.status === 'downloading' && ` (${Math.round(download.progress)}%)`}
                      {download.error && (
                        <span className="download-item__error"> - {download.error}</span>
                      )}
                    </span>
                  }
                  action={
                    <>
                      {download.status === 'downloading' && (
                        <Button
                          appearance="subtle"
                          icon={<Dismiss24Regular />}
                          onClick={() => onCancelDownload(download.id)}
                        />
                      )}
                      {(download.status === 'completed' || download.status === 'error') && (
                        <Button
                          appearance="subtle"
                          icon={<Delete24Regular />}
                          onClick={() => onRemoveDownload(download.id)}
                        />
                      )}
                    </>
                  }
                />
                {download.status === 'downloading' && (
                  <ProgressBar value={download.progress / 100} className="download-item__progress" />
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
