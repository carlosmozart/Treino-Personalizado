import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { isNative } from './platform/platform';
import { flushOnHide, syncController, useAppStore } from './store';
import './index.css';

void useAppStore.getState().init().then(() => syncController.start());
flushOnHide();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Cache offline só no navegador/PWA: no APK os arquivos já vêm dentro do pacote.
if (!isNative() && 'serviceWorker' in navigator) {
  void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
}
