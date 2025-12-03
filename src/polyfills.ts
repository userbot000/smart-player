import { Buffer } from 'buffer';

// Polyfill Buffer for music-metadata-browser
(window as Window & { Buffer: typeof Buffer }).Buffer = Buffer;
