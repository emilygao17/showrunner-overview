import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite dev server runs on :5173 and proxies /api/* to the Express server on :3000.
// In production, Vercel serves the built static output and the serverless API
// functions; this proxy config only matters in local development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
