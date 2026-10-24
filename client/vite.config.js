import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const API = 'http://localhost:3001';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Lets a Cloudflare quick tunnel reach the dev server (for testing on a phone).
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': API,
      '/snapshots': API,
      '/socket.io': { target: API, ws: true },
    },
  },
});
