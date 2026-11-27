"""Trilha e efeitos sonoros dos vídeos, sintetizados do zero (nenhum áudio de terceiros, sem
direitos a pagar). Música eletrônica animada em lá menor, 118 BPM; efeitos de toque, sucesso,
transição e abertura."""
import numpy as np

SR = 44100
BPM = 118
BEAT = 60 / BPM
BAR = 4 * BEAT

rng = np.random.default_rng(7)


def _t(seconds):
    return np.arange(int(seconds * SR)) / SR


def soft_saw(freq, seconds, harmonics=10, bright=0.78, detune=0.0):
    t = _t(seconds)
    out = np.zeros_like(t)
    for k in range(1, harmonics + 1):
        out += np.sin(2 * np.pi * k * freq * (1 + detune) * t) * (bright ** k) / k
    return out / 1.4


def env(n, attack=0.005, decay=0.2, sustain=0.0, release=0.05, hold=None):
    """Envelope ADSR simples com n amostras."""
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    d = sustain + (1 - sustain) * np.exp(-np.maximum(t - attack, 0) / max(decay, 1e-4))
    e = a * d
    if release:
        r = np.clip((n / SR - t) / release, 0, 1)
        e *= r
    return e


def place(track, sound, at):
    i = int(at * SR)
    if i >= len(track):
        return
    j = min(len(track), i + len(sound))
    track[i:j] += sound[: j - i]


def hp_noise(n, amount=1):
    x = rng.standard_normal(n + amount)
    for _ in range(amount):
        x = np.diff(x)
    return x[:n] / (2 ** amount)


def lp_noise(n, k=8):
    x = rng.standard_normal(n + k)
    c = np.cumsum(x)
    return (c[k:] - c[:-k])[:n] / k


# ---------- bateria ----------

def kick():
    n = int(0.32 * SR)
    t = np.arange(n) / SR
    f = 45 + 95 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / 0.16)
    click = hp_noise(n, 2) * np.exp(-t / 0.004) * 0.5
    return np.tanh((body + click) * 1.6) * 0.9


def clap():
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    noise = hp_noise(n, 1)
    e = np.zeros(n)
    for off in (0, 0.011, 0.022):
        e += np.where(t >= off, np.exp(-(t - off) / 0.012), 0) * 0.6
    e += np.where(t >= 0.03, np.exp(-(t - 0.03) / 0.09), 0)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05) * 0.3
    return (noise * e * 0.55 + tone) * 0.8


def hat(open_=False):
    n = int((0.25 if open_ else 0.06) * SR)
    t = np.arange(n) / SR
    return hp_noise(n, 3) * np.exp(-t / (0.08 if open_ else 0.014)) * 0.9


def crash():
    n = int(1.8 * SR)
    t = np.arange(n) / SR
    return hp_noise(n, 2) * np.exp(-t / 0.55) * 0.22


# ---------- música ----------

# lá menor → Fá → Dó → Sol (vi–IV–I–V em Dó)
CHORDS = [
    (55.00, [220.00, 261.63, 329.63]),
    (43.65, [174.61, 220.00, 261.63]),
    (65.41, [261.63, 329.63, 392.00]),
    (49.00, [196.00, 246.94, 293.66]),
]


