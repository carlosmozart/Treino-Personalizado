# Arquitetura e manutenção

O projeto é uma aplicação web local, empacotada no Android com Capacitor. Não há servidor nem coleta automática de dados: o estado do usuário fica no armazenamento local do navegador/WebView e é transferido entre instalações por backup JSON.

## Pontos de entrada

- `index.html`: interface, estilos compilados e lógica da aplicação. É a fonte de verdade do PWA.
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

## Próxima etapa de modularização

O app ainda concentra sua lógica em `index.html` por compatibilidade com a publicação web atual. Funcionalidades novas devem ser extraídas primeiro como módulos pequenos e testáveis (por exemplo, backup, validação e formatação), mantendo a página como composição até que haja cobertura automatizada equivalente. Assim, a organização melhora sem arriscar a migração dos dados dos testadores.
