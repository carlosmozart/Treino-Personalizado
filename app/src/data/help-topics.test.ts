// Ajuda: o conteúdo, a busca e se cada "Ir até lá" aponta para um lugar que existe na tela.
import { describe, expect, it } from 'vitest';
import { TABS } from '../store/ui-store';
import { HELP_AREAS, HELP_NEEDS, HELP_TOPICS, searchHelp } from './help-topics';
import { TOUR_STEPS } from '../features/help/Tour';

/** Todo o código das telas, para conferir as marcas data-help. */
const SRC = Object.values(import.meta.glob<string>(['../**/*.tsx', '!../**/*.test.tsx'], { query: '?raw', import: 'default', eager: true })).join('\n');
const anchorExists = (anchor: string) =>
  SRC.includes(`data-help="${anchor}"`) || SRC.includes(`help="${anchor}"`) || SRC.includes(`<SettingsGroup id="${anchor}"`)
  || (anchor.startsWith('aba-') && SRC.includes('data-help={`aba-${key}`}') && (TABS as readonly string[]).includes(anchor.slice(4)));

describe('Ajuda', () => {
  it('cada tópico tem id único, área válida, caminho e explicação', () => {
    const ids = HELP_TOPICS.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of HELP_TOPICS) {
      expect(HELP_AREAS.map(a => a.id)).toContain(t.area);
      expect(t.where.length).toBeGreaterThan(3);
      expect(t.what.length).toBeGreaterThan(20);
    }
    // toda aba tem tópicos
    for (const a of HELP_AREAS) expect(HELP_TOPICS.some(t => t.area === a.id)).toBe(true);
  });

  it('"Ir até lá" e o tour apontam para marcas que existem nas telas', () => {
    const anchors = [
      ...HELP_TOPICS.flatMap(t => (t.go?.anchor ? [t.go.anchor] : [])),
      ...Object.values(HELP_NEEDS).flatMap(n => (n.go.anchor ? [n.go.anchor] : [])),
      ...TOUR_STEPS.flatMap(s => (s.anchor ? [s.anchor] : []))
    ];
    expect(anchors.filter(a => !anchorExists(a))).toEqual([]);
  });

  it('busca sem acento nem maiúscula, por qualquer palavra do tópico', () => {
    expect(searchHelp('ANILHA').map(t => t.id)).toContain('anilhas');
    expect(searchHelp('hormonio').map(t => t.id)).toEqual(expect.arrayContaining(['protocolo', 'ligar-protocolo']));
    expect(searchHelp('celular novo').map(t => t.id)).toContain('backup');
    expect(searchHelp('  ')).toHaveLength(HELP_TOPICS.length);
    expect(searchHelp('xyzzy')).toEqual([]);
  });

  it('o protocolo desligado manda ligar no Perfil', () => {
    expect(HELP_TOPICS.find(t => t.id === 'protocolo')).toMatchObject({ needs: 'protocol', go: { tab: 'progresso', view: 'protocol' } });
    expect(HELP_NEEDS.protocol.go).toEqual({ tab: 'perfil', anchor: 'protocolo-ligar' });
  });
});
