import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    target: 'es2020',
    rollupOptions: {
      external: [],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          markdown: ['zwitch', 'mdast-util-to-markdown', 'mdast-util-from-markdown']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['zwitch', 'mdast-util-to-markdown', 'mdast-util-from-markdown'],
    exclude: ['@radix-ui/react-select']
  },
  server: {
    host: true,
    port: 5173,
    strictPort: false
  },
  resolve: {
    alias: {
      'zwitch': 'zwitch/index.js'
    }
  },
  base: './'
});
