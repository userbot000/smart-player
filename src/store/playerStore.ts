import { create } from 'zustand';
import { Song, PlayerState } from '../types';

interface PlayerStore extends PlayerState {
  // Error state
  error: string | null;
  // Actions
  setSong: (song: Song) => void;
  setQueue: (songs: Song[]) => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  setQueueIndex: (index: number) => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  setError: (error: string | null) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  toggleSmartQueue: () => void;
  nextSong: () => void;
  prevSong: () => void;
  getSmartNextSong: () => Song | null;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  // Initial state
  currentSong: null,
  queue: [],
  queueIndex: -1,
  isPlaying: false,
  volume: 0.7,
  progress: 0,
  duration: 0,
  shuffle: false,
  repeat: 'none',
  smartQueue: true,
  error: null,

  // Actions
  setSong: (song) => set({ currentSong: song, progress: 0 }),
  
  setQueue: (songs) => set({ queue: songs }),
  
  addToQueue: (song) => set((state) => ({ 
    queue: [...state.queue, song] 
  })),
  
  removeFromQueue: (index) => set((state) => ({
    queue: state.queue.filter((_, i) => i !== index),
    queueIndex: state.queueIndex > index 
      ? state.queueIndex - 1 
      : state.queueIndex
  })),
  
  setQueueIndex: (index) => set({ queueIndex: index }),
  
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  
  setPlaying: (playing) => set({ isPlaying: playing }),
  
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
  
  setProgress: (progress) => set({ progress }),
  
  setDuration: (duration) => set({ duration }),
  
  setError: (error) => set({ error }),
  
  toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),
  
  cycleRepeat: () => set((state) => ({
    repeat: state.repeat === 'none' ? 'all' 
          : state.repeat === 'all' ? 'one' 
          : 'none'
  })),
  
  toggleSmartQueue: () => set((state) => ({ 
    smartQueue: !state.smartQueue 
  })),

  nextSong: () => {
    const { queue, queueIndex, repeat, shuffle, smartQueue } = get();
    if (queue.length === 0) return;

    let nextIndex: number;

    if (repeat === 'one') {
      set({ progress: 0 });
      return;
    }

    if (smartQueue) {
      const smartSong = get().getSmartNextSong();
      if (smartSong) {
        const smartIndex = queue.findIndex(s => s.id === smartSong.id);
        if (smartIndex !== -1) {
          nextIndex = smartIndex;
        } else {
          nextIndex = (queueIndex + 1) % queue.length;
        }
      } else {
        nextIndex = (queueIndex + 1) % queue.length;
      }
    } else if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = queueIndex + 1;
      if (nextIndex >= queue.length) {
        // End of queue - go back to start
        nextIndex = 0;
        if (repeat !== 'all') {
          // Stop playing but keep first song ready
          set({ 
            queueIndex: 0, 
            currentSong: queue[0],
            progress: 0,
            isPlaying: false 
          });
          return;
        }
      }
    }

    set({ 
      queueIndex: nextIndex, 
      currentSong: queue[nextIndex],
      progress: 0 
    });
  },

  prevSong: () => {
    const { queue, queueIndex, progress } = get();
    if (queue.length === 0) return;

    // If more than 3 seconds played, restart current song
    if (progress > 3) {
      set({ progress: 0 });
      return;
    }

    const prevIndex = queueIndex <= 0 ? queue.length - 1 : queueIndex - 1;
    set({ 
      queueIndex: prevIndex, 
      currentSong: queue[prevIndex],
      progress: 0 
    });
  },

  // Smart queue algorithm - prioritizes user favorites and similar songs
  getSmartNextSong: () => {
    const { queue, currentSong, queueIndex } = get();
    if (!currentSong || queue.length <= 1) return null;

    // Get all candidates except current song
    const candidates = queue.filter((_, index) => index !== queueIndex);

    if (candidates.length === 0) return null;

    // Find max play count for normalization
    const maxPlayCount = Math.max(...candidates.map(s => s.playCount), 1);

    // Calculate weights for each candidate
    const calculateWeight = (song: Song): number => {
      let weight = 1;

      // HIGH PRIORITY: Favorites get big boost (+4 points)
      if (song.isFavorite) {
        weight += 4;
      }

      // HIGH PRIORITY: Songs user listens to a lot (0-5 points)
      const playCountScore = (song.playCount / maxPlayCount) * 5;
      weight += playCountScore;

      // MEDIUM PRIORITY: Same genre (+2 points)
      if (song.genre && currentSong.genre && song.genre === currentSong.genre) {
        weight += 2;
      }

      // MEDIUM PRIORITY: Same artist (+1.5 points)
      if (song.artist === currentSong.artist) {
        weight += 1.5;
      }

      // MEDIUM PRIORITY: Same album (+1 point)
      if (song.album && currentSong.album && song.album === currentSong.album) {
        weight += 1;
      }

      // LOW PRIORITY: Similar energy level (+0-2 points)
      if (song.energy && currentSong.energy) {
        const energyDiff = Math.abs(song.energy - currentSong.energy);
        weight += (1 - energyDiff) * 2;
      }

      // VARIETY: Penalize recently played songs slightly (-0-1 points)
      // This prevents the same songs from playing over and over
      if (song.lastPlayed) {
        const hoursSincePlay = (Date.now() - song.lastPlayed) / (1000 * 60 * 60);
        if (hoursSincePlay < 2) {
          weight -= 1; // Played in last 2 hours - reduce weight
        } else if (hoursSincePlay < 24) {
          weight -= 0.5; // Played today - slight reduction
        }
      }

      // DISCOVERY: New songs (added in last 7 days) get boost (+2 points)
      const daysSinceAdded = (Date.now() - song.addedAt) / (1000 * 60 * 60 * 24);
      if (daysSinceAdded < 7) {
        weight += 2 * (1 - daysSinceAdded / 7);
      }

      // DISCOVERY: Songs never played get a small boost (+1 point)
      if (song.playCount === 0) {
        weight += 1;
      }

      return Math.max(weight, 0.1); // Ensure minimum weight
    };

    const weights = candidates.map(calculateWeight);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < candidates.length; i++) {
      random -= weights[i];
      if (random <= 0) return candidates[i];
    }

    return candidates[0];
  }
}));
