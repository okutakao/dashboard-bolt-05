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
      external: ['zwitch'],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          markdown: [
            'unified',
            'mdast-util-from-markdown',
            'mdast-util-to-markdown',
            'micromark',
            'micromark-util-types'
          ]
        }
      }
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020'
    },
    include: [
      'unified',
      'mdast-util-from-markdown',
      'mdast-util-to-markdown',
      'micromark',
      'micromark-util-types',
      'unist-util-stringify-position',
      'unist-util-visit'
    ]
  },
  server: {
    host: true,
    port: 5173,
    strictPort: false
  },
  resolve: {
    alias: {
      '@': '/src',
      'zwitch': 'zwitch/index.js'
    },
    dedupe: ['react', 'react-dom'],
    mainFields: ['module', 'jsnext:main', 'jsnext', 'main']
  },
  base: './'
});
