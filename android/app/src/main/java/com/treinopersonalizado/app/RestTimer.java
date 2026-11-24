package com.treinopersonalizado.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

/**
 * Descanso na barra de notificações (M21): um aviso fixo com a contagem regressiva (desenhada pelo
 * próprio Android, sem o app acordado) e os botões −15s, +15s e Pular, que funcionam com a tela
 * bloqueada. O fim do descanso é um alarme deste mesmo código: os botões mudam o horário sem
 * precisar da página.
 *
 * Sem serviço em primeiro plano e sem permissão nova: o aviso é comum e os botões vão para um
 * receptor interno do app (não exportado).
 *
 * O estado fica em SharedPreferences, porque os botões podem ser tocados com o app fechado. `seq`
 * sobe a cada mudança feita pelos botões; a página compara com o último que viu e se acerta.
 */
final class RestTimer {
    static final int COUNTDOWN_ID = 4198;
    /** O mesmo id do aviso de fim que o app agendava pelo LocalNotifications. */
    static final int ALERT_ID = 4199;
    static final String COUNTDOWN_CHANNEL = "treino-descanso-contagem-v1";

    static final String ACTION_MINUS = "com.treinopersonalizado.app.rest.MINUS";
    static final String ACTION_PLUS = "com.treinopersonalizado.app.rest.PLUS";
    static final String ACTION_SKIP = "com.treinopersonalizado.app.rest.SKIP";
    static final String ACTION_FINISH = "com.treinopersonalizado.app.rest.FINISH";

    private static final String PREFS = "rest-timer";
    private static final long STEP_MS = 15_000L;
    /** Menos que isto para o fim, o descanso acaba (mesma regra do −15 da tela). */
    private static final long MIN_LEFT_MS = 1_000L;

    private RestTimer() {}

    /** Descanso como a página mandou. */
    static final class State {
        long endsAt; // 0 = sem descanso
        long total;  // segundos
        long seq;
        boolean countdown;
        boolean alert;
        String title;
        String body;
        String alertTitle;
        String alertBody;
        String alertChannel;
        boolean sound;
        boolean vibrate;
    }

    static State load(Context ctx) {
        SharedPreferences p = prefs(ctx);
        State s = new State();
        s.endsAt = p.getLong("endsAt", 0);
        s.total = p.getLong("total", 0);
        s.seq = p.getLong("seq", 0);
        s.countdown = p.getBoolean("countdown", true);
        s.alert = p.getBoolean("alert", true);
        s.title = p.getString("title", "Descanso");
        s.body = p.getString("body", "");
        s.alertTitle = p.getString("alertTitle", "Descanso concluído");
        s.alertBody = p.getString("alertBody", "Bora para a próxima série!");
        s.alertChannel = p.getString("alertChannel", "treino-descanso-v3");
        s.sound = p.getBoolean("sound", true);
        s.vibrate = p.getBoolean("vibrate", true);
        return s;
    }

    static void save(Context ctx, State s) {
        prefs(ctx).edit()
            .putLong("endsAt", s.endsAt)
            .putLong("total", s.total)
            .putLong("seq", s.seq)
            .putBoolean("countdown", s.countdown)
            .putBoolean("alert", s.alert)
            .putString("title", s.title)
            .putString("body", s.body)
            .putString("alertTitle", s.alertTitle)
            .putString("alertBody", s.alertBody)
            .putString("alertChannel", s.alertChannel)
            .putBoolean("sound", s.sound)
            .putBoolean("vibrate", s.vibrate)
            .apply();
    }

    /** A página começou ou mudou o descanso. Devolve se o alarme do fim ficou exato. */
    static boolean show(Context ctx, State s) {
        save(ctx, s);
        post(ctx, s);
        return schedule(ctx, s);
    }

    /** A página parou o descanso (fim na tela, pausa, treino encerrado). */
    static void hide(Context ctx) {
        State s = load(ctx);
        s.endsAt = 0;
        save(ctx, s);
        cancelAlarm(ctx);
        NotificationManagerCompat.from(ctx).cancel(COUNTDOWN_ID);
    }

    /** Botões do aviso e o alarme do fim. Devolve true se o estado mudou por um botão. */
    static boolean handle(Context ctx, String action) {
        State s = load(ctx);
        long now = System.currentTimeMillis();
        if (ACTION_FINISH.equals(action)) {
            NotificationManagerCompat.from(ctx).cancel(COUNTDOWN_ID);
            if (s.endsAt == 0) return false;
            s.endsAt = 0;
            save(ctx, s);
            if (s.alert) postAlert(ctx, s);
            return false; // a página vê sozinha que o tempo acabou
        }
        if (s.endsAt == 0 || s.endsAt <= now) return false;
        if (ACTION_SKIP.equals(action)) {
            s.endsAt = 0;
        } else {
            long delta = ACTION_PLUS.equals(action) ? STEP_MS : ACTION_MINUS.equals(action) ? -STEP_MS : 0;
            if (delta == 0) return false;
            s.endsAt = Math.max(now, s.endsAt + delta);
            s.total = Math.max(1, s.total + delta / 1000);
            if (s.endsAt - now < MIN_LEFT_MS) {
                // −15 com menos de 15 s: acaba agora, com o aviso do fim
                s.endsAt = 0;
                s.seq++;
                save(ctx, s);
                cancelAlarm(ctx);
                NotificationManagerCompat.from(ctx).cancel(COUNTDOWN_ID);
                if (s.alert) postAlert(ctx, s);
                return true;
            }
        }
        s.seq++;
        save(ctx, s);
        if (s.endsAt == 0) {
            cancelAlarm(ctx);
            NotificationManagerCompat.from(ctx).cancel(COUNTDOWN_ID);
        } else {
            post(ctx, s);
            schedule(ctx, s);
        }
        return true;
    }

