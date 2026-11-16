import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globalSetup: ['./src/test/globalSetup.ts'],
    setupFiles: ['./src/test/setup.ts'],
    env: { VITE_APP_API_URL: 'http://localhost:3100/api', VITE_GOOGLE_MAPS_API_KEY: 'clave-de-prueba' },
  },
});
