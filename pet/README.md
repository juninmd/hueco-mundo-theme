# Hollowzinho

Um Hollow de estimação num **web component só**: um arquivo, nenhuma dependência, arte em SVG. Ele fica no canto da tela, olha para o cursor, aceita carinho, come, dorme, evolui e dispara um **Cero**.

É independente de tema, de framework e de qualquer outro projeto deste repositório. Dá para usar numa página, numa aplicação ou dentro de um editor (a extensão do VS Code, em [`../vscode/pet`](../vscode/pet), é só uma casca em volta dele).

![Animação das interações do Hollowzinho](../docs/shots/pet-demo.webp)

## Usar

```html
<script src="hollow-pet.js"></script>
<hollow-pet corner="br" lang="pt"></hollow-pet>
```

Sem escrever HTML: `HollowPet.mount({ corner: "bl", lang: "en" })`. Funciona por `<script src>` (inclusive em `file://`) e por `import "./hollow-pet.js"`. Uma página de demonstração, com todos os controles, está em [`demo.html`](demo.html).

## Como brincar

| Gesto | O que acontece |
| --- | --- |
| Passar o mouse | Abre a bandeja: carinho, alimentar, Cero, dormir e esconder |
| Clicar | Carinho: corações, vínculo +1 |
| Segurar e soltar | Carrega e dispara o Cero (quanto mais segurar, mais forte) |
| Arrastar | Muda de canto e encaixa |
| Teclado, com o pet focado | `Enter` carinho, `F` alimentar, `C` mirar o Cero, `S` dormir ou acordar, `Esc` fecha |

O reiatsu desce devagar e sobe com comida; o vínculo cresce com carinho. Com vínculo suficiente ele evolui: **Hollow**, **Adjuchas** (15) e **Vasto Lorde** (40).

## Atributos

| Atributo | Para que serve |
| --- | --- |
| `corner` | `br` (padrão), `bl`, `tr` ou `tl`. É só o ponto de partida: o canto escolhido pelo usuário vale mais |
| `size`, `margin` | Tamanho e margem em pixels. Sem `size`, ele se ajusta à janela (e encolhe em janelas baixas) |
| `name`, `lang`, `tint` | Nome, idioma dos balões (`pt` ou `en`) e cor das marcas (`reishi`, `ouro`; sem valor, vermelho) |
| `inline` | Fica onde está no texto, em vez de fixo na tela (sem arrastar nem Cero por segurar) |
| `static` | Sem vida própria: não pisca, não fala sozinho. Combinado com `inline`, é só uma ilustração |
| `no-persist`, `storage-key` | Não guarda no `localStorage`, ou guarda numa chave sua |
| `no-hello` | Não cumprimenta na primeira visita |
| `chatter` | Quanto fala sozinho: `off`, `low` ou `normal` |
| `sleep-after` | Segundos parado até dormir; `0` desliga |
| `shake` | Seletor de um elemento da página que treme quando o Cero dispara |

## Métodos

| Método | O que faz |
| --- | --- |
| `pet()` `feed()` `sleep()` `wake()` | As ações do dia a dia |
| `cero({ x, y, power, free, text })` | Dispara o Cero num ponto. Pontos fora da tela valem: o raio sai pela borda. Gasta reiatsu, a menos que `free` seja verdadeiro; `text` troca a fala |
| `aim()` | Abre a mira para o usuário escolher o alvo com um clique |
| `say(texto, ms)` | Fala no balão. `say("")` apaga |
| `dock(canto)` | Muda de canto |
| `hide()` `show()` `reset()` | Esconde (sobra um botão para chamar de volta), mostra e recomeça |
| `look(x, y, ms)` | Olha para um ponto, de `-1` a `1` em cada eixo, no lugar do cursor. `look(null)` volta ao normal |
| `mood(humor, texto)` | `happy`, `excited`, `worried`, `sad` ou `calm`. Com `texto`, fala; com `""`, fica calado |
| `celebrate(texto)` | Corações e um Cero para cima, que não gasta reiatsu |
| `nibble(n)` | Alimenta em silêncio com uma fração de reiatsu (por exemplo, um pouco por tecla digitada) |
| `pose(nome, { ms, text })` | Pose que dura: `scan` (uma lente sobre o olho, modo caçador), `paused` (parado, com o selo de pausa) ou `alert` (susto: pula e mostra um `!`; volta sozinho à pose anterior). `pose(null)` limpa |
| `bodyRect` | Leitura: o retângulo do corpo na janela, para mirar nele ou desviar dele |
| `getState()` `restore(estado)` | O que vale guardar, como JSON (veja abaixo) |
| `stats` | Leitura: `reiatsu`, `bond`, `corner`, `hidden`, `stage`, `mode` |

