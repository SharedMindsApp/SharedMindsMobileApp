import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Read version from package.json
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));
const appVersion = packageJson.version || '1.0.0';

// Plugin to generate version.json during build
function generateVersionPlugin() {
  return {
    name: 'generate-version',
    generateBundle() {
      // Generate version.json content
      const versionData = {
        version: appVersion,
        timestamp: new Date().toISOString(),
        buildTime: Date.now(),
      };
      
      // Write to dist folder
      const distPath = join(process.cwd(), 'dist', 'version.json');
      writeFileSync(distPath, JSON.stringify(versionData, null, 2), 'utf-8');
      
      console.log(`[generate-version] Generated version.json with version: ${appVersion}`);
    },
  };
}

export default defineConfig({
  base: '/',

  plugins: [
    react(),
    generateVersionPlugin(),
  ],
  
  define: {
    // Inject app version at build time
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },

  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['react', 'react-dom', 'recharts'],
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
            if (id.includes('react') || id.includes('react-dom')) return 'react-vendor';
            if (id.includes('recharts')) return 'react-vendor'; // Bundle recharts with React
            if (id.includes('@supabase')) return 'supabase-vendor';
            if (id.includes('@dnd-kit')) return 'dnd-vendor';
            return 'vendor';
          }
        },
      },
    },
  },
});
