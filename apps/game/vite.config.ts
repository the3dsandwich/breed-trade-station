import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
  },
})
