# Hueco Mundo para VS Code

Tema escuro inspirado no deserto de Bleach: **osso, vazio e o vermelho do Cero.** Fundo quase preto com um toque de azul, texto cor de osso, e o vermelho só onde ele precisa chamar a atenção: a aba ativa, o foco, a barra de status e as palavras-chave.

![TypeScript no Hueco Mundo](https://github.com/juninmd/hueco-mundo-theme/raw/HEAD/vscode/theme/docs/ts.png)

## O que tem

- **309 cores** de interface: editor, abas, barra lateral, painel, menus, notificações, depurador, Git, SCM, terminal, chat, ícones de símbolo, régua e minimapa.
- **Terminal** com a paleta ANSI de 16 cores.
- **Realce semântico** ligado: parâmetros em itálico, `this` em vermelho, constantes em âmbar.
- Funciona bem com a fonte que você já usa. Os prints usam DejaVu Sans Mono.

![CSS e terminal no Hueco Mundo](https://github.com/juninmd/hueco-mundo-theme/raw/HEAD/vscode/theme/docs/terminal.png)

## Sintaxe

| O quê | Cor | |
| --- | --- | --- |
| Palavras-chave, `this`, títulos de Markdown | `#f6506d` | vermelho do Cero |
| Textos | `#86efac` | verde-reiatsu |
| Números, constantes, decoradores | `#fbbf24` | ouro de olho de Hollow |
| Funções, variáveis de CSS, links | `#8ecdf5` | azul de lua |
| Tipos e classes | `#f3d9a4` | pergaminho |
| Propriedades | `#d9d3c4` | areia |
| Comentários | `#8c877e` | em itálico |

Todas passam **WCAG AA** (4,5:1) sobre o fundo `#0b0c10`, assim como o texto da barra de status, das abas e do terminal. O repositório tem um script que confere (`npm run contrast`, 58 pares).

![Tokens de CSS com os quadradinhos de cor](https://github.com/juninmd/hueco-mundo-theme/raw/HEAD/vscode/theme/docs/css.png)

## Instalar

Pelo arquivo `.vsix` (gerado com `npx @vscode/vsce package` nesta pasta):

```sh
code --install-extension hueco-mundo-0.1.0.vsix
```

Ou copie a pasta para `~/.vscode/extensions/hueco-mundo` e reinicie o VS Code. Depois, `Ctrl+K Ctrl+T` e escolha **Hueco Mundo**.

## Combina com

O **Hollowzinho**, um Hollow de estimação que mora no Explorer e acende a linha do editor com um Cero. É outra extensão, independente deste tema: [`vscode/pet`](https://github.com/juninmd/hueco-mundo-theme/tree/HEAD/vscode/pet).

Veja o projeto completo em [hueco-mundo-theme](https://github.com/juninmd/hueco-mundo-theme).

## Licença

MIT.
