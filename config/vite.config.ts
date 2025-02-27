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
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    }
  },
  optimizeDeps: {
    include: [
      'zwitch',
      'mdast-util-to-markdown',
      'mdast-util-from-markdown',
      'unified',
      'unist-util-stringify-position',
      'unist-util-visit'
    ],
    exclude: ['@radix-ui/react-select']
  },
  server: {
    host: true,
    port: 5173,
    strictPort: false
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    mainFields: ['module', 'jsnext:main', 'jsnext', 'main']
  },
  base: './'
});
