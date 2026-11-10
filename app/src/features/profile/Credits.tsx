import { useState } from 'react';
import { Sheet } from '../../ui/Sheet';

const LINK = 'font-semibold text-info underline';

/** Créditos e licenças (Q3): a atribuição que a CC BY-SA pede, num lugar fixo do app. */
export function CreditsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="h-11 font-semibold text-primary">Créditos e licenças</button>
      <Sheet title="Créditos e licenças" open={open} onClose={() => setOpen(false)}>
        <div className="space-y-4 px-1 pb-3 text-sm">
          <section>
            <h3 className="font-bold">Ilustrações dos exercícios</h3>
            <p className="mt-1 text-muted">
              Everkinetic, criado por Greg Priday (<a className={LINK} href="https://github.com/everkinetic/data" target="_blank" rel="noreferrer">github.com/everkinetic/data</a>),
              sob a licença Creative Commons Atribuição-CompartilhaIgual 4.0 (<a className={LINK} href="https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>).
            </p>
            <p className="mt-1 text-muted">
              Modificações: fundo removido, traço na cor do tema, coordenadas arredondadas e alguns desenhos
              vetorizados a partir das imagens PNG do projeto. As ilustrações
              modificadas seguem sob a mesma licença.
            </p>
          </section>
          <section>
            <h3 className="font-bold">Personagem do modo RPG</h3>
            <p className="mt-1 text-muted">
              Retratos em camadas do OpenWorld (<a className={LINK} href="https://github.com/SihanXU/openworld" target="_blank" rel="noreferrer">github.com/SihanXU/openworld</a>),
              dedicados ao domínio público pelos autores (<a className={LINK} href="https://creativecommons.org/publicdomain/zero/1.0/deed.pt-br" target="_blank" rel="noreferrer">CC0 1.0</a>).
              Reduzidos à metade e escolhidos só os corpos adultos.
            </p>
            <p className="mt-1 text-muted">
              A montagem do retrato e a tabela de cores foram adaptadas do código do OpenWorld (licença MIT,
              Copyright (c) 2026 The OpenWorld authors). Emblemas, classes e animações são do próprio app.
            </p>
          </section>
          <section>
            <h3 className="font-bold">Programas de código aberto</h3>
            <p className="mt-1 text-muted">
              React e React DOM (Meta, licença MIT), Zustand (Poimandres, MIT), Capacitor (Ionic, MIT),
              Workbox (Google, MIT) e Tailwind CSS (Tailwind Labs, MIT).
            </p>
          </section>
        </div>
      </Sheet>
    </>
  );
}
