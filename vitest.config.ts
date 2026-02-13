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
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/routes/__tests__/GameRoomPage.test.tsx', // TODO: Fix worker timeout issues with lazy loading mocks
    ],
  },
});
