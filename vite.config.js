import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite-Konfiguration für OG Ninja Comp
// Capacitor erwartet den Build-Output in /dist
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    // Sourcemaps für Debugging in Capacitor WebView
    sourcemap: true,
  },
  server: {
    // Lokaler Dev-Server
    port: 3000,
    host: true,
  },
  // Optimierungen für Mobile
  optimizeDeps: {
    include: ['react', 'react-dom', 'firebase/app', 'firebase/database'],
  },
});