def music(seconds, intro_bars=2):
    """Faixa estéreo com `seconds` de duração: 2 compassos de entrada (pad e arpejo), depois a
    batida completa; o último compasso tira a bateria e tudo some no fim."""
    n = int(seconds * SR)
    L = np.zeros(n)
    R = np.zeros(n)
    bars = int(np.ceil(seconds / BAR)) + 1
    t_all = np.arange(n) / SR
    # "sidechain": pad e baixo abaixam a cada bumbo, o balanço típico da música eletrônica
    pump = 1 - 0.5 * np.exp(-(t_all % BEAT) / 0.11)
    last_full = seconds - BAR  # o último compasso fica sem bateria

    pad_l = np.zeros(n)
    pad_r = np.zeros(n)
    bass = np.zeros(n)
    arp_l = np.zeros(n)
    arp_r = np.zeros(n)
    drums = np.zeros(n)

    K, C, H, HO = kick(), clap(), hat(), hat(True)
    for b in range(bars):
        start = b * BAR
        if start >= seconds:
            break
        root, notes = CHORDS[b % 4]
        full = b >= intro_bars and start < last_full
        # pad: acorde sustentado
        for f in notes:
            s_l = soft_saw(f, BAR, harmonics=6, bright=0.55, detune=-0.0018)
            s_r = soft_saw(f, BAR, harmonics=6, bright=0.55, detune=0.0018)
            e = env(len(s_l), attack=0.25, decay=10, sustain=1, release=0.25)
            place(pad_l, s_l * e * 0.12, start)
            place(pad_r, s_r * e * 0.12, start)
        # arpejo em semicolcheias
        seq = notes + [notes[1], notes[2], notes[0] * 2, notes[2], notes[1]]
        for i in range(16):
            f = seq[i % len(seq)] * 2
            note = soft_saw(f, 0.22, harmonics=5, bright=0.6) * env(int(0.22 * SR), attack=0.002, decay=0.07, release=0.03)
            at = start + i * BEAT / 4
            amp = 0.10 if full else 0.075
            place(arp_l, note * amp, at)
            place(arp_r, note * amp * 0.45, at + 0.75 * BEAT)  # eco à direita
        if full:
            # baixo em colcheias, oitava acima nas "e"
            for i in range(8):
                f = root * (2 if i % 2 else 1)
                note = soft_saw(f, BEAT / 2, harmonics=8, bright=0.7) * env(int(BEAT / 2 * SR), attack=0.004, decay=0.18, sustain=0.4, release=0.03)
                place(bass, note * 0.32, start + i * BEAT / 2)
            for beat in range(4):
                place(drums, K, start + beat * BEAT)
                if beat in (1, 3):
                    place(drums, C * 0.6, start + beat * BEAT)
                place(drums, (HO if beat == 3 else H) * 0.32, start + beat * BEAT + BEAT / 2)
                place(drums, H * 0.16, start + beat * BEAT)
            if b == intro_bars:
                place(drums, crash(), start)
        else:
            # na entrada, só o chimbal marcando
            for beat in range(4):
                place(drums, H * 0.12, start + beat * BEAT + BEAT / 2)

    L = (pad_l + bass) * pump + arp_l + drums
    R = (pad_r + bass) * pump + arp_r + drums
    stereo = np.stack([L, R], axis=1)
    fade_in = np.clip(t_all / 0.4, 0, 1)
    fade_out = np.clip((seconds - t_all) / 1.6, 0, 1)
    stereo *= (fade_in * fade_out)[:, None]
    return stereo / (np.max(np.abs(stereo)) + 1e-9) * 0.9


# ---------- efeitos ----------

def sfx_tap():
    n = int(0.07 * SR)
    t = np.arange(n) / SR
    f = 900 + 900 * np.exp(-t / 0.012)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.018)
    return s * 0.55


def sfx_success():
    out = np.zeros(int(0.9 * SR))
    for i, f in enumerate((1318.5, 1975.5)):  # Mi6 e Si6
        n = int(0.8 * SR)
        t = np.arange(n) / SR
        bell = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.08)) * np.exp(-t / 0.28)
        place(out, bell * 0.32, i * 0.09)
    return out


def sfx_whoosh(seconds=0.55):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    shape = np.sin(np.pi * t / seconds) ** 2
    low = lp_noise(n, 12)
    high = hp_noise(n, 1)
    mix = t / seconds  # do grave para o agudo
    return (low * (1 - mix) * 2.2 + high * mix * 0.6) * shape * 0.45


def sfx_impact():
    n = int(1.0 * SR)
    t = np.arange(n) / SR
    f = 38 + 70 * np.exp(-t / 0.06)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.35)
    return np.tanh(boom * 1.4) * 0.8 + crash()[:n] * 0.5


def sfx_riser(seconds=0.9):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    f = 300 * (1 + 3 * (t / seconds) ** 2)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.12
    return (hp_noise(n, 1) * 0.35 + tone) * (t / seconds) ** 2


SFX = {'tap': sfx_tap, 'success': sfx_success, 'whoosh': sfx_whoosh, 'impact': sfx_impact, 'riser': sfx_riser}


def mixdown(seconds, events, music_gain=0.42):
    """Música + efeitos nos tempos dados: events = [(segundos, nome, ganho)]."""
    mus = music(seconds) * music_gain
    fx = np.zeros(len(mus))
    cache = {}
    for at, name, gain in events:
        if name not in cache:
            cache[name] = SFX[name]()
        place(fx, cache[name] * gain, max(0.0, at))
    out = mus + fx[:, None]
    peak = np.max(np.abs(out))
    if peak > 0.97:
        out = np.tanh(out / peak * 1.2) * 0.95
    return out


def write_wav(path, stereo):
    import wave
    data = (np.clip(stereo, -1, 1) * 32767).astype('<i2')
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
