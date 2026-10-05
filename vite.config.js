import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages currently publishes the repository root. The committed
// index.html points at ./assets, while Vite itself always builds from source.
const base = process.env.VITE_PAGES_BASE || '/';

function transcriptApiConfigPlugin() {
  const file = path.resolve('transcript-api.txt');
  const serve = (request, response, next) => {
    const url = request.url?.split('?')[0];
    if (url !== '/transcript-api.txt') {
      next();
      return;
    }
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.end(fs.readFileSync(file));
  };

  return {
    name: 'transcript-api-config',
    configureServer(server) {
      server.middlewares.use(serve);
    },
    configurePreviewServer(server) {
      server.middlewares.use(serve);
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'transcript-api.txt',
        source: fs.readFileSync(file),
      });
    },
  };
}

function sourceEntryPlugin() {
  return {
    name: 'source-entry',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html
          .replace('href="./public/favicon.svg"', 'href="/favicon.svg"')
          .replace(/\s*<link rel="stylesheet" href="\.\/assets\/app\.css" \/>/, '')
          .replace(
            '<script src="./assets/app.js"></script>',
            '<script type="module" src="/src/main.jsx"></script>',
          );
      },
    },
  };
}

export default defineConfig({
  base,
  plugins: [transcriptApiConfigPlugin(), sourceEntryPlugin(), react()],
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
