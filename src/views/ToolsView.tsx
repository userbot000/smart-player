import { useState } from 'react';
import {
  Tab,
  TabList,
  SelectTabEvent,
  SelectTabData,
} from '@fluentui/react-components';
import { MusicNote224Regular, Tag24Regular } from '@fluentui/react-icons';
import { RingtoneCreator } from '../components/Tools/RingtoneCreator';
import { MetadataEditor } from '../components/Tools/MetadataEditor';
import { Song } from '../types';

interface ToolsViewProps {
  songs: Song[];
  onSongUpdated: () => void;
}

type ToolTab = 'ringtone' | 'metadata';

export function ToolsView({ songs, onSongUpdated }: ToolsViewProps) {
  const [selectedTab, setSelectedTab] = useState<ToolTab>('ringtone');

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
      </TabList>

      <div className="tools-view__content">
        {selectedTab === 'ringtone' && <RingtoneCreator songs={songs} />}
        {selectedTab === 'metadata' && <MetadataEditor songs={songs} onSongUpdated={onSongUpdated} />}
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
