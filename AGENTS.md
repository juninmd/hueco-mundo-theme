# AGENTS.md

Tema escuro "Hueco Mundo" (CSS puro) + Hollowzinho (`<hollow-pet>`, web component) e o que o leva ao VS Code e ao Claude Code. Idioma: pt-BR na documentação e na UI; código e commits em inglês.

## Stack
- JS/ESM puro, Node.js 22 (versão do CI), npm. Sem build e sem lint. Única devDependency: `playwright`.
- `theme/` CSS; `pet/hollow-pet.js` (+ `.d.ts`); `vscode/theme` e `vscode/pet` (extensões); `claude-code/hollowzinho` (plugin, hooks em TS/TSX); `scripts/` ferramentas; `index.html` + `site/` página de demonstração.

## Comandos (todos de `package.json`)
- `npm install` e, na primeira vez, `npx playwright install chromium`.
- `npm test`: `sync --check` + `contrast` + `ext-test` + `smoke` (navegador) + `claude:check`. É o gate.
- `npm run sync`: copia `pet/hollow-pet.js` para `vscode/pet/media` (rode depois de editar o pet).
- `npm run serve` (página em http://127.0.0.1:8080), `shots`, `demo` (precisa de ffmpeg), `bundle`, `claude:test`, `claude:preview`.

## Gates de CI
- `Validate`: reusable do `juninmd/base-actions` (segredos, `npm test`, audit `high`).
- `Security Scan`: Gitleaks no histórico, semanal e a cada push na `master`.

## Não faça
- Não edite `vscode/pet/media/hollow-pet.js` à mão: é cópia gerada por `npm run sync`.
- Não regrave `docs/shots` e `docs/claude-code` à mão; use `shots`/`demo`/`claude:preview`.
- Não commite `.env`, chaves ou tokens; as únicas variáveis lidas (`PORT`, `TITLE`, `DEMO_*`, `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH`, `PREVIEW_TMP`) são opções dos scripts.
- Não adicione dependências de runtime: a promessa do README é "zero dependências".
- Não deixe `contrast` falhar: o contraste WCAG AA é requisito do tema.

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