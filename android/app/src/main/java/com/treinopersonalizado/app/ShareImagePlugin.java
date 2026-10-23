package com.treinopersonalizado.app;

import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.core.content.FileProvider;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;

/**
 * Compartilha uma imagem PNG (S9: o treino como imagem) pela folha de compartilhamento do Android.
 * O WebView não tem a Web Share API. A imagem vai para uma pasta própria no cache do app, exposta
 * só ao app escolhido pela pessoa (FileProvider com permissão de leitura temporária), e a anterior
 * é apagada a cada novo compartilhamento.
 */
@CapacitorPlugin(name = "ShareImage")
public class ShareImagePlugin extends Plugin {
    private static final int MAX_CHARS = 12 * 1024 * 1024;
    private static final String DIR = "compartilhar";

    @PluginMethod
    public void share(PluginCall call) {
        String fileName = call.getString("fileName", "");
        String base64 = call.getString("base64");
        String title = call.getString("title", "");
        if (base64 == null || base64.isEmpty() || base64.length() > MAX_CHARS) {
            call.reject("Imagem vazia ou grande demais.", "BAD_CONTENT");
            return;
        }
        if (!fileName.matches("[A-Za-z0-9._-]{1,120}\\.png")) {
            call.reject("Nome de arquivo inválido.", "BAD_NAME");
            return;
        }
        try {
            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            File dir = new File(getContext().getCacheDir(), DIR);
            if (!dir.isDirectory() && !dir.mkdirs()) throw new Exception("pasta indisponível");
            File[] old = dir.listFiles();
            if (old != null) for (File f : old) f.delete();
            File file = new File(dir, fileName);
            try (FileOutputStream out = new FileOutputStream(file)) {
                out.write(bytes);
            }
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("image/png");
            send.putExtra(Intent.EXTRA_STREAM, uri);
            send.setClipData(ClipData.newRawUri(title, uri));
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent chooser = Intent.createChooser(send, title == null || title.isEmpty() ? "Compartilhar treino" : title);
            chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(chooser);
            call.resolve();
        } catch (Exception e) {
            call.reject("Não foi possível compartilhar a imagem: " + e.getMessage(), "SHARE_FAILED");
        }
    }
}
