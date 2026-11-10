// Modo RPG no Perfil (R1): convite para ligar, cartão do personagem e a ficha completa.
import { useMemo, useState, type ReactNode } from 'react';
import { FIRST_CLASSES, RPG_CLASS_BY_ID, STATS, THEME_ABOUT, THEME_LABEL, secondClassesOf, type RpgClass, type RpgTheme } from '../../data/rpg-classes';
import { CLASS_CAP, allocateRpgPoint, chooseRpgClass, className, rpgUnlocked, rpgView, setRpgEnabled, setRpgTheme, STAT_MAX, type RpgView } from '../../domain/rpg';
import { useAppStore } from '../../store';
import { useToday } from '../../hooks/use-today';
import { Sheet } from '../../ui/Sheet';
import { Icon } from '../../ui/Icon';
import { formatNumber } from '../../ui/format';
import { RpgEmblem, emblemColor } from './RpgEmblem';

export function useRpgView(): RpgView | null {
  const data = useAppStore(s => s.data);
  const today = useToday(s => s.today);
  return useMemo(() => (data ? rpgView(data, new Date()) : null), [data, today]);
}

/** Topo do Perfil: convite (desligado) ou o personagem (ligado). */
export function RpgCard() {
  const data = useAppStore(s => s.data);
  const run = useAppStore(s => s.run);
  const view = useRpgView();
  const [open, setOpen] = useState(false);
  if (!data || !view || !rpgUnlocked(data)) return null;

  if (!view.state.enabled) {
    return (
      <section className="mt-4 rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-center gap-3">
          <RpgEmblem cls={RPG_CLASS_BY_ID.aprendiz!} theme={view.theme} size={48} />
          <div>
            <h2 className="text-lg font-bold">Modo RPG</h2>
            <p className="text-sm text-muted">Seus treinos viram a evolução de um personagem.</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted">
          Classes, nível de classe, missões e atributos, tudo calculado do seu histórico. É opcional: desligar não apaga nada.
        </p>
        <ThemePicker value={view.theme} onChange={t => run((d, n) => setRpgTheme(d, t, n))} />
        <button type="button" onClick={() => run((d, n) => setRpgEnabled(d, true, n))}
          className="mt-3 h-12 w-full rounded-xl bg-primary font-bold text-white">Ligar o modo RPG</button>
      </section>
    );
  }

  const { current } = view;
  const name = className(current.cls, view.theme, view.sex);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`Personagem: ${name}, nível de classe ${current.level.level}. Abrir ficha`}
        className="mt-4 block w-full rounded-2xl border border-line bg-surface p-4 text-left">
        <div className="flex items-center gap-3">
          <RpgEmblem cls={current.cls} theme={view.theme} size={56} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-faint">Personagem · {THEME_LABEL[view.theme]}</p>
            <p className="truncate text-lg font-black">{name}</p>
            <p className="text-sm text-muted">Nível de classe {current.level.level} de {CLASS_CAP[current.cls.tier]} · Base {view.baseLevel}</p>
          </div>
          <Icon name="subir" className="size-5 rotate-90 text-faint" />
        </div>
        <XpBar view={view} />
        {view.options.length > 0 && <p className="mt-2 text-sm font-bold text-success">Nova classe disponível! Toque para escolher.</p>}
      </button>
      <CharacterSheet open={open} onClose={() => setOpen(false)} view={view} />
    </>
  );
}

function XpBar({ view }: { view: RpgView }) {
  const { level, cls } = view.current;
  const pct = level.capped ? 100 : Math.round((level.xpIntoLevel / level.xpToNext) * 100);
  return (
    <div className="mt-3">
      <div className="h-2.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label="XP de classe"
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: emblemColor(cls) }} />
      </div>
      <p className="mt-1 text-xs text-faint">
        {level.capped ? 'Nível máximo da classe' : `${level.xpIntoLevel} / ${level.xpToNext} XP para o nível ${level.level + 1}`}
      </p>
    </div>
  );
}

