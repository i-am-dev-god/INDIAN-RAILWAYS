import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves this project from /INDIAN-RAILWAYS/; local preview stays at /.
  base: process.env.GITHUB_PAGES === 'true' ? '/INDIAN-RAILWAYS/' : '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    allowedHosts: true,
  },
});
