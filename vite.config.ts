import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Dev convenience: forward /api to the NestJS backend.
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      // Uploaded files live outside the /api prefix. Without this, <img src="/uploads/...">
      // would hit the Vite dev server instead of the API and render as a broken image.
      // In S3 mode the backend answers with a 302 to a presigned URL, which the browser follows.
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
