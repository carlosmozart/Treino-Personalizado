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
        super.onCreate(savedInstanceState);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager.getNotificationChannel(REST_CHANNEL_ID) != null) return;

        AudioAttributes attributes = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();
        NotificationChannel channel = new NotificationChannel(
            REST_CHANNEL_ID,
            "Fim do descanso",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Alarme ao terminar o descanso entre séries");
        channel.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM), attributes);
        channel.enableVibration(true);
        channel.setVibrationPattern(new long[] { 0, 500, 250, 500, 250, 800 });
        manager.createNotificationChannel(channel);
    }
}
