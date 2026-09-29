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

## Validação pendente em 29/09/2026

A etapa intermediária passou em 113 testes unitários e 36 testes de navegador. Depois das extrações adicionais, os 113 testes unitários passaram novamente, mas os primeiros testes de navegador falharam porque o cadastro inicial não apareceu. A suíte foi interrompida; a causa ainda não foi confirmada. O usuário solicitou suspender novas execuções e registrar as pendências antes do commit/push.

O teste de inicialização com captura de erros e os quatro casos de `module-regression.test.mjs` foram adicionados posteriormente e ainda não executados. Retomar por A7/A8 do TODO e concluir a validação antes de gerar ou distribuir APK. Os resultados intermediários não validam o estado final deste commit.
