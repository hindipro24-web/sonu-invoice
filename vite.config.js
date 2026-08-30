import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const nativeBuild = process.env.CAPACITOR_BUILD === 'true'

export default defineConfig({
  plugins: [
    react(),
    !nativeBuild && VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: false,
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
      },
    }),
  ].filter(Boolean),
  base: nativeBuild ? './' : '/sonu-invoice/',
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
