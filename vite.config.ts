import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Custom Vite plugin to handle backend API routes in local development.
// API handler di-import secara dinamis agar proses `vite build` tidak memuat
// Prisma Client (mencegah proses build menggantung karena koneksi database).
function apiMiddlewarePlugin(): Plugin {
  return {
    name: 'api-middleware-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/')) {
          const { handleApiRequest } = await import('./src/server/apiHandler');
          const handled = await handleApiRequest(req, res);
          if (handled) return;
        }
        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), apiMiddlewarePlugin()],
  server: {
    port: 3000,
    open: false,
  },
});
