"""Monta os vídeos de apresentação (vertical 1080 × 1920, para Reels, Shorts, TikTok e Status).

Antes: gravar as cenas (em app/):
    npm run build
    npx playwright test --config scripts/videos/playwright.config.ts record
Depois (em app/):
    python scripts/videos/compor.py            # todos
    python scripts/videos/compor.py treino     # só um

Saída em notas-locais/videos/: um vídeo por função e o geral (visao-geral.mp4).
O nome do app e o link ficam em NOME e LINK, aqui embaixo: trocou o nome, é só rodar de novo.
"""
import base64
import json
import subprocess
import sys
from pathlib import Path

import audio

NOME = 'Treino Personalizado'
LINK = 'carlosmozart.github.io/Treino-Personalizado/convite'
CHAMADA = 'Abre o treino e a carga de hoje já está lá.'

AQUI = Path(__file__).resolve().parent
APP = AQUI.parent.parent
RAIZ = APP.parent
GRAV = RAIZ / 'notas-locais' / 'videos' / 'gravacoes'
SAIDA = RAIZ / 'notas-locais' / 'videos'
TRAB = SAIDA / 'trabalho'

W, H, FPS = 1080, 1920, 30
TELA_H = 1440
TELA_W = 708
TELA_X = (W - TELA_W) // 2
TELA_Y = 372
INTRO, OUTRO = 2.4, 3.6

VIDEOS = {
    'treino': ('Treino guiado', 'A carga certa, o descanso e os recordes, série por série'),
    'plano': ('Monte seu plano', 'Cinco perguntas e o plano fica pronto'),
    'progresso': ('Sua evolução', 'Gráficos, peso, medidas e todo o histórico'),
    'rpg': ('Modo RPG', 'Treinar vira subir de nível'),
    'ajuda': ('Ajuda e tour', 'Cada função explicada, a um toque'),
}

# o vídeo geral: trechos das cenas (cena, legenda que abre o trecho, duração máxima)
GERAL = [
    ('treino', 'A carga de hoje já está lá', None),
    ('treino', 'Marcou a série, o descanso começa sozinho', None),
    ('plano', 'Seu plano em 5 toques', None),
    ('treino', 'Calculadora de anilhas', None),
    ('progresso', 'Veja sua evolução', 6.5),
    ('rpg', 'Escolha sua classe', None),
    ('ajuda', 'Dúvida? Toque no ? de qualquer tela', None),
    ('treino', 'Concluiu? O resumo mostra a evolução', None),
]

FONTES = ('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@800;900'
          '&family=Figtree:wght@500;600;700&display=block">')
CSS = """
* { box-sizing: border-box; margin: 0; }
body { width: LARGpx; height: ALTpx; overflow: hidden; color: #f4f4f6; font-family: Figtree, 'Segoe UI', sans-serif; }
.display { font-family: 'Big Shoulders Display', Impact, 'Arial Narrow', sans-serif; text-transform: uppercase; line-height: .92; letter-spacing: .005em; }
.fundo { position: absolute; inset: 0; background:
  radial-gradient(120% 55% at 50% -8%, rgba(37,99,235,.50), transparent 62%),
  radial-gradient(90% 40% at 50% 108%, rgba(16,185,129,.20), transparent 60%), #060709; }
.grade { position: absolute; inset: 0; opacity: .07; background-image:
  linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px); background-size: 60px 60px;
  mask-image: radial-gradient(70% 60% at 50% 30%, #000, transparent); }
"""


def icone():
    return 'data:image/png;base64,' + base64.b64encode((APP / 'public' / 'icon-192.png').read_bytes()).decode()


def pagina(corpo, w=W, h=H, fundo=True):
    extra = '<div class="fundo"></div><div class="grade"></div>' if fundo else ''
    return f'<!doctype html><html><head><meta charset="utf-8">{FONTES}<style>{CSS.replace('LARG', str(w)).replace('ALT', str(h))}</style></head><body>{extra}{corpo}</body></html>'


