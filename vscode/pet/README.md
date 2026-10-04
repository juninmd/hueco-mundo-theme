# Hollowzinho para o VS Code

Um Hollow de estimação que mora no VS Code. Ele olha para onde você digita, **transforma cada erro num bugzinho e abate com um Cero quando você corrige**, acompanha a depuração (caça, pausa, susto na exceção), comemora o teste que passa e devora os seus commits.

![O Hollowzinho no Explorer com três bugs ao lado dele, um para cada erro do arquivo aberto](https://github.com/juninmd/hueco-mundo-theme/raw/HEAD/vscode/pet/docs/bugs.png)

Não precisa do tema Hueco Mundo (mas combina) e não depende de mais nada. O bichinho em si é o [`<hollow-pet>`](https://github.com/juninmd/hueco-mundo-theme/tree/HEAD/pet), um web component independente.

## O Cero acerta os bugs?

Acerta, e a mira é real: cada **erro** que o VS Code lista em *Problemas* vira um bugzinho na visão do pet (até 6, e o número total aparece num selo). O Cero sai do bicho e acende a linha do erro com a palavra `BUG`.

![Sessão no VS Code: três bugs caem na visão, um Quick Fix mira num deles e cada correção vira um Cero que abate o bug](https://github.com/juninmd/hueco-mundo-theme/raw/HEAD/vscode/pet/docs/bugs.webp)

| Quando | O que acontece |
| --- | --- |
| Aparecem erros | Os bugs caem na visão e ele avisa: *"Opa… apareceram 3 bugs."* |
| **Você corrige** um erro | Ele atira no bug dele, que explode: *"Bug abatido!"*. Sem mais erros: *"Sem bugs! Respirei."* |
| Você **clica num bug** | O editor vai até o erro (abre o arquivo e põe o cursor lá) e o Cero acende a linha |
| **Quick Fix** (`Ctrl+.`) num erro | Aparece *Hollowzinho: Cero neste erro*; ele atira nesse erro sem mexer no seu cursor |
| `Hollowzinho: Cero at the next error` | Vai ao próximo erro (começando pelo arquivo aberto) e atira nele |
| `hollowzinho.autoCero` = `newErrors` | Atira sozinho em cada erro novo (padrão: só em exceções do depurador) |

![O Quick Fix com a opção Hollowzinho: Cero neste erro, e os três bugs ao lado do pet](https://github.com/juninmd/hueco-mundo-theme/raw/HEAD/vscode/pet/docs/quickfix.png)

**O que o Cero não faz:** ele não conserta nada. O raio só *raspa* o bug e acende a linha (é uma decoração que some em menos de um segundo e nunca altera o texto). Quem some com o erro é você; o bicho só abate o bug quando o erro realmente desaparece.

![O Cero atravessando a visão para abater um bug, no instante em que um erro é corrigido](https://github.com/juninmd/hueco-mundo-theme/raw/HEAD/vscode/pet/docs/bug-cero.png)

## Depuração

Ele acompanha a sessão pelo que o protocolo de depuração já anuncia, em qualquer linguagem e depurador:

| No depurador | No pet |
| --- | --- |
| A sessão começa | **Modo caçador**: uma lente sobre o olho e um varrer de luz no deserto |
| Você põe um breakpoint | Fica empolgado |
| Para num breakpoint | Fica parado, com o **selo de pausa**, e olha para o código |
| Você dá um passo | Acompanha com o olhar e continua parado na linha seguinte |
| Para numa **exceção** | **Susto** (pula e mostra um `!`), um **bug dourado** aparece na visão e o Cero acerta a linha onde ela parou |
| Retoma (`F5`) | Volta ao modo caçador, e o bug dourado vai embora |
| A sessão termina | Saída `0`: comemora. Saída com erro: fica chateado. Se havia uma exceção parada, ele a abate: *"Bug abatido!"* |

![Depuração: o pet em modo caçador, o breakpoint, o susto na exceção com o bug dourado e o Cero que o abate](https://github.com/juninmd/hueco-mundo-theme/raw/HEAD/vscode/pet/docs/debug.webp)

| Pausa | Exceção | Cero na exceção |
| --- | --- | --- |
| ![Parado no breakpoint, com o selo de pausa](https://github.com/juninmd/hueco-mundo-theme/raw/HEAD/vscode/pet/docs/debug-pausa.png) | ![Susto e o bug dourado](https://github.com/juninmd/hueco-mundo-theme/raw/HEAD/vscode/pet/docs/debug-excecao.png) | ![O Cero acerta o bug dourado](https://github.com/juninmd/hueco-mundo-theme/raw/HEAD/vscode/pet/docs/debug-cero.png) |

> **Dica:** ao depurar, o VS Code troca a barra lateral para *Executar e Depurar*, e o Explorer (com o pet) some. Por isso o Hollowzinho tem uma segunda visão lá, que abre sozinha na primeira depuração. O lugar mais confortável é a **Barra Lateral Secundária** (`Ctrl+Alt+B`): arraste a visão **Hollowzinho** para lá e ele fica à vista o tempo todo.

## E o resto?

| Você faz | Ele faz |
| --- | --- |
| Digita | Come reiatsu a cada letra (sem digitar, ele fica com fome) e os olhos seguem o seu cursor |
| Salva com `Ctrl+S` | Fica feliz (o salvamento automático não conta, ou ele viveria em festa) |
| Só há avisos (*warnings*) | Fica atento, sem se alarmar |
| Uma tarefa ou um comando de build/teste termina | Passou: comemora com um Cero para cima. Falhou: fica chateado |
| Faz um commit | Come o commit (o vínculo cresce) |
| Faz um push | Festa |
| Cria ou troca de branch | Vai passear |
| Cria um arquivo, ou apaga | Fica empolgado (*"Arquivo novo! Nham."*) ou chateado (*"Tchau, arquivo…"*) |
| Volta à janela depois de mais de 10 minutos | Acorda e te recebe |
| `Hollowzinho: Cero at the current line` | Dispara, e a sua linha pisca em vermelho com `CERO` |

![O Cero acendendo uma linha do editor](https://github.com/juninmd/hueco-mundo-theme/raw/HEAD/vscode/pet/docs/cero.png)

Também dá para brincar com ele direto: passar o mouse abre a bandeja, clicar faz carinho, segurar carrega um Cero, arrastar muda de canto. Com vínculo ele evolui: Hollow, Adjuchas e Vasto Lorde. O reiatsu aparece na barra de status e, passando o mouse sobre ela, quantos bugs ele já abateu.

## Onde ele fica

Na visão **Hollowzinho**, no fim do Explorer. Ela abre sozinha na primeira vez. Como qualquer visão do VS Code, pode ser arrastada: a **Barra Lateral Secundária** (`Ctrl+Alt+B`) é a melhor casa, porque continua à vista com o Explorer fechado e durante a depuração. Em visões baixas o balão e a bandeja ficam ao lado dele; com mais altura, ficam em cima.

Ele só reage enquanto uma das visões está aberta e visível. Sem o pet à vista, o comando de Cero ainda acende a linha, e uma exceção no depurador deixa uma pista na barra de status.

## Comandos

Todos na paleta de comandos (`Ctrl+Shift+P`), com o prefixo **Hollowzinho**:

| Comando | O que faz |
| --- | --- |
| `Hollowzinho: Pet` / `Feed` | Carinho e comida |
| `Hollowzinho: Cero at the current line` | Cero na linha do cursor (em cada cursor, se houver vários) |
| `Hollowzinho: Cero at the next error` | Vai até o próximo erro e atira nele |
| `Hollowzinho: Sleep or wake up` | Dorme ou acorda |
| `Hollowzinho: Change corner` | Troca de canto |
| `Hollowzinho: Show` / `Start over` | Chama de volta, ou recomeça do zero |

Nenhum vem com atalho, para não brigar com os seus. Para ligar o Cero a uma tecla, em `keybindings.json`:

```json
{ "key": "ctrl+alt+c", "command": "hollowzinho.ceroError" }
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
| `hollowzinho.bugs` | `true` | Um bugzinho na visão para cada erro (até 6). Desligado, ficam só as reações |
| `hollowzinho.autoCero` | `exceptions` | Quando ele atira sozinho: `off`, `exceptions` (exceção parada no depurador) ou `newErrors` (também em cada erro novo) |
| `hollowzinho.quickFix` | `true` | A opção *Hollowzinho: Cero neste erro* no menu de correção rápida |
| `hollowzinho.reactToEditing` | `true` | Digitar, olhar o cursor e salvar com `Ctrl+S` |
| `hollowzinho.reactToDiagnostics` | `true` | Erros que aparecem e somem (e os bugs) |
| `hollowzinho.reactToDebug` | `true` | A depuração: caça, pausa, passos, exceções |
| `hollowzinho.reactToTasks` | `true` | Tarefas e comandos de build/teste no terminal |
| `hollowzinho.reactToGit` | `true` | Commit, push e branch |
| `hollowzinho.reactToWorkspace` | `true` | Arquivos criados ou apagados e a volta à janela |
| `hollowzinho.editorEffects` | `true` | A linha do editor piscar quando ele atira |
| `hollowzinho.statusBar` | `true` | O reiatsu na barra de status |

A cor do brilho do Cero no editor é o tema de cor `hollowzinho.ceroCore`, que o seu tema pode sobrescrever.

## Privacidade e limites

- Ele **não lê o conteúdo do seu código**. Nos editores, só conta quantos caracteres você digitou e onde está o cursor. Os erros são lidos da lista de *Problemas* (mensagem, arquivo e linha) dentro da extensão, só para reconhecer cada um e acertar a linha; para o desenho vai apenas um identificador. Na depuração, só lê o que o protocolo já anuncia: parou, retomou, saiu (com o código de saída) e, numa exceção, o arquivo e a linha do topo da pilha. Nunca variáveis, valores nem texto de código.
- Nada sai da sua máquina, não há rede nem telemetria. O que ele guarda (reiatsu, vínculo, canto, quantos bugs abateu) fica no armazenamento global do VS Code.
- O Cero **nunca altera o texto**: a linha acende por decoração, que some sozinha. Com `workbench.reduceMotion` ligado, é um único clarão, sem animação.
- No terminal, ele só reage a comandos que parecem de build ou teste (`test`, `build`, `tsc`, `cargo`, `make`, `pytest`…), e para isso o VS Code precisa estar com a *shell integration* ativa (1.93 ou mais nova). Tarefas (`tasks.json`) sempre valem. O painel **Testes** do VS Code não expõe os resultados a outras extensões: por ele só vale o que passar por uma sessão de depuração, uma tarefa ou o terminal.
- Commits feitos no terminal também contam: ele percebe o commit novo na mesma branch.
- Só erros viram bugs; avisos (*warnings*) não. Os bugs seguem os *Problemas* do VS Code: se o seu servidor de linguagem não reporta, não há bug.
- Funciona em espaços de trabalho não confiáveis e virtuais.

## In English

A pet Hollow (from Bleach) that lives in VS Code. Every **error** in the Problems list becomes a little bug beside it, and when you fix the error the pet **shoots it down with a Cero** (it flashes the line with `BUG`; click a bug, use the Quick Fix *Hollowzinho: Cero at this error*, or run *Cero at the next error* to aim at one). It follows **debugging** (hunter mode while a session runs, a pause seal at breakpoints, a scare and a golden boss bug on an exception, with an automatic Cero on the line), celebrates passing builds, eats commits and reacts to pushes, new branches and files. It reads no code, needs no network and never edits your text. Language follows VS Code (`hollowzinho.language`); see the settings above. Tip: debugging swaps the side bar to *Run and Debug*, so a second Hollowzinho view lives there; the Secondary Side Bar (`Ctrl+Alt+B`) keeps it in sight all the time.

## Licença

MIT.
