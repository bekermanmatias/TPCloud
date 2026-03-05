import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Prioridad: VITE_API_PROXY_TARGET → VITE_API_ORIGIN → VITE_API_URL (sin /api) → localhost
  const fromApiUrl = env.VITE_API_URL ? env.VITE_API_URL.replace(/\/api\/?$/, '') : undefined;
  const proxyTarget =
    env.VITE_API_PROXY_TARGET ||
    env.VITE_API_ORIGIN ||
    fromApiUrl ||
    'http://localhost:3000';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        }
      }
    }
  };
});

