import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages currently publishes the repository root. The committed
// index.html points at ./assets, while Vite itself always builds from source.
const base = process.env.VITE_PAGES_BASE || '/';

function sourceEntryPlugin() {
  return {
    name: 'source-entry',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html
          .replace('href="./public/favicon.svg"', 'href="/favicon.svg"')
          .replace(/\s*<link rel="stylesheet" href="\.\/assets\/app\.css" \/>/, '')
          .replace('src="./assets/app.js"', 'src="/src/main.jsx"');
      },
    },
  };
}

export default defineConfig({
  base,
  plugins: [sourceEntryPlugin(), react()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames(assetInfo) {
          const name = assetInfo.names?.[0] || assetInfo.name || '';
          if (name.endsWith('.css')) return 'assets/app.css';
          return 'assets/[name][extname]';
        },
      },
    },
  },
});
