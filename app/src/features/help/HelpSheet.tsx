import { useMemo, useState } from 'react';
import { HELP_AREAS, HELP_NEEDS, HELP_TOPICS, searchHelp, type HelpTopic } from '../../data/help-topics';
import { useAppStore } from '../../store';
import { useUiStore, type Tab } from '../../store/ui-store';
import { Sheet } from '../../ui/Sheet';
import { afterSheetCloses, goToHelp } from './help-nav';
import { startTour } from './Tour';

/** A seção opcional do tópico está ligada? */
function useNeedsOn() {
  const protocol = useAppStore(s => !!s.data?.settings.protocolEnabled);
  return { protocol };
}

/** Ajuda: onde fica e o que faz cada função, com busca e atalho até ela. */
export function HelpSheet() {
  const opened = useUiStore(s => s.help);
  if (!opened) return null;
  return <HelpBody key={opened} start={opened} />;
}

function HelpBody({ start }: { start: Tab }) {
  const [area, setArea] = useState<Tab | 'todas'>(start);
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const close = () => useUiStore.setState({ help: null });
  const searching = query.trim().length > 0;
  const topics = useMemo(() => searchHelp(query, searching || area === 'todas' ? HELP_TOPICS : HELP_TOPICS.filter(t => t.area === area)), [query, area, searching]);
  const groups = HELP_AREAS.map(a => ({ ...a, topics: topics.filter(t => t.area === a.id) })).filter(g => g.topics.length);
  const go = (fn: () => void) => { close(); afterSheetCloses(fn); };

  return (
    <Sheet title="Ajuda" open onClose={close}>
      <div className="space-y-3 pb-2">
        <button type="button" onClick={() => go(startTour)}
          className="h-12 w-full rounded-xl bg-primary font-bold text-white">Fazer o tour do app</button>
        <input type="search" value={query} onChange={e => setQuery(e.target.value)} aria-label="Buscar na ajuda"
          placeholder="Buscar: anilhas, backup, protocolo…"
          className="h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink" />
        {!searching && (
          <div role="radiogroup" aria-label="Área da ajuda" className="flex gap-1 overflow-x-auto pb-1">
            {[{ id: 'todas' as const, label: 'Todas' }, ...HELP_AREAS].map(a => (
              <button key={a.id} type="button" role="radio" aria-checked={area === a.id} onClick={() => { setArea(a.id); setOpenId(null); }}
                className={`h-10 shrink-0 rounded-full px-3 text-sm font-semibold ${area === a.id ? 'bg-primary text-white' : 'bg-surface-2 text-muted'}`}>
                {a.label}
              </button>
            ))}
          </div>
        )}
        {groups.length === 0 && (
          <p role="status" className="rounded-xl bg-surface-2 p-3 text-sm text-muted">
            Nada encontrado para "{query.trim()}". Tente outra palavra ou, se for um problema, use Relatar um problema em Perfil › Sobre.
          </p>
        )}
        {groups.map(g => (
          <section key={g.id} aria-label={`Ajuda: ${g.label}`}>
            <h3 className="text-sm font-bold text-muted">{g.label}</h3>
            {!searching && area !== 'todas' && <p className="text-sm text-faint">{g.intro}</p>}
            <ul className="mt-1 divide-y divide-line">
              {g.topics.map(t => (
                <TopicItem key={t.id} topic={t} open={openId === t.id} onToggle={() => setOpenId(openId === t.id ? null : t.id)}
                  onGo={target => go(() => void goToHelp(target))} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Sheet>
  );
}

function TopicItem({ topic, open, onToggle, onGo }: { topic: HelpTopic; open: boolean; onToggle: () => void; onGo: (t: NonNullable<HelpTopic['go']>) => void }) {
  const on = useNeedsOn();
  const off = topic.needs && !on[topic.needs] ? HELP_NEEDS[topic.needs] : null;
  const target = off ? off.go : topic.go;
  return (
    <li>
      <button type="button" aria-expanded={open} onClick={onToggle} className="flex min-h-12 w-full items-center justify-between gap-2 py-2 text-left font-semibold">
        {topic.title}
        <span aria-hidden="true" className="text-faint">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="pb-3 text-sm">
          <p><span className="font-semibold text-muted">Onde fica: </span>{topic.where}</p>
          <p className="mt-1 text-muted">{topic.what}</p>
          {off && <p className="mt-1 font-semibold text-warning">{off.off}</p>}
          {target && (
            <button type="button" onClick={() => onGo(target)} className="mt-2 h-10 rounded-xl bg-surface-2 px-3 font-bold text-info">
              {off ? 'Ir até onde se liga' : 'Ir até lá'}
            </button>
          )}
        </div>
      )}
    </li>
  );
}
