import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['zwitch', 'mdast-util-to-markdown', 'mdast-util-from-markdown'],
    force: true
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
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          markdown: ['zwitch', 'mdast-util-to-markdown', 'mdast-util-from-markdown']
        },
      },
    },
  },
  base: './'
});
