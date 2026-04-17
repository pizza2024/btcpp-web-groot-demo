import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? '/bt-editor/' : '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // Separate heavy libraries into their own chunks for better caching
          if (id.includes('node_modules/@xyflow')) {
            return 'vendor-xyflow'
          }
          if (id.includes('node_modules/react')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules/zustand')) {
            return 'vendor-zustand'
          }
          if (id.includes('node_modules/i18next')) {
            return 'vendor-i18n'
          }
          if (id.includes('node_modules') && (id.includes('html2canvas') || id.includes('dagre'))) {
            return 'vendor-other'
          }
        },
      },
    },
    // Increase warning limit since we have legitimate large chunks from libraries
    chunkSizeWarningLimit: 1000,
  },
})
