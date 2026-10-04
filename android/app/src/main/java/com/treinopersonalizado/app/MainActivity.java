package com.treinopersonalizado.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.os.Build;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String REST_CHANNEL_ID = "treino-descanso-v3";

    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(AppUpdatePlugin.class);
        registerPlugin(BackupFilePlugin.class);
        super.onCreate(savedInstanceState);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager manager = getSystemService(NotificationManager.class);
        createRestChannel(manager, REST_CHANNEL_ID, "Som e vibração", true, true);
        createRestChannel(manager, REST_CHANNEL_ID + "-sound", "Som", true, false);
        createRestChannel(manager, REST_CHANNEL_ID + "-vibrate", "Vibração", false, true);
        createRestChannel(manager, REST_CHANNEL_ID + "-silent", "Silencioso", false, false);
    }

    private void createRestChannel(NotificationManager manager, String id, String mode, boolean sound, boolean vibrate) {
        // Não sobrescrever ajustes que o usuário fez nas configurações do Android.
        if (manager.getNotificationChannel(id) != null) return;

        AudioAttributes attributes = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();
        NotificationChannel channel = new NotificationChannel(
            id,
            "Fim do descanso · " + mode,
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Alarme ao terminar o descanso entre séries");
        channel.setSound(sound ? RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM) : null, attributes);
        if (vibrate) channel.setVibrationPattern(new long[] { 0, 500, 250, 500, 250, 800 });
        channel.enableVibration(vibrate);
        manager.createNotificationChannel(channel);
    }
}
