import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('http://localhost:8000'),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    alias: {
      'src': path.resolve(__dirname, './src'),
    },
    // Vitest 4: Use fileParallelism false to avoid worker pool hangs on some systems
    pool: 'threads',
    fileParallelism: false,
    testTimeout: 60000,
  },
});
