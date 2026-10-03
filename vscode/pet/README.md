# Hollowzinho para o VS Code

Um Hollow de estimação que mora na barra lateral do VS Code. Ele olha para onde você digita, come o reiatsu do seu código, se preocupa quando aparece um erro, comemora quando o teste passa, devora seus commits e, quando você pedir, dispara um **Cero** que acende a linha em que você está.

![O Hollowzinho no Explorer e o Cero acendendo uma linha do editor](https://github.com/juninmd/hueco-mundo-theme/raw/HEAD/vscode/pet/docs/cero.png)

Não precisa do tema Hueco Mundo (mas combina) e não depende de mais nada. O bichinho em si é o [`<hollow-pet>`](https://github.com/juninmd/hueco-mundo-theme/tree/HEAD/pet), um web component independente.

## O que ele faz

| Você faz | Ele faz |
| --- | --- |
| Digita | Come reiatsu a cada letra (sem digitar, ele fica com fome) e os olhos seguem o seu cursor |
| Salva | Fica feliz |
| Aparece um erro | Se preocupa. Quando os erros somem, respira aliviado |
| Uma tarefa ou um comando de build/teste termina | Passou: comemora com um Cero para cima. Falhou: fica chateado |
| Faz um commit | Come o commit (o vínculo cresce) |
| Pede um Cero | Dispara em direção ao editor e **a sua linha pisca em vermelho** por menos de um segundo |

Também dá para brincar com ele direto: passar o mouse abre a bandeja, clicar faz carinho, segurar carrega um Cero, arrastar muda de canto. Com vínculo ele evolui: Hollow, Adjuchas e Vasto Lorde. O reiatsu aparece na barra de status.

## Onde ele fica

Na visão **Hollowzinho**, no fim do Explorer. Ela abre sozinha na primeira vez. Como qualquer visão do VS Code, pode ser arrastada: coloque na **Barra Lateral Secundária** (`Ctrl+Alt+B`) para ele continuar à vista mesmo com o Explorer fechado, ou no Painel. Quanto mais espaço, maior o bichinho.

Ele só reage enquanto a visão está aberta e visível.

## Comandos

Todos na paleta de comandos (`Ctrl+Shift+P`), com o prefixo **Hollowzinho**:

| Comando | O que faz |
| --- | --- |
| `Hollowzinho: Pet` / `Feed` | Carinho e comida |
| `Hollowzinho: Cero at the current line` | Cero na linha do cursor (em cada cursor, se houver vários) |
| `Hollowzinho: Cero at the next error` | Vai até o próximo erro e dispara nele |
| `Hollowzinho: Sleep or wake up` | Dorme ou acorda |
| `Hollowzinho: Change corner` | Troca de canto |
| `Hollowzinho: Show` / `Start over` | Chama de volta, ou recomeça do zero |

Nenhum vem com atalho, para não brigar com os seus. Para ligar o Cero a uma tecla, em `keybindings.json`:

```json
{ "key": "ctrl+alt+c", "command": "hollowzinho.cero", "when": "editorTextFocus" }
```

## Configurações

| Configuração | Padrão | |
| --- | --- | --- |
| `hollowzinho.name` | `Hollowzinho` | O nome dele |
| `hollowzinho.tint` | `cero` | Cor das marcas: `cero`, `reishi` (verde) ou `ouro` |
| `hollowzinho.language` | `auto` | `pt` ou `en`; `auto` segue o idioma do VS Code |
| `hollowzinho.size` | `0` | Tamanho em pixels; `0` escolhe um que caiba na visão |
| `hollowzinho.scene` | `hueco-mundo` | A janelinha para o deserto atrás dele, ou `none` para pegar emprestado o seu tema |
| `hollowzinho.editorSide` | `auto` | De que lado fica o editor, para o Cero sair e o olhar ir para lá |
| `hollowzinho.chatter` | `low` | Quanto ele fala sozinho: `off`, `low` ou `normal` |
| `hollowzinho.sleepAfterMinutes` | `5` | Minutos sem digitar até dormir; `0` nunca |
| `hollowzinho.reactToEditing` | `true` | Digitar, olhar o cursor e salvar |
| `hollowzinho.reactToDiagnostics` | `true` | Erros que aparecem e somem |
| `hollowzinho.reactToTasks` | `true` | Tarefas e comandos de build/teste no terminal |
| `hollowzinho.reactToGit` | `true` | Commits |
| `hollowzinho.editorEffects` | `true` | A linha do editor piscar quando ele dispara o Cero |
| `hollowzinho.statusBar` | `true` | O reiatsu na barra de status |

A cor do brilho do Cero no editor é o tema de cor `hollowzinho.ceroCore`, que o seu tema pode sobrescrever.

## Privacidade e limites

- Ele **não lê o conteúdo do seu código**: só conta quantos caracteres você digitou e onde está o cursor. Nada sai da sua máquina, não há rede nem telemetria. O que ele guarda (reiatsu, vínculo, canto) fica no armazenamento global do VS Code.
- O Cero **nunca altera o texto**: a linha acende por decoração e a decoração some sozinha. Com `workbench.reduceMotion` ligado, é um único clarão, sem animação.
- No terminal, ele só reage a comandos que parecem de build ou teste (`test`, `build`, `tsc`, `cargo`, `make`, `pytest`…), e para isso o VS Code precisa estar com a *shell integration* ativa (versão 1.93 ou mais nova). Tarefas (`tasks.json`) sempre valem.
- Commits feitos no terminal também contam: ele percebe o commit novo na mesma branch.
- Funciona em espaços de trabalho não confiáveis e virtuais.

## In English

A pet Hollow (from Bleach) that lives in the VS Code side bar. Its eyes follow your cursor, typing feeds it, errors worry it, passing tests make it celebrate, commits are food, and on command it fires a **Cero** that flashes the line you are on. It reads no code (only counts typed characters and cursor position), needs no network, and never edits your text. Language follows VS Code (`hollowzinho.language`); see the settings above.

## Licença

MIT.
