import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: {
    // 5173 é o padrão documentado; PORT permite subir em outra porta quando
    // ela já estiver ocupada por outro projeto na mesma máquina.
    port: Number(process.env.PORT) || 5173,
    // Encaminha /api para o back-end: o front usa caminho relativo e não há
    // CORS no desenvolvimento (docs/07 §6).
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
