import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// dev-сервер Vite проксирует /ws и /api на бэк, чтобы фронт мог жить за
// одним origin'ом и не упираться в CORS даже после билда.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8787',
        ws: true,
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
});
