import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { readFileSync } from 'fs';

// Read version from package.json
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));
const appVersion = packageJson.version || '1.0.0';

export default defineConfig({
  base: '/',

  plugins: [react()],
  
  define: {
    // Inject app version at build time
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  optimizeDeps: {
    exclude: ['lucide-react'],
  },

  server: {
    host: true,
    port: 5173,
    strictPort: true,
    hmr: {
      timeout: 30000,
      overlay: true,
    },
  },

  build: {
    target: 'es2018',
    sourcemap: false,
    minify: 'esbuild',
    cssCodeSplit: true,
    assetsInlineLimit: 0,

    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'react-vendor';
            if (id.includes('@supabase')) return 'supabase-vendor';
            if (id.includes('@dnd-kit')) return 'dnd-vendor';
            return 'vendor';
          }
        },
      },
    },
  },
});
