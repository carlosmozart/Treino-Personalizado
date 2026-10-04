package com.treinopersonalizado.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Locale;

/**
 * Baixa o APK de uma release do GitHub, confere o SHA-256 e entrega ao instalador do Android.
 * O download fica no lado nativo: os arquivos das releases redirecionam para um domínio sem CORS,
 * e passar dezenas de MB pela ponte JS em base64 seria lento.
 */
@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {
    // Só aceita releases deste repositório; o redirecionamento seguinte é https -> https.
    static final String ALLOWED_PREFIX =
        "https://github.com/carlosmozart/Treino-Personalizado/releases/download/";
    static final String FILE_NAME = "treino-update.apk";
    private static final long MIN_APK_BYTES = 100_000L;

    @PluginMethod
    public void download(PluginCall call) {
        String url = call.getString("url", "");
        String expected = call.getString("sha256", "").trim().toLowerCase(Locale.ROOT);
        if (!url.startsWith(ALLOWED_PREFIX) || !url.endsWith(".apk")) {
            call.reject("Endereço de atualização não permitido.", "BAD_URL");
            return;
        }
        if (!expected.matches("[0-9a-f]{64}")) {
            call.reject("Atualização sem SHA-256 válido.", "NO_HASH");
            return;
        }

        new Thread(() -> {
            File target = new File(getContext().getCacheDir(), FILE_NAME);
            HttpURLConnection conn = null;
            try {
                conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setInstanceFollowRedirects(true);
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(30000);
                if (conn.getResponseCode() != 200) throw new Exception("HTTP " + conn.getResponseCode());
                if (!"https".equals(conn.getURL().getProtocol())) throw new Exception("Redirecionamento inseguro.");

                long total = conn.getContentLengthLong();
                long received = 0;
                int lastPercent = -1;
                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                try (InputStream in = conn.getInputStream(); FileOutputStream out = new FileOutputStream(target)) {
                    byte[] buffer = new byte[64 * 1024];
                    int read;
                    while ((read = in.read(buffer)) != -1) {
                        out.write(buffer, 0, read);
                        digest.update(buffer, 0, read);
                        received += read;
                        int percent = total > 0 ? (int) (received * 100 / total) : -1;
                        if (percent != lastPercent) {
                            lastPercent = percent;
                            JSObject progress = new JSObject();
                            progress.put("received", received);
                            progress.put("total", total);
                            progress.put("percent", percent);
                            notifyListeners("downloadProgress", progress);
                        }
                    }
                }

                if (received < MIN_APK_BYTES) throw new Exception("Arquivo pequeno demais para ser um APK.");
                StringBuilder hex = new StringBuilder();
                for (byte b : digest.digest()) hex.append(String.format(Locale.ROOT, "%02x", b));
                if (!hex.toString().equals(expected)) {
                    target.delete();
                    call.reject("O arquivo baixado não confere com o SHA-256 publicado.", "HASH_MISMATCH");
                    return;
                }
                JSObject result = new JSObject();
                result.put("bytes", received);
                call.resolve(result);
            } catch (Exception e) {
                target.delete();
                call.reject("Falha ao baixar a atualização: " + e.getMessage(), "DOWNLOAD_FAILED");
            } finally {
                if (conn != null) conn.disconnect();
            }
        }).start();
    }

    @PluginMethod
    public void install(PluginCall call) {
        File file = new File(getContext().getCacheDir(), FILE_NAME);
        if (!file.exists()) {
            call.reject("Nenhuma atualização baixada.", "NOT_DOWNLOADED");
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            && !getContext().getPackageManager().canRequestPackageInstalls()) {
            // O Android exige que o usuário libere "instalar apps desconhecidos" para este app.
            Intent settings = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + getContext().getPackageName()));
            settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(settings);
            call.reject("Permita a instalação deste app e toque em atualizar de novo.", "NEEDS_PERMISSION");
            return;
        }

        Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        getContext().startActivity(intent);
        call.resolve();
    }
}
