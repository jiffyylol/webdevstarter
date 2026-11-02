import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Any request the React app makes to /api/... is forwarded to the Express
    // server. That way the frontend can just call "/api/restaurants/search".
    proxy: {
      '/api': 'http://localhost:5001',
    },
  },
});
