import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/sonu-invoice/',
  build: {
    sourcemap: false,
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'framer-motion'],
          pdf: ['jspdf', 'jspdf-autotable'],
          icons: ['lucide-react'],
        },
      },
    },
  }
})