def html_fundo():
    m = 18
    return pagina(f'''<div style="position:absolute;left:{TELA_X - m}px;top:{TELA_Y - m}px;width:{TELA_W + 2 * m}px;height:{TELA_H + 2 * m}px;
      border-radius:76px;background:#15161b;box-shadow:0 40px 120px rgba(0,0,0,.7),0 0 0 2px #2a2b33,inset 0 0 0 2px #24252c"></div>''')


def html_mascara():
    return (f'<!doctype html><html><body style="margin:0;width:{TELA_W}px;height:{TELA_H}px;background:#000">'
            f'<div style="width:{TELA_W}px;height:{TELA_H}px;border-radius:58px;background:#fff"></div></body></html>')


def html_legenda(texto):
    tam = 100 if len(texto) <= 26 else 88 if len(texto) <= 40 else 76
    return pagina(f'''<div style="position:absolute;inset:0 50px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
      <p class="display" style="font-size:{tam}px;font-weight:900;text-wrap:balance;text-shadow:0 6px 30px rgba(0,0,0,.6)">{texto}</p>
      <span style="display:block;width:96px;height:8px;border-radius:4px;background:#2563eb;margin-top:26px"></span></div>''',
                  w=W, h=TELA_Y - 20, fundo=False)


def html_abertura(titulo, sub):
    return pagina(f'''<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 70px">
      <div style="display:flex;align-items:center;gap:18px;background:rgba(17,18,22,.85);border:2px solid #2a2b33;border-radius:999px;padding:12px 30px 12px 14px">
        <img src="{icone()}" style="width:64px;height:64px;border-radius:50%">
        <span class="display" style="font-size:44px;font-weight:800">{NOME}</span></div>
      <h1 class="display" style="font-size:190px;font-weight:900;margin-top:60px;text-wrap:balance">{titulo}</h1>
      <p style="font-size:50px;font-weight:600;color:#a3a3ad;margin-top:40px;text-wrap:balance;line-height:1.25">{sub}</p></div>''')


def html_encerramento():
    promessas = ''.join(f'<li style="background:#111216;border:2px solid #2a2b33;border-radius:999px;padding:14px 28px">{p}</li>'
                        for p in ('Sem cadastro', 'Sem anúncio', 'Funciona sem internet'))
    return pagina(f'''<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 60px">
      <img src="{icone()}" style="width:210px;height:210px;border-radius:50%;box-shadow:0 20px 80px rgba(37,99,235,.45)">
      <h1 class="display" style="font-size:150px;font-weight:900;margin-top:50px">{NOME}</h1>
      <p class="display" style="font-size:96px;font-weight:900;color:#10b981;margin-top:34px">Baixe de graça</p>
      <p style="font-size:48px;font-weight:600;color:#a3a3ad;margin-top:18px">Android e iPhone</p>
      <p style="font-size:40px;font-weight:700;color:#93c5fd;margin-top:56px;background:#111216;border:2px solid #2563eb;border-radius:24px;padding:22px 34px">{LINK}</p>
      <ul style="list-style:none;padding:0;margin-top:56px;display:flex;flex-wrap:wrap;justify-content:center;gap:18px;font-size:36px;font-weight:600">{promessas}</ul></div>''')


def run(cmd, **kw):
    subprocess.run(cmd, check=True, **kw)


def ffmpeg(*args):
    run(['ffmpeg', '-v', 'error', '-y', *map(str, args)])


def desenhar(trabalhos):
    arq = TRAB / 'artes.json'
    arq.write_text(json.dumps(trabalhos), encoding='utf-8')
    run(['node', str(AQUI / 'arte.mjs'), str(arq)], cwd=APP)


def cena(nome):
    d = GRAV / nome
    quadros = json.loads((d / 'quadros.json').read_text(encoding='utf-8'))
    momentos = json.loads((d / 'momentos.json').read_text(encoding='utf-8'))
    inicio = next(m['t'] for m in momentos if m.get('text') == '__start__')
    fim = next(m['t'] for m in momentos if m['type'] == 'end')
    return d, quadros, momentos, inicio, fim


def trecho_de(nome, legenda, maximo):
    """(cena, início, fim) do trecho que começa na legenda e vai até a próxima."""
    _, _, momentos, _, fim = cena(nome)
    legs = [m for m in momentos if m['type'] == 'caption' and m.get('text') != '__start__']
    i = next(k for k, m in enumerate(legs) if m['text'] == legenda)
    a = legs[i]['t']
    b = legs[i + 1]['t'] if i + 1 < len(legs) else fim
    if maximo:
        b = min(b, a + maximo)
    return nome, a, b


