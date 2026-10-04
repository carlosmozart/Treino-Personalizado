interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
}

function capacitor(): CapacitorGlobal | undefined {
  return (globalThis as { Capacitor?: CapacitorGlobal }).Capacitor;
}

/** Verdadeiro dentro do APK (WebView do Capacitor); falso no navegador/PWA. */
export function isNative(): boolean {
  return capacitor()?.isNativePlatform?.() === true;
}

export function isAndroid(): boolean {
  return isNative() && capacitor()?.getPlatform?.() === 'android';
}
