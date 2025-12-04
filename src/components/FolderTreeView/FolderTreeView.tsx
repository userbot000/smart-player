import { useState, useMemo, ReactElement } from 'react';
import { Input, Button } from '@fluentui/react-components';
import {
    Search24Regular,
    Folder24Regular,
    FolderOpen24Regular,
    ChevronRight24Regular,
    ChevronDown24Regular,
} from '@fluentui/react-icons';
import { Song } from '../../types';
import { SongList } from '../SongList/SongList';
import './FolderTreeView.css';

interface FolderTreeViewProps {
    songs: Song[];
    onDelete?: (id: string) => void;
    onToggleFavorite?: (id: string) => void;
}

interface FolderNode {
    name: string;
    path: string;
    songs: Song[];
    subFolders: Map<string, FolderNode>;
}

export function FolderTreeView({ songs, onDelete, onToggleFavorite }: FolderTreeViewProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

    // Build folder tree structure
    const folderTree = useMemo(() => {
        const root: FolderNode = {
            name: 'root',
            path: '',
            songs: [],
            subFolders: new Map(),
        };

        songs.forEach((song) => {
            if (!song.subFolder) {
                // Song in root folder
                root.songs.push(song);
            } else {
                // Song in subfolder
                const parts = song.subFolder.split(/[/\\]/);
                let currentNode = root;

                parts.forEach((part, index) => {
                    const path = parts.slice(0, index + 1).join('/');

                    if (!currentNode.subFolders.has(part)) {
                        currentNode.subFolders.set(part, {
                            name: part,
                            path,
                            songs: [],
                            subFolders: new Map(),
                        });
                    }

                    currentNode = currentNode.subFolders.get(part)!;
                });

                currentNode.songs.push(song);
            }
        });

        return root;
    }, [songs]);

    // Filter songs by search query
    const filteredSongs = useMemo(() => {
        if (!searchQuery) return songs;
        const query = searchQuery.toLowerCase();
        return songs.filter(
            (song) => song.title.toLowerCase().includes(query) || song.artist.toLowerCase().includes(query)
        );
    }, [songs, searchQuery]);

    const toggleFolder = (path: string) => {
        setExpandedFolders((prev) => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    };

    const expandAll = () => {
        const allPaths = new Set<string>();
        const collectPaths = (node: FolderNode) => {
            node.subFolders.forEach((subNode) => {
                allPaths.add(subNode.path);
                collectPaths(subNode);
            });
        };
        collectPaths(folderTree);
        setExpandedFolders(allPaths);
    };

    const collapseAll = () => {
        setExpandedFolders(new Set());
    };

    const renderFolderNode = (node: FolderNode, level: number = 0): ReactElement[] => {
        const elements: ReactElement[] = [];
        const isExpanded = expandedFolders.has(node.path);

        // Render current folder (skip root)
        if (node.path) {
            const hasSubFolders = node.subFolders.size > 0;

            elements.push(
                <div
                    key={node.path}
                    className="folder-tree__folder"
                    style={{ paddingRight: `${level * 24}px` }}
                    onClick={() => hasSubFolders && toggleFolder(node.path)}
                >
                    <div className="folder-tree__folder-header">
                        {hasSubFolders && (
                            <span className="folder-tree__chevron">
                                {isExpanded ? <ChevronDown24Regular /> : <ChevronRight24Regular />}
                            </span>
                        )}
                        <span className="folder-tree__folder-icon">
                            {isExpanded ? <FolderOpen24Regular /> : <Folder24Regular />}
                        </span>
                        <span className="folder-tree__folder-name">{node.name}</span>
                        <span className="folder-tree__folder-count">
                            ({node.songs.length} {node.songs.length === 1 ? 'שיר' : 'שירים'})
                        </span>
                    </div>
                </div>
            );

            // Render songs in this folder
            if (isExpanded && node.songs.length > 0) {
                elements.push(
                    <div key={`${node.path}-songs`} style={{ paddingRight: `${(level + 1) * 24}px` }}>
                        <SongList
                            songs={node.songs}
                            onDelete={onDelete}
                            onToggleFavorite={onToggleFavorite}
                            showSearch={false}
                        />
                    </div>
                );
            }
        }

        // Render subfolders
        if (isExpanded || !node.path) {
            node.subFolders.forEach((subNode) => {
                elements.push(...renderFolderNode(subNode, node.path ? level + 1 : level));
            });
        }

        // Render root songs (songs without subfolder)
        if (!node.path && node.songs.length > 0) {
            elements.push(
                <div key="root-songs">
                    <SongList
                        songs={node.songs}
                        onDelete={onDelete}
                        onToggleFavorite={onToggleFavorite}
                        showSearch={false}
                    />
                </div>
            );
        }

        return elements;
    };

    if (songs.length === 0) {
        return null;
    }

    // If searching, show flat list
    if (searchQuery) {
        return (
            <div className="folder-tree">
                <div className="folder-tree__header">
                    <Input
                        placeholder="חיפוש..."
                        contentBefore={<Search24Regular />}
                        value={searchQuery}
                        onChange={(_, data) => setSearchQuery(data.value)}
                        className="folder-tree__search"
                    />
                </div>
                <SongList
                    songs={filteredSongs}
                    onDelete={onDelete}
                    onToggleFavorite={onToggleFavorite}
                    showSearch={false}
                />
            </div>
        );
    }

    return (
        <div className="folder-tree">
            <div className="folder-tree__header">
                <Input
                    placeholder="חיפוש..."
                    contentBefore={<Search24Regular />}
                    value={searchQuery}
                    onChange={(_, data) => setSearchQuery(data.value)}
                    className="folder-tree__search"
                />
                <div className="folder-tree__actions">
                    <Button size="small" appearance="subtle" onClick={expandAll}>
                        פתח הכל
                    </Button>
                    <Button size="small" appearance="subtle" onClick={collapseAll}>
                        סגור הכל
                    </Button>
                </div>
            </div>

            <div className="folder-tree__content">
                {renderFolderNode(folderTree)}
            </div>
        </div>
    );
}
