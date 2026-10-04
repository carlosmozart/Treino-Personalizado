import { useEffect, useState } from 'react';
import { updateMeta } from '../../domain/actions';
import { RELEASE_NOTES, notesToShow, type ReleaseNote } from '../../data/release-notes';
import { useAppStore } from '../../store';
import { Sheet } from '../../ui/Sheet';

/** Novidades da versão, uma vez depois de atualizar. Instalação nova só registra a versão. */
export function WhatsNew() {
  const status = useAppStore(s => s.status);
  const run = useAppStore(s => s.run);
  const [note, setNote] = useState<ReleaseNote | null>(null);
  useEffect(() => {
    if (status !== 'ready') return;
    const data = useAppStore.getState().data;
    if (!data) return;
    const show = notesToShow(data.meta.lastSeenVersion, __APP_VERSION__);
    if (data.meta.lastSeenVersion === __APP_VERSION__) return;
    const used = data.workouts.length > 0 || Object.keys(data.plans).length > 0;
    if (show && used) setNote(show);
    run(d => updateMeta(d, { lastSeenVersion: __APP_VERSION__ }));
  }, [status, run]);
  return <NotesSheet note={note} onClose={() => setNote(null)} />;
}

export function NotesSheet({ note, onClose }: { note: ReleaseNote | null; onClose: () => void }) {
  if (!note) return null;
  return (
    <Sheet title={`Novidades da versão ${note.version}`} open onClose={onClose}>
      <ul className="list-disc space-y-2 pl-5 text-muted">{note.items.map(i => <li key={i}>{i}</li>)}</ul>
      <button type="button" onClick={onClose} className="mt-4 h-12 w-full rounded-xl bg-primary font-bold text-white">Entendi</button>
    </Sheet>
  );
}

/** Botão em Perfil → Sobre. */
export function WhatsNewButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="h-11 font-semibold text-primary">Novidades</button>
      <NotesSheet note={open ? RELEASE_NOTES[0]! : null} onClose={() => setOpen(false)} />
    </>
  );
}
