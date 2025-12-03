import { DownloadTask } from '../types';
import { DownloadManager } from '../components/Downloads/DownloadManager';

interface DownloadsViewProps {
  downloads: DownloadTask[];
  onStartDownload: (url: string) => void;
  onCancelDownload: (id: string) => void;
  onRemoveDownload: (id: string) => void;
  onBatchDownload: (urls: string[]) => void;
}

export function DownloadsView({
  downloads,
  onStartDownload,
  onCancelDownload,
  onRemoveDownload,
  onBatchDownload,
}: DownloadsViewProps) {
  return (
    <div className="view downloads-view">
      <div className="downloads-view__header">
        <h2 className="view__title">הורדות</h2>
        <p className="view__subtitle">הורד שירים מיוטיוב ופלטפורמות אחרות</p>
      </div>

      <DownloadManager
        downloads={downloads}
        onStartDownload={onStartDownload}
        onCancelDownload={onCancelDownload}
        onRemoveDownload={onRemoveDownload}
        onBatchDownload={onBatchDownload}
      />
    </div>
  );
}
