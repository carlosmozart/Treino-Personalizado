# Arquitetura e manutenção

O projeto é uma aplicação web local, empacotada no Android com Capacitor. Não há servidor nem coleta automática de dados: o estado do usuário fica no armazenamento local do navegador/WebView e é transferido entre instalações por backup JSON.

## Pontos de entrada

- `index.html`: interface, estilos compilados, estado compartilhado e composição dos módulos do PWA.
- `js/core/` e `js/ui/`: regras e fluxos extraídos, carregados por scripts locais e incluídos no cache offline.
- `sw.js` e `manifest.json`: instalação e funcionamento offline da versão web.
- `scripts/prepare-web.mjs`: gera `www/` a partir dos arquivos fonte para o Capacitor.
- `android/`: projeto nativo. Não editar `android/app/src/main/assets/public` diretamente; ele é gerado por `npm run sync:android`.
- `tests/release-readiness.mjs`: valida contratos de lançamento que não podem divergir, como versões, ID do pacote, backup e requisitos de acessibilidade.

## Comandos de segurança

```powershell
npm run verify
npm run sync:android
cd android
.\gradlew.bat test
```

Em uma máquina com aparelho ou emulador configurado, execute também `./gradlew.bat connectedAndroidTest` dentro de `android/`.

## Regra para novas mudanças

1. Mude a versão em `index.html`, `package.json`, `sw.js` e `android/app/build.gradle` na mesma alteração.
2. Se alterar dados persistidos, preserve compatibilidade de importação e acrescente um caso ao roteiro de aparelho.
3. Nunca inclua chaves, keystores ou `keystore.properties` no Git.
4. Antes de gerar um APK, rode `npm run verify` e o roteiro em `docs/testes-em-aparelho.md`.

## Inicialização e ciclo de vida

- `js/ui/app-lifecycle.js`: recuperação de restauração interrompida, carregamento inicial, virada de dia e atualização do service worker apenas no PWA.
- `js/ui/onboarding.js`: cadastro inicial, reutilizando a validação e gravação do perfil.
- `js/ui/release-notes.js`: novidades e registro da versão visualizada.
- `js/ui/modal-accessibility.js`: identificação dos diálogos, contenção e retorno do foco.
- `js/core/history-storage.js`: conexão e migração para IndexedDB, gravação dos históricos, fallback local e descarte de conexões antigas após limpeza.
- `js/core/local-persistence.js`: gravação JSON com bloqueio durante restauração e aviso único de falta de espaço.
- `js/core/workout-duration.js`: início, fim e apresentação da duração do treino.
- `js/ui/tooltips.js` e `js/ui/confirmation.js`: bolhas de nomes/gráficos e confirmação assíncrona.

A composição em `index.html` injeta callbacks para ler o perfil e o estado de restauração atuais. A inicialização aguarda o histórico persistido antes das migrações e da renderização do treino; a interface permanece bloqueada durante essa leitura. A recuperação de backup interrompido ocorre antes de qualquer inicialização normal.

`npm run verify` verifica também a sintaxe dos scripts locais carregados pela página. Execute `npm run test:smoke` para validar os fluxos completos no navegador. Os testes atuais exigem Node 22.12 ou superior compatível; Node 24 é uma opção suportada.

## Continuação da modularização

O app mantém estado compartilhado, adaptadores e alguns blocos de lógica em `index.html`. Revise os blocos remanescentes antes de encerrar G1 no TODO. Funcionalidades novas devem ser extraídas como módulos pequenos e testáveis, mantendo a página como composição. Assim, a organização melhora sem arriscar a migração dos dados dos testadores.

Inventário da revisão de 29/09/2026:

- `js/ui/app-feedback.js`, `clipboard.js`, `workout-summary.js` e `workout-controls.js` agora concentram toasts, cabeçalho, dicas, seleção/apresentação do treino, cópia e controles de finalização.
- `js/core/initial-migrations.js`, `history-queries.js` e `workout-calories.js` concentram preparação dos planos, consultas do histórico e composição das calorias. O plano inicial está em `data/seed-workouts.js`.
- Constantes, referências ao DOM, estado compartilhado e funções que apenas encaminham chamadas podem continuar na composição; sua presença não exige um novo módulo por função.

A extração da persistência não altera nomes do banco, object store ou chaves existentes. Os testes cobrem restauração interrompida, histórico local quando IndexedDB não está disponível, preservação do rascunho e proteção contra uma conexão antiga sobrescrever os dados atuais.

## Validação em 29/09/2026

A referência `NOME_DESCONHECIDO` havia sido movida para `history-queries.js`, mas continuava sendo lida diretamente na composição de `workoutDay`, interrompendo o script antes de registrar a inicialização. A constante agora é exportada pelo módulo e injetada explicitamente. O teste de abertura passou no Chromium: cadastro visível, interface liberada e nenhum erro de execução.

`npm run verify` passou: sintaxe dos scripts locais, contratos de release e 117 testes unitários em 27 arquivos, incluindo os quatro casos de regressão adicionados após a extração.

A suíte de navegador aprovou 36 casos e encontrou uma dependência do teste de backup na variável privada `toastQueue`. O teste foi atualizado para observar o aviso público na tela, preservar as verificações de integridade do localStorage/IndexedDB e controlar os temporizadores com o relógio do Playwright. Sua reexecução isolada passou. Os 37 casos estão aprovados entre a rodada completa e essa reexecução; a suíte completa não foi repetida após o último ajuste exclusivo desse teste.

A validação física do APK permanece em A9: a consulta ao ADB não encontrou aparelho ou emulador conectado. Entrega de notificações com tela bloqueada/música, atualização sobre APK anterior e TalkBack ainda precisam de validação em aparelho.