def lista_quadros(trechos, arq):
    """Arquivo do concat do ffmpeg com os quadros dos trechos, cada um com a sua duração."""
    linhas = []
    for nome, a, b in trechos:
        d, quadros, *_ = cena(nome)
        visiveis = [q for q in quadros if q['t'] < b]
        antes = [q for q in visiveis if q['t'] <= a]
        sel = ([antes[-1]] if antes else []) + [q for q in visiveis if q['t'] > a]
        for k, q in enumerate(sel):
            ini = max(q['t'], a)
            fim = sel[k + 1]['t'] if k + 1 < len(sel) else b
            dur = max(fim - ini, 0.001)
            caminho = (d / 'quadros' / q['file']).as_posix()
            linhas.append(f"file '{caminho}'\nduration {dur:.4f}\n")
    if linhas:  # o concat ignora a duração do último sem repetir o arquivo
        linhas.append(linhas[-1].split('\n')[0] + '\n')
    arq.write_text(''.join(linhas), encoding='utf-8')


def montar(nome_saida, titulo, sub, trechos, legendas):
    """legendas: [(texto, início, fim)] no tempo do miolo (sem a abertura)."""
    TRAB.mkdir(parents=True, exist_ok=True)
    corpo = sum(b - a for _, a, b in trechos)
    total = INTRO + corpo + OUTRO

    # artes
    pngs = {'fundo': TRAB / 'fundo.png', 'mascara': TRAB / 'mascara.png',
            'abertura': TRAB / f'{nome_saida}-abertura.png', 'fim': TRAB / 'encerramento.png'}
    trabalhos = [
        {'out': str(pngs['fundo']), 'width': W, 'height': H, 'html': html_fundo()},
        {'out': str(pngs['mascara']), 'width': TELA_W, 'height': TELA_H, 'html': html_mascara()},
        {'out': str(pngs['abertura']), 'width': W, 'height': H, 'html': html_abertura(titulo, sub)},
        {'out': str(pngs['fim']), 'width': W, 'height': H, 'html': html_encerramento()},
    ]
    leg_png = []
    for k, (texto, _, _) in enumerate(legendas):
        p = TRAB / f'{nome_saida}-legenda-{k}.png'
        leg_png.append(p)
        trabalhos.append({'out': str(p), 'width': W, 'height': TELA_Y - 20, 'html': html_legenda(texto), 'transparent': True})
    desenhar(trabalhos)

    # a tela gravada
    lista = TRAB / f'{nome_saida}-quadros.txt'
    lista_quadros(trechos, lista)
    tela = TRAB / f'{nome_saida}-tela.mp4'
    ffmpeg('-f', 'concat', '-safe', '0', '-i', lista, '-vf', f'fps={FPS},scale={TELA_W}:{TELA_H}:flags=lanczos,format=yuv420p',
           '-t', f'{corpo:.3f}', '-c:v', 'libx264', '-crf', '14', '-preset', 'medium', tela)

    # miolo: fundo + tela com cantos redondos + legendas
    entradas = ['-loop', '1', '-t', f'{corpo:.3f}', '-i', pngs['fundo'], '-i', tela, '-loop', '1', '-i', pngs['mascara']]
    for p in leg_png:
        entradas += ['-loop', '1', '-t', f'{corpo:.3f}', '-i', p]
    f = [f'[1:v]format=rgba[t]', '[2:v]format=gray[m]', '[t][m]alphamerge[tm]',
         f'[0:v][tm]overlay={TELA_X}:{TELA_Y}:shortest=1[v0]']
    ult = 'v0'
    for k, (_, a, b) in enumerate(legendas):
        fo = max(a, b - 0.25)
        f.append(f'[{3 + k}:v]format=rgba,fade=in:st={a:.3f}:d=0.25:alpha=1,fade=out:st={fo:.3f}:d=0.25:alpha=1[l{k}]')
        f.append(f"[{ult}][l{k}]overlay=0:10:enable='between(t,{a:.3f},{b:.3f})'[v{k + 1}]")
        ult = f'v{k + 1}'
    miolo = TRAB / f'{nome_saida}-miolo.mp4'
    ffmpeg(*entradas, '-filter_complex', ';'.join(f), '-map', f'[{ult}]', '-r', FPS, '-t', f'{corpo:.3f}',
           '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-pix_fmt', 'yuv420p', miolo)

    # abertura e encerramento (com zoom lento) + miolo
    so_video = TRAB / f'{nome_saida}-video.mp4'
    zoom = lambda dur: (f"scale=2160:-2,zoompan=z='1+0.04*on/({dur}*{FPS})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
                        f":d={int(dur * FPS)}:s={W}x{H}:fps={FPS}")
    # o zoompan gera d quadros para cada quadro de entrada: a imagem entra uma vez só
    ffmpeg('-i', pngs['abertura'], '-i', miolo, '-i', pngs['fim'],
           '-filter_complex',
           f"[0:v]{zoom(INTRO)},fade=in:st=0:d=0.35,fade=out:st={INTRO - 0.2}:d=0.2,setsar=1,format=yuv420p[a];"
           f"[1:v]fade=in:st=0:d=0.2,setsar=1,format=yuv420p[b];"
           f"[2:v]{zoom(OUTRO)},fade=in:st=0:d=0.3,setsar=1,format=yuv420p[c];[a][b][c]concat=n=3:v=1:a=0[v]",
           '-map', '[v]', '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', '-pix_fmt', 'yuv420p', so_video)

    # áudio: música + efeitos nos toques, nas trocas de trecho e de legenda
    eventos = [(0.0, 'whoosh', 0.6), (0.18, 'impact', 0.9), (INTRO - 0.35, 'whoosh', 0.7)]
    pos = INTRO
    for nome, a, b in trechos:
        _, _, momentos, _, _ = cena(nome)
        for m in momentos:
            if a <= m['t'] < b and m['type'] in ('tap', 'success'):
                eventos.append((pos + m['t'] - a, m['type'], 0.75 if m['type'] == 'tap' else 0.8))
        pos += b - a
        if pos < INTRO + corpo - 0.1:
            eventos.append((pos - 0.25, 'whoosh', 0.45))
    for _, a, _ in legendas[1:]:
        eventos.append((INTRO + a - 0.2, 'whoosh', 0.3))
    eventos += [(INTRO + corpo - 0.3, 'whoosh', 0.7), (INTRO + corpo + 0.1, 'impact', 0.75)]
    wav = TRAB / f'{nome_saida}.wav'
    audio.write_wav(wav, audio.mixdown(total, eventos))

    final = SAIDA / f'{nome_saida}.mp4'
    ffmpeg('-i', so_video, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
           '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
           '-movflags', '+faststart', '-shortest', final)
    # capa (para a miniatura do post)
    ffmpeg('-i', pngs['abertura'], '-q:v', '2', SAIDA / f'{nome_saida}-capa.jpg')
    print(f'{final.name}: {total:.1f} s')


def video_da_funcao(nome):
    titulo, sub = VIDEOS[nome]
    _, _, momentos, inicio, fim = cena(nome)
    legs = [m for m in momentos if m['type'] == 'caption' and m.get('text') != '__start__']
    legendas = []
    for k, m in enumerate(legs):
        b = legs[k + 1]['t'] if k + 1 < len(legs) else fim
        legendas.append((m['text'], m['t'] - inicio, b - inicio))
    montar(nome, titulo, sub, [(nome, inicio, fim)], legendas)


def video_geral():
    trechos = [trecho_de(*t) for t in GERAL]
    legendas, pos = [], 0.0
    for (_, leg, _), (_, a, b) in zip(GERAL, trechos):
        legendas.append((leg, pos, pos + b - a))
        pos += b - a
    montar('visao-geral', 'Seu treino no bolso', CHAMADA, trechos, legendas)


if __name__ == '__main__':
    pedidos = sys.argv[1:] or [*VIDEOS, 'visao-geral']
    for p in pedidos:
        video_geral() if p == 'visao-geral' else video_da_funcao(p)
