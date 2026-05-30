import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

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
    fs: {
      // allow serving files from the monorepo root so @bts/shared resolves
      allow: ['../..'],
    },
  },
})
