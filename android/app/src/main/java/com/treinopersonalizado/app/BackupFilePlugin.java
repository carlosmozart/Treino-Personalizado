package com.treinopersonalizado.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Salva o backup pelo seletor de arquivos do Android (Storage Access Framework).
 * O WebView não tem a folha de compartilhamento nem trata links de download, então sem isto o
 * backup "funcionava" sem gerar arquivo nenhum. O usuário escolhe a pasta (Downloads, Drive...)
 * e nenhuma permissão de armazenamento é necessária.
 */
@CapacitorPlugin(name = "BackupFile")
public class BackupFilePlugin extends Plugin {
    private static final int MAX_CHARS = 16 * 1024 * 1024;

    @PluginMethod
    public void save(PluginCall call) {
        String fileName = call.getString("fileName", "");
        String content = call.getString("content");
        if (content == null || content.isEmpty() || content.length() > MAX_CHARS) {
            call.reject("Backup vazio ou grande demais.", "BAD_CONTENT");
            return;
        }
        if (!fileName.matches("[A-Za-z0-9._-]{1,120}\\.json")) {
            call.reject("Nome de arquivo inválido.", "BAD_NAME");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/json");
        intent.putExtra(Intent.EXTRA_TITLE, fileName);
        startActivityForResult(call, intent, "onSaveResult");
    }

    @ActivityCallback
    private void onSaveResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Uri uri = result.getData() != null ? result.getData().getData() : null;
        if (result.getResultCode() != Activity.RESULT_OK || uri == null) {
            call.reject("Salvamento cancelado.", "CANCELLED");
            return;
        }
        String content = call.getString("content", "");
        new Thread(() -> {
            // "wt": se o usuário escolher um arquivo existente, substitui em vez de anexar
            try (OutputStream out = getContext().getContentResolver().openOutputStream(uri, "wt")) {
                if (out == null) throw new Exception("Destino indisponível.");
                out.write(content.getBytes(StandardCharsets.UTF_8));
                out.flush();
                JSObject ret = new JSObject();
                ret.put("uri", uri.toString());
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Não foi possível gravar o arquivo: " + e.getMessage(), "WRITE_FAILED");
            }
        }).start();
    }
}
