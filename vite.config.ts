import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import basicSsl from '@vitejs/plugin-basic-ssl';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/suryaverify/",
  server: {
    host: "::",
    port: 8080,
    https: true, // Enable HTTPS
    proxy: {
      '/api/gemini': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gemini/, ''),
        secure: true,
      },
      '/api/mapbox': {
        target: 'https://api.mapbox.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mapbox/, ''),
        secure: true,
      }
    }
  },
  plugins: [
    react(),
    basicSsl()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
