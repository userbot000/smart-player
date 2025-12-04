import { useState, useEffect } from 'react';
import {
  Tab,
  TabList,
  SelectTabEvent,
  SelectTabData,
} from '@fluentui/react-components';
import { MusicNote224Regular, Tag24Regular, FolderArrowRight24Regular } from '@fluentui/react-icons';
import { RingtoneCreator } from '../components/Tools/RingtoneCreator';
import { MetadataEditor } from '../components/Tools/MetadataEditor';
import { SinglesOrganizer } from '../components/Tools/SinglesOrganizer';
import { Song } from '../types';

interface ToolsViewProps {
  songs: Song[];
  onSongUpdated: () => void;
  initialSong?: Song;
  initialTab?: 'ringtone' | 'metadata' | 'organizer';
}

type ToolTab = 'ringtone' | 'metadata' | 'organizer';

export function ToolsView({ songs, onSongUpdated, initialSong, initialTab }: ToolsViewProps) {
  const [selectedTab, setSelectedTab] = useState<ToolTab>(initialTab || 'ringtone');

  useEffect(() => {
    if (initialTab) {
      setSelectedTab(initialTab);
    }
  }, [initialTab]);

  const handleTabSelect = (_: SelectTabEvent, data: SelectTabData) => {
    setSelectedTab(data.value as ToolTab);
  };

  return (
    <div className="view tools-view">
      <div className="view__header">
        <h2 className="view__title">כלים</h2>
      </div>

      <TabList selectedValue={selectedTab} onTabSelect={handleTabSelect} className="tools-view__tabs">
        <Tab value="ringtone" icon={<MusicNote224Regular />}>
          יצירת רינגטון
        </Tab>
        <Tab value="metadata" icon={<Tag24Regular />}>
          עריכת תגיות
        </Tab>
        <Tab value="organizer" icon={<FolderArrowRight24Regular />}>
          מסדר הסינגלים
        </Tab>
      </TabList>

      <div className="tools-view__content">
        <div style={{ display: selectedTab === 'ringtone' ? 'block' : 'none' }}>
          <RingtoneCreator songs={songs} initialSong={initialSong} />
        </div>
        <div style={{ display: selectedTab === 'metadata' ? 'block' : 'none' }}>
          <MetadataEditor songs={songs} onSongUpdated={onSongUpdated} initialSong={initialSong} />
        </div>
        <div style={{ display: selectedTab === 'organizer' ? 'block' : 'none' }}>
          <SinglesOrganizer onSongsUpdated={onSongUpdated} />
        </div>
      </div>

      <style>{`
        .tools-view {
          max-width: 800px;
        }
        .tools-view__tabs {
          margin-bottom: var(--space-lg);
        }
        .tools-view__content {
          background: var(--surface-card);
          border-radius: var(--radius-lg);
          padding: var(--space-lg);
        }
      `}</style>
    </div>
  );
}
