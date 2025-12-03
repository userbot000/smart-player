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
  Search24Regular,
  DocumentBulletList24Regular,
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
import { scrapeAudioFiles, ScrapeResult } from '../../utils/downloadAudio';
import { filterUrlsByArtist } from '../../utils/artistFilters';
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
  
  // Smart scraping state
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<ScrapeResult | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

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

  // Smart scrape handler
  const handleScrapeUrl = async () => {
    if (!url.trim()) return;
    
    setIsScraping(true);
    setScrapeResult(null);
    setSelectedFiles(new Set());
    setError(null);

    try {
      const result = await scrapeAudioFiles(url.trim());
      setScrapeResult(result);
      
      if (result.error) {
        setError(result.error);
      } else if (result.files.length === 0) {
        setError('לא נמצאו קבצי אודיו בכתובת זו');
      } else {
        // Select all files by default
        setSelectedFiles(new Set(result.files.map(f => f.url)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בגירוד הדף');
    } finally {
      setIsScraping(false);
    }
  };

  const handleToggleFile = (fileUrl: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileUrl)) {
        newSet.delete(fileUrl);
      } else {
        newSet.add(fileUrl);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (scrapeResult) {
      setSelectedFiles(new Set(scrapeResult.files.map(f => f.url)));
    }
  };

  const handleDeselectAll = () => {
    setSelectedFiles(new Set());
  };

  const handleDownloadSelected = () => {
    if (selectedFiles.size > 0) {
      onBatchDownload(Array.from(selectedFiles));
      setScrapeResult(null);
      setSelectedFiles(new Set());
      setUrl('');
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

      {/* Smart URL Scraping */}
      <div className="download-manager__manual">
        <h3>הורדה חכמה</h3>
        <p className="download-manager__hint">
          הדבק כתובת של דף עם קבצי אודיו או קישור ישיר להורדה
        </p>
        <form className="download-manager__form" onSubmit={handleSubmit}>
          <Input
            placeholder="https://example.com/music או קישור ישיר לקובץ"
            contentBefore={<Link24Regular />}
            value={url}
            onChange={(_, data) => setUrl(data.value)}
            className="download-manager__input"
          />
          <Button
            appearance="outline"
            icon={isScraping ? <Spinner size="tiny" /> : <Search24Regular />}
            onClick={handleScrapeUrl}
            disabled={!url.trim() || isScraping}
            title="סרוק את הדף ומצא קבצי אודיו"
          >
            סרוק
          </Button>
          <Button
            appearance="primary"
            icon={<ArrowDownload24Regular />}
            type="submit"
            disabled={!url.trim()}
            title="הורד ישירות (לקישורים ישירים)"
          >
            הורד
          </Button>
        </form>

        {/* Scrape Results */}
        {scrapeResult && scrapeResult.files.length > 0 && (
          <div className="scrape-results">
            <div className="scrape-results__header">
              <div className="scrape-results__info">
                <DocumentBulletList24Regular />
                <span>
                  {scrapeResult.pageTitle && <strong>{scrapeResult.pageTitle}: </strong>}
                  נמצאו {scrapeResult.files.length} קבצי אודיו
                </span>
              </div>
              <div className="scrape-results__actions">
                <Button appearance="subtle" size="small" onClick={handleSelectAll}>
                  בחר הכל
                </Button>
                <Button appearance="subtle" size="small" onClick={handleDeselectAll}>
                  נקה בחירה
                </Button>
                <Button
                  appearance="primary"
                  size="small"
                  icon={<ArrowDownload24Regular />}
                  onClick={handleDownloadSelected}
                  disabled={selectedFiles.size === 0}
                >
                  הורד ({selectedFiles.size})
                </Button>
              </div>
            </div>
            <div className="scrape-results__list">
              {scrapeResult.files.map((file) => (
                <label key={file.url} className="scrape-results__item">
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.url)}
                    onChange={() => handleToggleFile(file.url)}
                  />
                  <span className="scrape-results__name">{file.name}</span>
                  {file.size && (
                    <span className="scrape-results__size">{formatFileSize(file.size)}</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}
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
