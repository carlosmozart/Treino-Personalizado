# Gerar o APK Android

O projeto usa [Capacitor](https://capacitorjs.com/docs), que empacota os mesmos arquivos HTML,
CSS e JavaScript do PWA dentro de um aplicativo Android. Os dados de treino continuam locais no
aparelho; não há servidor nem conta obrigatória.

## Pré-requisitos

- Node.js 22 ou superior.
- Android Studio instalado com Android SDK e Platform Tools. O Android Studio instala o JDK
  necessário. O Capacitor 8 suporta Android 7 (API 24) ou mais recente.

## Primeira preparação

Na raiz do projeto, execute:

```powershell
npm install
npx cap add android
```

O identificador `com.treinopersonalizado.app` em `capacitor.config.json` precisa ser único antes
de publicar na Play Store. Troque-o pelo identificador definitivo antes de executar `cap add`.

## Desenvolvimento e APK de teste

```powershell
npm run open:android
```

O comando atualiza `www/`, sincroniza os arquivos no projeto Android e abre o Android Studio.
No Android Studio, selecione um celular/emulador e use **Run**. Para gerar um APK de teste pela
linha de comando:

```powershell
npm run build:apk
```

O arquivo assinado será criado em `android/app/build/outputs/apk/release/` com o nome
`treino-personalizado-vX.Y.Z.apk`, por exemplo `treino-personalizado-v2.19.0.apk`.

## Versão de publicação

Antes de cada versão distribuída, alinhe `APP_VERSION` em `index.html`, a versão em
`package.json`, o `versionName` e o `versionCode` em `android/app/build.gradle` e o nome do
cache em `sw.js`. O `versionCode` precisa ser um inteiro maior que o da publicação anterior.

## Ícone Android

O ativo-fonte está em `assets/icon-only.png`. Depois de trocá-lo, execute
`npm run generate:android-icons` para atualizar os tamanhos nativos do Android antes do build.

## Chave de assinatura

A chave de release fica em `android/keystore/` e a configuração local em
`android/keystore.properties`; ambos são ignorados pelo Git de propósito. Faça uma cópia
criptografada dos dois em um gerenciador de senhas ou cofre seguro. Para atualizar qualquer APK
já instalado, use sempre a mesma chave e o mesmo `applicationId`.

Se for publicar na Play Store, ative **Play App Signing** e guarde esta chave como a chave de
upload. Para distribuição direta por APK, ela também é a chave que garante que uma versão nova é
reconhecida como atualização da anterior.

## Antes de publicar

- Teste em um celular físico: abertura sem internet, cronômetro, vibração, backup e restauração.
- Gere e configure uma chave de assinatura para uma versão `release`; o APK de debug não deve ser
  publicado.
- Para a Play Store, gere preferencialmente um Android App Bundle (`.aab`) assinado.
- Após configurar a assinatura de release no Android Studio, use `npm run build:aab`. O resultado
  fica em `android/app/build/outputs/bundle/release/`.
- A cada alteração web, rode `npm run sync:android` antes de abrir/compilar o Android.

## Atualização dentro do app

O APK verifica, no máximo uma vez por dia e também pelo botão "Procurar atualização" no rodapé,
a release mais recente de `carlosmozart/Treino-Personalizado` na API pública do GitHub. Se a tag
(`vX.Y.Z`) for maior que `APP_VERSION`, o app oferece a atualização:

1. `AppUpdatePlugin` (Java) baixa o `.apk` só de `github.com/carlosmozart/Treino-Personalizado/releases/download/`.
2. O SHA-256 é obrigatório: vem do campo `digest` do asset ou da linha `SHA-256: <hex>` nas notas
   da release. Sem hash ou com hash diferente, nada é instalado.
3. O instalador do Android é aberto; na primeira vez ele pede a permissão "instalar apps desconhecidos".
   O Android também recusa um APK assinado com outra chave, então os dados do app são preservados.

Esta é a única chamada de rede do app, e só existe no APK (a versão web não consulta nada).

Para publicar uma atualização: suba a versão (e a entrada do CHANGELOG) e rode o workflow
**Android release APK** com "Publicar como Release" marcado. Ele cria a tag `vX.Y.Z`, anexa o
`.apk` e o `.apk.sha256` e usa a seção da versão do CHANGELOG como notas, com a linha `SHA-256:`
no fim. Se a release já existir, o workflow falha em vez de sobrescrever. Releases marcadas como
*pre-release* ou rascunho são ignoradas pelo app.
