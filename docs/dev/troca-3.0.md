# Troca para a 3.0.0 (P8)

Roteiro para o app novo (`app/`) substituir o app atual (raiz, 2.x) no mesmo pacote Android.
Preparado em 04/10/2026; a execução depende do nome final e da validação no aparelho (A9).

## Por que a migração acontece sozinha

O APK continua com o mesmo id (`com.treinopersonalizado.app`) e o WebView do Capacitor serve as
duas versões na mesma origem (`https://localhost`). Ao abrir pela primeira vez, o app novo lê o
localStorage/IndexedDB do app antigo, converte para o formato novo (testado com dois backups
reais) e guarda uma cópia bruta antes. **Nada do formato antigo é alterado nem apagado.**

## Antes

- [ ] Nome definido (o "Vigor Gym" é provisório) e pesquisado no INPI.
- [ ] Ícone e nome visual: `android/app/src/main/res/values/strings.xml` (`app_name`,
      `title_activity_main`), ícones do Android, `app/index.html` (`<title>`), manifesto do PWA
      em `app/vite.config.ts`, rodapé do `App.tsx`. Não mudam: repositório, appId, chaves de dados.
- [ ] Lista de equivalência ([equivalencia.md](equivalencia.md)) sem ❌ nem 🟡 e itens 📱 validados
      no APK de teste.
- [ ] Rodar a migração sobre o backup real dos outros 2 usuários, localmente (P3).
- [ ] Pedir aos 3 usuários um backup manual no 2.x antes de atualizar (segurança extra).

## Versão

- [ ] `package.json`, `app/package.json` e `android/app/build.gradle` (`versionName "3.0.0"`,
      `versionCode 30000`) com a mesma versão — o workflow confere e para se divergirem.
- [ ] `CHANGELOG.md` com a seção `## [3.0.0]` (vira as notas da release).
- [ ] `app/src/data/release-notes.ts` revisado (novidades mostradas no primeiro uso).

## Publicar

1. Actions → **Android release APK** → `app: novo`, `publish: true`.
   O workflow testa o app novo (unitários + navegador), gera o APK assinado com a chave de
   release e publica a release `v3.0.0`.
2. Primeiro no celular do Carlos: o 2.21.x oferece a atualização → instalar → abrir → conferir
   treinos, planos, peso, conquistas e meta. Só então avisar os outros dois.

## Se der errado

Os dados antigos ficam intactos. Para voltar, publicar uma 3.0.1 com `app: atual` (o Android não
aceita versionCode menor); o app 2.x volta a ler exatamente o que havia antes.

## Depois

- [ ] GitHub Pages: hoje publica a raiz (2.x). Passar a publicar `app/dist` (workflow de Pages).
- [ ] Arquivar o app antigo (raiz) numa pasta/branch e limpar o CI.
- [ ] Nuvem (P10): Firebase com login Google, quando o projeto existir.