    // ---------- aviso com a contagem ----------

    private static void post(Context ctx, State s) {
        NotificationManagerCompat nm = NotificationManagerCompat.from(ctx);
        long left = s.endsAt - System.currentTimeMillis();
        if (!s.countdown || left <= 0 || !nm.areNotificationsEnabled()) {
            nm.cancel(COUNTDOWN_ID);
            return;
        }
        ensureCountdownChannel(ctx);
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, COUNTDOWN_CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_treino)
            .setContentTitle(s.title)
            .setContentIntent(openApp(ctx))
            .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setShowWhen(true)
            .setWhen(s.endsAt)
            .setUsesChronometer(true)
            .setChronometerCountDown(true)
            // some sozinho no fim, mesmo se o alarme atrasar
            .setTimeoutAfter(left)
            .addAction(0, "−15s", action(ctx, ACTION_MINUS, 1))
            .addAction(0, "+15s", action(ctx, ACTION_PLUS, 2))
            .addAction(0, "Pular", action(ctx, ACTION_SKIP, 3));
        if (s.body != null && !s.body.isEmpty()) b.setContentText(s.body);
        try {
            nm.notify(COUNTDOWN_ID, b.build());
        } catch (SecurityException e) {
            // sem permissão de notificação: fica só o descanso na tela
        }
    }

    private static void ensureCountdownChannel(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = ctx.getSystemService(NotificationManager.class);
        if (manager.getNotificationChannel(COUNTDOWN_CHANNEL) != null) return;
        // sem som e sem vibração: quem avisa é o fim do descanso, no canal de alarme
        NotificationChannel channel = new NotificationChannel(
            COUNTDOWN_CHANNEL, "Contagem do descanso", NotificationManager.IMPORTANCE_DEFAULT);
        channel.setDescription("Tempo que falta do descanso, com −15s, +15s e Pular");
        channel.setSound(null, null);
        channel.enableVibration(false);
        channel.setShowBadge(false);
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        manager.createNotificationChannel(channel);
    }

    private static void postAlert(Context ctx, State s) {
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, s.alertChannel)
            .setSmallIcon(R.drawable.ic_stat_treino)
            .setContentTitle(s.alertTitle)
            .setContentText(s.alertBody)
            .setContentIntent(openApp(ctx))
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_HIGH);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            int defaults = (s.sound ? Notification.DEFAULT_SOUND : 0) | (s.vibrate ? Notification.DEFAULT_VIBRATE : 0);
            b.setDefaults(defaults);
        }
        try {
            NotificationManagerCompat.from(ctx).notify(ALERT_ID, b.build());
        } catch (SecurityException e) {
            // sem permissão de notificação
        }
    }

    // ---------- alarme do fim ----------

    private static boolean schedule(Context ctx, State s) {
        cancelAlarm(ctx);
        if (s.endsAt <= System.currentTimeMillis()) return false;
        // sem aviso de fim nem contagem, nada a agendar; só com a contagem, o alarme só tira o aviso
        if (!s.alert && !s.countdown) return false;
        AlarmManager am = ctx.getSystemService(AlarmManager.class);
        PendingIntent pi = action(ctx, ACTION_FINISH, 4);
        boolean exact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || am.canScheduleExactAlarms();
        try {
            if (exact) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, s.endsAt, pi);
            else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, s.endsAt, pi);
        } catch (SecurityException e) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, s.endsAt, pi);
            exact = false;
        }
        return exact && s.alert;
    }

    private static void cancelAlarm(Context ctx) {
        ctx.getSystemService(AlarmManager.class).cancel(action(ctx, ACTION_FINISH, 4));
    }

    // ---------- intents ----------

    private static PendingIntent action(Context ctx, String action, int code) {
        Intent intent = new Intent(ctx, RestTimerReceiver.class).setAction(action);
        return PendingIntent.getBroadcast(ctx, code, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent openApp(Context ctx) {
        Intent intent = new Intent(ctx, MainActivity.class)
            .setAction(Intent.ACTION_MAIN)
            .addCategory(Intent.CATEGORY_LAUNCHER)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(ctx, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
