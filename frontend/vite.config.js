import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = fileURLToPath(new URL('.', import.meta.url));
const copyStaticResources = {
  name: 'copy-static-resources',
  async closeBundle() {
    const outputDirectory = resolve(frontendRoot, 'dist');
    await Promise.all(
      ['assets', 'scripts', 'styles'].map((directory) =>
        cp(
          resolve(frontendRoot, directory),
          resolve(outputDirectory, directory),
          { recursive: true }
        )
      )
    );
    await Promise.all(
      ['manifest.json', 'sw.js'].map((file) =>
        cp(resolve(frontendRoot, file), resolve(outputDirectory, file))
      )
    );
  }
};

export default defineConfig({
  plugins: [react(), copyStaticResources],
  build: {
    rollupOptions: {
      input: {
        explorer: resolve(frontendRoot, 'index.html'),
        documentView: resolve(frontendRoot, 'pages/document-view.html'),
        library: resolve(frontendRoot, 'pages/library.html'),
        login: resolve(frontendRoot, 'pages/login.html'),
        notifications: resolve(frontendRoot, 'pages/notifications.html'),
        parcours: resolve(frontendRoot, 'pages/parcours.html'),
        profile: resolve(frontendRoot, 'pages/profile.html'),
        register: resolve(frontendRoot, 'pages/register.html'),
        upload: resolve(frontendRoot, 'pages/upload.html')
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  preview: {
    host: '0.0.0.0',
    port: 4173
  }
});
