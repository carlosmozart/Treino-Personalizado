import { defineConfig, devices } from '@playwright/test';

// Testa o build de produção (o mesmo que vai para o Pages e para o APK), não o servidor de dev.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4173', ...devices['Pixel 7'] },
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI
  }
});
