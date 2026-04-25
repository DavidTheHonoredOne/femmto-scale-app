import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3')) return 'charts';
            if (id.includes('xlsx')) return 'excel';
            if (id.includes('react') || id.includes('react-dom')) return 'react-core';
            return 'vendor';
          }
        }
      }
    }
  }
})
