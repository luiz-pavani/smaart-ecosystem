import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Aumenta o limite do aviso para 1600kb (para parar de reclamar)
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Separa bibliotecas pesadas em arquivos diferentes
          if (id.includes('node_modules')) {
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'pdf-libs';
            }
            if (id.includes('react-youtube') || id.includes('lucide-react')) {
              return 'ui-libs';
            }
            return 'vendor'; // O resto vai para vendor
          }
        },
      },
    },
  },
})
