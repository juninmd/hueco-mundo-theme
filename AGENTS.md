# AGENTS.md

Tema escuro "Hueco Mundo" em CSS puro, mais o Hollowzinho (`<hollow-pet>`, web component) e as extensões que o levam ao VS Code e ao Claude Code.

## Stack
- JavaScript/ESM puro, npm, sem build e sem lint. Única devDependency: `playwright`.
- `theme/` (CSS), `pet/hollow-pet.js` (+ `.d.ts`), `vscode/theme` e `vscode/pet` (extensões), `claude-code/hollowzinho` (plugin, hooks em TS/TSX), `scripts/` (ferramentas), `index.html` + `site/` (demo).

## Commands
- Setup: `npm install`; na primeira vez, `npx playwright install chromium`.
- Gate: `npm test` = `sync --check` + `contrast` + `ext-test` + `smoke` (navegador) + `claude:check`.
- Individuais: `npm run contrast`, `npm run smoke`, `npm run ext-test`, `npm run claude:check`.
- Gerar: `npm run sync` (copia `pet/hollow-pet.js` para `vscode/pet/media`), `shots`, `demo` (precisa de ffmpeg), `bundle`.
- Dev: `npm run serve` (http://127.0.0.1:8080), `claude:preview`, `claude:test`.

## Structure
- `theme/`: CSS do tema, tokens e fontes locais (`theme/fonts/`)
- `pet/`: web component `hollow-pet.js` e demo
- `vscode/theme/`, `vscode/pet/`: extensões do VS Code
- `claude-code/hollowzinho/`, `claude-code/hueco-look/`: plugins do Claude Code (hooks, testes)
- `scripts/`: serve, sync, contraste, smoke, screenshots, demo, bundle
- `docs/shots/`, `docs/claude-code/`: imagens geradas; não editar à mão
- `.github/workflows/`: Validate (reusable de `juninmd/base-actions`), SAST, Security Scan (Gitleaks)

## Conventions
- Documentação e UI em pt-BR; código e commits em inglês.
- Zero dependências de runtime: o README promete isso.
- Contraste WCAG AA é requisito do tema: `npm run contrast` não pode falhar.
- Variáveis de ambiente lidas são só opções de script: `PORT`, `TITLE`, `DEMO_FORMAT`, `DEMO_WIDTH`, `DEMO_FPS`, `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH`, `PREVIEW_TMP`.

## Gotchas
- `vscode/pet/media/hollow-pet.js` é cópia gerada: edite `pet/hollow-pet.js` e rode `npm run sync`.
- `docs/shots` e `docs/claude-code` são gerados por `shots`/`demo`/`claude:preview`; não regravar à mão.
- Não commitar `.env`, chaves ou tokens.

<!-- base-actions-main-policy -->
## GitHub Actions — padrão obrigatório (@main)

- Referencie as actions internas sempre pelo branch, nunca por SHA:
  - `uses: juninmd/base-actions/<action>@main`
  - `uses: juninmd/base-actions/.github/workflows/<arquivo>.yml@main`
- Não fixe `@<sha>` em `juninmd/base-actions`: a atualização é centralizada no
  `main` e passa a valer no próximo run.
- PRs cujos checks não iniciam por billing/spending limit são mesclados pelo bot central
  `juninmd/base-actions/.github/workflows/auto-merge-billing-blocked.yml`.
  Para impedir o merge automático de um PR, aplique a label `do-not-merge`.
