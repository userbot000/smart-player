// YouTube Channel Tracker
// Monitors channels for new videos and notifies user

import { Command } from '@tauri-apps/plugin-shell';
import {
    isPermissionGranted,
    requestPermission,
    sendNotification,
} from '@tauri-apps/plugin-notification';

const STORAGE_KEY = 'yt_tracked_channels';
const CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes

export interface TrackedChannel {
    id: string;
    name: string;
    url: string;
    lastVideoId: string | null;
    lastCheck: number;
    addedAt: number;
}

export interface ChannelVideo {
    id: string;
    title: string;
    url: string;
    publishedAt?: string;
}

// Get tracked channels from localStorage
export function getTrackedChannels(): TrackedChannel[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch {
        // Ignore parse errors
    }
    return [];
}

// Save tracked channels
export function saveTrackedChannels(channels: TrackedChannel[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(channels));
}

// Extract channel ID/handle from URL
function extractChannelId(url: string): string | null {
    const patterns = [
        /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
        /youtube\.com\/@([a-zA-Z0-9_-]+)/,
        /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
        /youtube\.com\/user\/([a-zA-Z0-9_-]+)/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }

    // Maybe it's just the channel ID or handle
    if (url.startsWith('@') || /^UC[a-zA-Z0-9_-]{22}$/.test(url)) {
        return url;
    }

    return null;
}

// Get channel info using yt-dlp
export async function getChannelInfo(
    url: string
): Promise<{ id: string; name: string; url: string } | null> {
    try {
        const command = Command.create('powershell', [
            '-NoProfile',
            '-Command',
            `yt-dlp "${url}" --no-check-certificate --dump-json --playlist-items 1 --flat-playlist`,
        ]);

        const output = await command.execute();
        if (output.code !== 0) return null;

        const info = JSON.parse(output.stdout);
        return {
            id: info.channel_id || info.uploader_id || extractChannelId(url) || url,
            name: info.channel || info.uploader || 'ערוץ לא ידוע',
            url: info.channel_url || url,
        };
    } catch {
        return null;
    }
}

// Get latest videos from channel
export async function getLatestVideos(
    channelUrl: string,
    limit: number = 5
): Promise<ChannelVideo[]> {
    try {
        const command = Command.create('powershell', [
            '-NoProfile',
            '-Command',
            `yt-dlp "${channelUrl}/videos" --no-check-certificate --dump-json --playlist-items 1-${limit} --flat-playlist`,
        ]);

        const output = await command.execute();
        if (output.code !== 0) return [];

        const videos: ChannelVideo[] = [];
        const lines = output.stdout.trim().split('\n');

        for (const line of lines) {
            try {
                const info = JSON.parse(line);
                videos.push({
                    id: info.id,
                    title: info.title,
                    url: `https://youtube.com/watch?v=${info.id}`,
                    publishedAt: info.upload_date,
                });
            } catch {
                // Skip invalid lines
            }
        }

        return videos;
    } catch {
        return [];
    }
}

// Add channel to tracking
export async function addTrackedChannel(
    url: string
): Promise<{ success: boolean; channel?: TrackedChannel; error?: string }> {
    const channelId = extractChannelId(url);
    if (!channelId) {
        return { success: false, error: 'כתובת ערוץ לא תקינה' };
    }

    const channels = getTrackedChannels();

    // Check if already tracked
    if (channels.some((c) => c.id === channelId || c.url === url)) {
        return { success: false, error: 'הערוץ כבר במעקב' };
    }

    // Get channel info
    const info = await getChannelInfo(url);
    if (!info) {
        return { success: false, error: 'לא ניתן לקבל מידע על הערוץ' };
    }

    // Get latest video
    const videos = await getLatestVideos(info.url, 1);
    const lastVideoId = videos.length > 0 ? videos[0].id : null;

    const channel: TrackedChannel = {
        id: info.id,
        name: info.name,
        url: info.url,
        lastVideoId,
        lastCheck: Date.now(),
        addedAt: Date.now(),
    };

    channels.push(channel);
    saveTrackedChannels(channels);

    return { success: true, channel };
}

// Remove channel from tracking
export function removeTrackedChannel(channelId: string): void {
    const channels = getTrackedChannels();
    const filtered = channels.filter((c) => c.id !== channelId);
    saveTrackedChannels(filtered);
}

// Check for new videos on a channel
export async function checkChannelForNewVideos(
    channel: TrackedChannel
): Promise<ChannelVideo[]> {
    const videos = await getLatestVideos(channel.url, 10);

    if (!channel.lastVideoId) {
        return videos.slice(0, 1); // First time, return only latest
    }

    // Find new videos (before the last known video)
    const newVideos: ChannelVideo[] = [];
    for (const video of videos) {
        if (video.id === channel.lastVideoId) break;
        newVideos.push(video);
    }

    return newVideos;
}

// Send notification for new videos
async function sendNewVideoNotification(
    channelName: string,
    videoCount: number
): Promise<void> {
    let permissionGranted = await isPermissionGranted();

    if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
    }

    if (permissionGranted) {
        sendNotification({
            title: 'סרטונים חדשים!',
            body:
                videoCount === 1
                    ? `סרטון חדש בערוץ ${channelName}`
                    : `${videoCount} סרטונים חדשים בערוץ ${channelName}`,
        });
    }
}

// Check all tracked channels for updates
export async function checkAllChannelsForUpdates(
    onNewVideos?: (channel: TrackedChannel, videos: ChannelVideo[]) => void
): Promise<{ channel: TrackedChannel; newVideos: ChannelVideo[] }[]> {
    const channels = getTrackedChannels();
    const results: { channel: TrackedChannel; newVideos: ChannelVideo[] }[] = [];

    for (const channel of channels) {
        const newVideos = await checkChannelForNewVideos(channel);

        if (newVideos.length > 0) {
            // Update last video ID
            channel.lastVideoId = newVideos[0].id;
            channel.lastCheck = Date.now();

            // Send notification
            await sendNewVideoNotification(channel.name, newVideos.length);

            results.push({ channel, newVideos });
            onNewVideos?.(channel, newVideos);
        } else {
            channel.lastCheck = Date.now();
        }
    }

    // Save updated channels
    saveTrackedChannels(channels);

    return results;
}

// Start background checking (call this on app start)
let checkInterval: ReturnType<typeof setInterval> | null = null;

export function startChannelTracking(
    onNewVideos?: (channel: TrackedChannel, videos: ChannelVideo[]) => void
): void {
    if (checkInterval) return;

    // Check immediately
    checkAllChannelsForUpdates(onNewVideos);

    // Then check periodically
    checkInterval = setInterval(() => {
        checkAllChannelsForUpdates(onNewVideos);
    }, CHECK_INTERVAL);
}

export function stopChannelTracking(): void {
    if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
    }
}