Os tipos estão em [`hollow-pet.d.ts`](hollow-pet.d.ts).

## Eventos

`hollow-pet:pet`, `:feed`, `:cero`, `:sleep`, `:wake`, `:levelup` e `:pose` saem do elemento (com bolha e atravessando o shadow DOM) e trazem `detail: { stage, bond, reiatsu }`.

```js
pet.addEventListener("hollow-pet:levelup", (e) => console.log("evoluiu para o estágio", e.detail.stage));
```

## Quem guarda o estado é você

Por padrão ele usa o `localStorage`. Se a sua aplicação tem outro lugar (um servidor, o `globalState` de uma extensão, um banco), desligue com `no-persist` e guarde o que o evento entrega:

```js
pet.addEventListener("hollow-pet:state", (e) => meuArmazenamento.salvar("hollowzinho", e.detail));
pet.restore(meuArmazenamento.ler("hollowzinho")); // devolve false se o formato não for reconhecido
```

`getState()` devolve `{ v: 1, reiatsu, bond, corner, hidden, seen, t }`. Ao restaurar, o reiatsu cai um pouco pelo tempo que o bicho ficou sozinho.

## Ligar o bichinho ao que acontece na sua aplicação

A API de humor existe para isso. Alguns exemplos:

```js
form.addEventListener("input", () => pet.nibble(0.2));            // digitar alimenta
form.addEventListener("submit", () => pet.celebrate("Enviado!")); // comemora
api.onError(() => pet.mood("worried", "Opa… deu erro."));          // se preocupa
job.onStart(() => pet.pose("scan"));                              // modo caçador enquanto algo roda
job.onPause(() => pet.pose("paused"));                            // parado, com o selo de pausa
job.onCrash(() => pet.pose("alert", { text: "Isso quebrou!" }));  // susto
editor.onCursor((x, y) => pet.look(x, y, 1500));                  // olha para onde você está
```

## Aparência

As cores seguem variáveis CSS, todas opcionais:

```css
hollow-pet {
  --hollow-panel: #0e0e11;       /* fundo do balão e da bandeja */
  --hollow-edge: #2c2c33;        /* bordas */
  --hollow-fg: #ede9e0;          /* texto */
  --hollow-muted: #a8a29e;       /* texto de apoio */
  --hollow-faint: #948e86;       /* dicas */
  --hollow-accent: #e11d48;      /* destaque */
  --hollow-accent-text: #f6506d; /* destaque em texto pequeno */
  --hollow-ok: #4ade80;          /* barra de reiatsu */
  --hollow-font: system-ui;      /* fonte dos balões */
  --hollow-z: 2147483000;        /* camada */
}
```

Em janelas baixas (o painel de um editor, por exemplo) o balão e a bandeja passam para o lado do bicho, em vez de ficarem em cima.

## Acessibilidade

O pet fixo é uma região nomeada; o bicho é um botão focável; o balão é uma região `status` que anuncia o que ele diz; ilustrações `inline static` ficam escondidas dos leitores de tela. Com `prefers-reduced-motion` o Cero vira um clarão curto, sem tremor. Com `forced-colors` ele usa as cores do sistema.

## React / TSX

```tsx
import "hueco-mundo-theme/pet";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "hollow-pet": React.HTMLAttributes<HTMLElement> & { corner?: string; lang?: string; name?: string; tint?: string; size?: number };
    }
  }
}

export const App = () => <hollow-pet corner="br" lang="pt" />;
```

## Licença

MIT, como o resto do repositório.
