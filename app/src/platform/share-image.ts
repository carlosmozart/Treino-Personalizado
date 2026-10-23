// S9: compartilhar uma imagem. No APK pelo plugin nativo ShareImage (o WebView não tem a folha de
// compartilhamento do navegador); no navegador pela Web Share API quando ela aceita arquivos, senão
// baixando o PNG. Nada sai do aparelho sem a pessoa escolher o app de destino.
import { isNative } from './platform';

interface ShareImagePlugin {
  share(o: { fileName: string; base64: string; title: string }): Promise<void>;
}

function plugin(): ShareImagePlugin | undefined {
  return (globalThis as { Capacitor?: { Plugins?: { ShareImage?: ShareImagePlugin } } }).Capacitor?.Plugins?.ShareImage;
}

function base64Of(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export type ShareResult = 'shared' | 'saved' | 'cancelled';

export async function shareImage(blob: Blob, fileName: string, title: string): Promise<ShareResult> {
  const native = isNative() ? plugin() : undefined;
  if (native) {
    await native.share({ fileName, base64: await base64Of(blob), title });
    return 'shared';
  }
  const file = new File([blob], fileName, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title }); return 'shared'; }
    catch (e) { if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'; throw e; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return 'saved';
}
