import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'ws://localhost:5000',
        ws: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) return 'react-vendor';
            if (id.includes('lucide-react') || id.includes('react-hot-toast')) return 'ui-vendor';
            if (id.includes('recharts')) return 'charts-vendor';
            if (id.includes('socket.io-client')) return 'socket-vendor';
            return 'vendor';
          }
        },
      },
    },
    // Warn if any single chunk exceeds 500 kB
    chunkSizeWarningLimit: 500,
  },
});
