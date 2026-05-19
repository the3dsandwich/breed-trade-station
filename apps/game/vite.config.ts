import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['pixi.js', '@pixi/react'],
  },
  resolve: {
    alias: {
      '@bts/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: [
      'coder-claude-vscode-server.the3dsandwich.com',
    ],
    cors: {
      origin: [
        'http://10.0.0.35:5173',
        'http://localhost:5173',
      ],
    },
    fs: {
      // allow serving files from the monorepo root so @bts/shared resolves
      allow: ['../..'],
    },
  },
})
