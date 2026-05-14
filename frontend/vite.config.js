import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_URL = process.env.VITE_API_URL || 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  // Bake the API URL into the production build
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(API_URL),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
      },
    },
  },
});
