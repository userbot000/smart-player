import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'mini-player': resolve(__dirname, 'public/mini-player.html'),
      },
    },
  },

  // Add Buffer polyfill for music-metadata-browser
  define: {
    global: 'globalThis',
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
        protocol: 'ws',
        host,
        port: 1421,
      }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ['**/src-tauri/**'],
    },
    // Proxy for blog RSS feed to bypass CORS
    proxy: {
      '/api/blog': {
        target: 'https://newsmusic.blogspot.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/blog/, ''),
      },
    },
  },
}));
