import { defineConfig, devices } from '@playwright/test';

// Vídeos de apresentação: grava cenas do app (build de produção) com dados fictícios.
// Rodar: npm run build (em app/), depois npx playwright test --config scripts/videos/playwright.config.ts
export default defineConfig({
  testDir: '.',
  reporter: 'list',
  workers: 1,
  timeout: 300_000,
  use: { baseURL: 'http://localhost:4173', ...devices['Pixel 7'], colorScheme: 'dark' },
  webServer: { command: 'npm run preview', url: 'http://localhost:4173', reuseExistingServer: true }
});
