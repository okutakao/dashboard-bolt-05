import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['zwitch', 'mdast-util-to-markdown', 'mdast-util-from-markdown'],
    esbuildOptions: {
      target: 'es2020'
    }
  },
  resolve: {
    alias: {
      'zwitch': 'zwitch/index.js'
    }
  },
  server: {
    host: true,
    port: 5173,
    strictPort: false,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    target: 'es2020',
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
      requireReturnsDefault: 'auto'
    },
    rollupOptions: {
      external: [],
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor';
            if (id.includes('mdast') || id.includes('zwitch')) return 'markdown';
            return 'vendor';
          }
        }
      }
    }
  },
  base: './'
});
