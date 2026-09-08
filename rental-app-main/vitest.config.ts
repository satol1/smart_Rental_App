import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    // TypeScript sources are canonical; adjacent .js files are old compiler output.
    include: ['src/**/*.{test,spec}.{ts,mts,cts,tsx}'],
    globals: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
    alias: {
      "@": "/src",
    },
  },
});
