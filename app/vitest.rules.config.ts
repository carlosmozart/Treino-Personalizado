// Testes das regras do Firestore: rodam em Node contra o emulador (npm run test:rules).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['firebase/**/*.test.ts'], environment: 'node', testTimeout: 20_000 }
});
