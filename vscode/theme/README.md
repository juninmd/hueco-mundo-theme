# Hueco Mundo para VS Code

Tema escuro inspirado no deserto de Bleach: osso, vazio e o vermelho do Cero.

- Interface e terminal: 219 cores, com a paleta ANSI de 16 cores.
- Sintaxe: palavras-chave em vermelho `#f6506d`, textos em verde `#86efac`, números em ouro `#fbbf24`, funções em azul de lua `#8ecdf5`, tipos em pergaminho `#f3d9a4`.
- Tokens semânticos ligados (`semanticHighlighting`).
- Todas as cores de sintaxe passam WCAG AA sobre o fundo `#0b0c10`.

## Instalar

```sh
cp -r vscode/theme ~/.vscode/extensions/hueco-mundo
```

Reinicie o VS Code e escolha **Hueco Mundo** em *Preferências → Tema de Cores*. Para empacotar: `npx @vscode/vsce package`.

> Validado: JSON, contraste e `vsce package`.

Veja o projeto completo em [hueco-mundo-theme](https://github.com/juninmd/hueco-mundo-theme).
