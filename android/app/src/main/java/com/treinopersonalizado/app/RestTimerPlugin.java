package com.treinopersonalizado.app;

import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.lang.ref.WeakReference;

/** Ponte do descanso na barra de notificações (M21): a página manda o descanso e lê o que os botões mudaram. */
@CapacitorPlugin(name = "RestTimer")
public class RestTimerPlugin extends Plugin {
    private static WeakReference<RestTimerPlugin> current = new WeakReference<>(null);

    @Override
    public void load() {
        current = new WeakReference<>(this);
    }

    @PluginMethod
    public void show(PluginCall call) {
        Long endsAt = call.getLong("endsAt");
        if (endsAt == null || endsAt <= 0) {
            call.reject("Descanso sem horário de fim.", "BAD_TIME");
            return;
        }
        Context ctx = getContext();
        RestTimer.State s = RestTimer.load(ctx);
        s.endsAt = endsAt;
        s.total = Math.max(1, call.getInt("total", 0));
        s.countdown = Boolean.TRUE.equals(call.getBoolean("countdown", true));
        s.alert = Boolean.TRUE.equals(call.getBoolean("alert", true));
        s.title = call.getString("title", "Descanso");
        s.body = call.getString("body", "");
        s.alertTitle = call.getString("alertTitle", "Descanso concluído");
        s.alertBody = call.getString("alertBody", "Bora para a próxima série!");
        s.alertChannel = call.getString("alertChannel", "treino-descanso-v3");
        s.sound = Boolean.TRUE.equals(call.getBoolean("sound", true));
        s.vibrate = Boolean.TRUE.equals(call.getBoolean("vibrate", true));
        boolean exact = RestTimer.show(ctx, s);
        JSObject ret = new JSObject();
        ret.put("exact", exact);
        call.resolve(ret);
    }

    @PluginMethod
    public void hide(PluginCall call) {
        RestTimer.hide(getContext());
        call.resolve();
    }

    @PluginMethod
    public void getState(PluginCall call) {
        call.resolve(state(getContext()));
    }

    static JSObject state(Context ctx) {
        RestTimer.State s = RestTimer.load(ctx);
        JSObject o = new JSObject();
        if (s.endsAt > 0) o.put("endsAt", s.endsAt);
        else o.put("endsAt", JSObject.NULL);
        o.put("total", s.total);
        o.put("seq", s.seq);
        return o;
    }

    static void notifyChanged(Context ctx) {
        RestTimerPlugin plugin = current.get();
        if (plugin != null && plugin.getBridge() != null) plugin.notifyListeners("restChanged", state(ctx));
    }
}
