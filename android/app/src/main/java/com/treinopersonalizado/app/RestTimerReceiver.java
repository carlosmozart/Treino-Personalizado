package com.treinopersonalizado.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Botões do aviso do descanso e o alarme do fim (M21). Interno: não exportado no manifesto. */
public class RestTimerReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;
        boolean changed = RestTimer.handle(context, intent.getAction());
        // com o app aberto, a tela acompanha na hora; fechado, ela confere ao voltar
        if (changed) RestTimerPlugin.notifyChanged(context);
    }
}
