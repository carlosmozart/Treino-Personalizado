import { defineConfig, devices } from '@playwright/test';

// Capturas do README: mesmo build de produção dos testes de navegador, celular Pixel 7, tema escuro.
export default defineConfig({
  testDir: '.',
  reporter: 'list',
  use: { baseURL: 'http://localhost:4173', ...devices['Pixel 7'], colorScheme: 'dark' },
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: true
  }
});
