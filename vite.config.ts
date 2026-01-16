import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Add bundle analyzer in analyze mode
    mode === 'analyze' && visualizer({
      filename: 'dist/bundle-analysis.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    })
  ].filter(Boolean),
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'howler-vendor': ['howler'],
          
          // Game chunks
          'game-core': [
            './src/App.tsx',
            './src/components/Modal.tsx',
            './src/components/ErrorModal.tsx',
            './src/components/LoadingOverlay.tsx'
          ],
          'game-components': [
            './src/components/TutorialModal.tsx',
            './src/components/GameOverModal.tsx'
          ],
          'game-utils': [
            './src/utils/focusManagement.ts'
          ]
        }
      }
    },
    // Optimize for code splitting
    chunkSizeWarningLimit: 1000,
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@utils': resolve(__dirname, 'src/utils')
    }
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'howler']
  }
}))