function CharacterSheet({ open, onClose, view }: { open: boolean; onClose: () => void; view: RpgView }) {
  const run = useAppStore(s => s.run);
  const [picking, setPicking] = useState<string | null>(null);
  const { current, theme, sex } = view;
  const name = (c: RpgClass) => className(c, theme, sex);
  const walked = new Set(view.stages.map(s => s.cls.id));

  return (
    <Sheet title="Personagem" open={open} onClose={onClose}>
      <div className="space-y-5 pb-2">
        <div className="flex items-center gap-4">
          <RpgEmblem cls={current.cls} theme={theme} size={76} />
          <div className="min-w-0">
            <p className="text-2xl font-black leading-tight">{name(current.cls)}</p>
            <p className="text-sm text-muted">{current.cls.about}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Box label="Nível de classe" value={`${current.level.level}`} sub={`de ${CLASS_CAP[current.cls.tier]}`} />
          <Box label="Nível de base" value={`${view.baseLevel}`} sub="o nível do app" />
        </div>
        <XpBar view={view} />
        {view.banked > 0 && (
          <p className="rounded-xl bg-surface-2 p-3 text-sm text-muted">
            <b className="text-ink">{formatNumber(view.banked)} XP guardado.</b>{' '}
            {current.cls.tier < 2 ? 'Entra na próxima classe assim que você escolher, já com a afinidade dela.' : 'Fica guardado para a próxima etapa do modo RPG.'}
          </p>
        )}

        {current.mission && (
          <Section title="Missão de troca de classe">
            <p className="font-semibold">{current.mission.label}</p>
            <Meter value={current.mission.progress} max={current.mission.goal} color={emblemColor(current.cls)} />
            <p className="text-xs text-faint">
              {current.mission.done ? 'Missão cumprida!' : `${formatNumber(current.mission.progress)} de ${formatNumber(current.mission.goal)} ${current.mission.unit}`}
              {' · conta desde o início desta classe'}
            </p>
          </Section>
        )}
        {view.nextHint && <p className="text-sm text-muted">{view.nextHint}</p>}

        {view.options.length > 0 && (
          <Section title={current.cls.tier === 0 ? 'Escolha sua primeira classe' : 'Escolha sua especialização'}>
            <p className="text-sm text-muted">
              {current.cls.tier === 0 ? 'Em ordem de afinidade com o seu histórico. A escolha é sua, e é definitiva.' : 'A escolha é definitiva.'}
            </p>
            <ul className="space-y-2">
              {view.options.map(o => {
                const on = picking === o.cls.id;
                return (
                  <li key={o.cls.id}>
                    <button type="button" aria-pressed={on} onClick={() => setPicking(on ? null : o.cls.id)}
                      className={`flex w-full items-center gap-3 rounded-xl p-3 text-left ${on ? 'bg-surface-2 ring-2 ring-[var(--color-ink)]' : 'bg-surface-2'}`}>
                      <RpgEmblem cls={o.cls} theme={theme} size={44} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold">{name(o.cls)}</span>
                        <span className="block text-sm text-muted">{o.cls.about}</span>
                        <span className="block text-xs text-faint">Afinidade {Math.round(o.affinity * 100)}% · começa no nível {o.startLevel}</span>
                      </span>
                    </button>
                    {on && (
                      <button type="button" onClick={() => { run((d, n) => chooseRpgClass(d, o.cls.id, n)); setPicking(null); }}
                        className="mt-2 h-12 w-full rounded-xl bg-primary font-bold text-white">Virar {name(o.cls)}</button>
                    )}
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        <Section title="Atributos">
          <p className="text-sm text-muted">
            Vêm do seu treino real. {view.points.earned > 0
              ? <>Você tem <b className="text-ink">{view.points.free}</b> de {view.points.earned} pontos de bônus para distribuir (1 a cada 2 níveis de base).</>
              : 'A cada 2 níveis de base você ganha 1 ponto de bônus para distribuir.'}
          </p>
          <ul className="space-y-2">
            {view.stats.map(s => {
              const info = STATS.find(x => x.id === s.id)!;
              return (
                <li key={s.id} className="flex items-center gap-2">
                  <span className="w-10 text-sm font-black">{info.short}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between text-sm">
                      <span className="text-muted">{info.name}</span>
                      <span className="font-bold">{s.total}{s.bonus > 0 && <span className="text-success"> (+{s.bonus})</span>}</span>
                    </span>
                    <Meter value={s.total} max={STAT_MAX} color="var(--color-primary)" />
                  </span>
                  {view.points.earned > 0 && (
                    <span className="flex gap-1">
                      <SmallBtn label={`Tirar ponto de ${info.name}`} disabled={s.bonus <= 0} onClick={() => run((d, n) => allocateRpgPoint(d, s.id, -1, n))}>
                        <Icon name="menos" className="size-4" />
                      </SmallBtn>
                      <SmallBtn label={`Pôr ponto em ${info.name}`} disabled={view.points.free <= 0 || s.total >= STAT_MAX} onClick={() => run((d, n) => allocateRpgPoint(d, s.id, 1, n))}>
                        <Icon name="mais" className="size-4" />
                      </SmallBtn>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <details className="text-sm text-muted">
            <summary className="min-h-11 cursor-pointer py-2 font-semibold text-primary">De onde vem cada atributo</summary>
            <ul className="space-y-1">{STATS.map(s => <li key={s.id}><b className="text-ink">{s.short}</b>: {s.about}</li>)}</ul>
          </details>
        </Section>

        <Section title="Árvore de classes">
          <div className="flex items-center gap-2 text-sm">
            <RpgEmblem cls={RPG_CLASS_BY_ID.aprendiz!} theme={theme} size={32} />
            <span className="font-semibold">{name(RPG_CLASS_BY_ID.aprendiz!)}</span>
            <span className="text-faint">· todos começam aqui</span>
          </div>
          <ul className="space-y-3">
            {FIRST_CLASSES.map(c => {
              const onPath = walked.has(c.id);
              const someoneElse = view.stages.length > 1 && !onPath;
              return (
                <li key={c.id} className={`rounded-xl bg-surface-2 p-3 ${someoneElse ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-2">
                    <RpgEmblem cls={c} theme={theme} size={36} dim={someoneElse} />
                    <span className="font-bold">{name(c)}</span>
                    {onPath && <span className="ml-auto rounded-full bg-success px-2 text-xs font-bold text-white">{current.cls.id === c.id ? 'atual' : 'feita'}</span>}
                  </div>
                  <p className="mt-1 text-xs text-muted">{c.about}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {secondClassesOf(c.id).map(s => (
                      <div key={s.id} className={`flex items-center gap-2 rounded-lg p-1.5 ${walked.has(s.id) ? 'bg-surface ring-2 ring-[#e6b93a]' : ''}`}>
                        <RpgEmblem cls={s} theme={theme} size={26} dim={!walked.has(s.id)} />
                        <span className="min-w-0 text-xs font-semibold leading-tight">{name(s)}</span>
                      </div>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>

        <Section title="Tema dos nomes">
          <ThemePicker value={theme} onChange={t => run((d, n) => setRpgTheme(d, t, n))} />
          <p className="text-xs text-faint">As regras são as mesmas nos dois temas: trocar não muda o seu progresso.</p>
        </Section>

        <details className="text-sm text-muted">
          <summary className="min-h-11 cursor-pointer py-2 font-semibold text-primary">Como funciona</summary>
          <div className="space-y-2">
            <p>Cada dia de treino vale XP de classe, e cada semana com a sua meta cumprida ({view.history.target} treinos) vale um bônus. Só um treino por dia conta, e no máximo 6 dias por semana: descansar faz parte.</p>
            <p>A classe ganha até 50% a mais nos treinos que combinam com ela (afinidade). O {name(RPG_CLASS_BY_ID.novico!)} ganha a semana cumprida em dobro.</p>
            <p>O {name(RPG_CLASS_BY_ID.aprendiz!)} vai até o nível {CLASS_CAP[0]}; as classes, até o {CLASS_CAP[1]}. O XP que passa do teto fica guardado para a próxima classe. Para trocar de classe, cumpra a missão dela.</p>
            <p>Tudo é calculado do seu histórico: corrigir ou apagar um treino corrige o personagem.</p>
          </div>
        </details>

        <button type="button" onClick={() => { run((d, n) => setRpgEnabled(d, false, n)); onClose(); }}
          className="h-12 w-full rounded-xl bg-surface-2 font-semibold text-muted">Desligar o modo RPG</button>
        <p className="text-center text-xs text-faint">Desligado, o app volta a ser como antes. Ao religar, tudo continua de onde parou.</p>
      </div>
    </Sheet>
  );
}

function ThemePicker({ value, onChange }: { value: RpgTheme; onChange: (t: RpgTheme) => void }) {
  return (
    <div role="radiogroup" aria-label="Tema dos nomes das classes" className="mt-3 grid grid-cols-2 gap-2">
      {(['classico', 'maromba'] as const).map(t => {
        const on = value === t;
        return (
          <button key={t} type="button" role="radio" aria-checked={on} onClick={() => onChange(t)}
            className={`rounded-xl p-3 text-left ${on ? 'bg-surface-2 ring-2 ring-[var(--color-ink)]' : 'bg-surface-2 text-muted'}`}>
            <span className="block font-bold text-ink">{THEME_LABEL[t]}</span>
            <span className="block text-xs">{THEME_ABOUT[t]}</span>
          </button>
        );
      })}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-2"><h3 className="text-base font-bold">{title}</h3>{children}</section>;
}

function Box({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs text-faint">{sub}</p>
    </div>
  );
}

function Meter({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <div className="h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function SmallBtn({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick}
      className="flex size-11 items-center justify-center rounded-lg bg-surface-2 text-ink disabled:opacity-30">{children}</button>
  );
}
