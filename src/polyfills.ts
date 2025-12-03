import { Buffer } from 'buffer';

// Polyfill Buffer for music-metadata-browser
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).Buffer = Buffer;
