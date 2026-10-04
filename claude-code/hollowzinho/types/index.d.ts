/** Como o bicho aparece: cada uma é uma expressão do rosto. */
export type HollowFace = 'idle' | 'blink' | 'happy' | 'worried' | 'sad' | 'sleep' | 'scan' | 'alert' | 'fire'

/** Humor passageiro; some sozinho quando `moodUntil` passa. */
export type HollowMood = 'calm' | 'happy' | 'worried' | 'sad'

/** Um comando de build ou teste que falhou e ainda não passou: vira um bichinho na cena. */
export type HollowBug = {
  /** Identifica a "família" do comando (`npm test`, `tsc`, `cargo build`). */
  id: string
  /** O que aparece na tela: a família do comando, curta. */
  label: string
  /** Quantas vezes falhou seguido. Com 3 ou mais ele vira um chefe dourado. */
  fails: number
  /** Levou um raspão de um Cero que não o matou: pisca por um instante. */
  hit?: boolean
}

/** O Cero em voo: um quadro por passo da animação. */
export type HollowCero = {
  /** O passo atual, de 0 ao fim da animação. */
  frame: number
  /** Quando o próximo passo é devido (ms desde 1970). */
  nextAt: number
  /** O bug mirado (o id dele); sem alvo, o raio vai até a borda. */
  target?: string
  /** A vaga do alvo na faixa (0 é a mais perto do pet): fica guardada porque o bug morre no meio do voo. */
  slot?: number
  /** O Cero abate o alvo no instante do acerto (é o caso de um comando que passou). */
  kill: boolean
}

/** Tudo o que a cena precisa para se desenhar; é o que o plugin guarda como estado da sessão. */
export type Hollow = {
  v: 1
  /** 0 a 100. Cai devagar; teclas, ferramentas e commits alimentam. */
  reiatsu: number
  /** Cresce com carinho, comida, commits e bugs abatidos. Com 15 vira Adjuchas e com 40, Vasto Lorde. */
  bond: number
  /** Quantos bugs já foram abatidos, desde sempre. */
  hunted: number
  mood: HollowMood
  moodUntil: number
  /** `scan` não é guardado aqui: sai de `working`. `alert` dura pouco; `sleep` dura até a próxima atividade. */
  pose: '' | 'alert' | 'sleep'
  poseUntil: number
  /** O que está no balão e até quando. */
  say: string
  sayUntil: number
  bugs: HollowBug[]
  cero: HollowCero | null
  hidden: boolean
  /** Um turno do Claude está rodando: o bicho entra no modo caçador. */
  working: boolean
  /** Os olhos fechados por um instante. */
  blink: boolean
  /** Quando foi o último sinal de vida (prompt, ferramenta, comando). */
  lastActive: number
  /** Até onde o tempo já foi contado (fome, sono, piscar). */
  lastTick: number
  /** Quando ele falou sozinho pela última vez e quando comemorou (para não ficar repetitivo). */
  lastChat: number
  lastCheer: number
  /** Quando o próximo piscar acontece. */
  blinkAt: number
  /** O que a sessão já fez: usado para comemorar o fim do turno só quando houve trabalho. */
  edits: number
  /** Já cumprimentou nesta sessão. */
  greeted: boolean
}

/** O que fica guardado entre sessões (`$.store`). */
export type HollowSaved = {
  v: 1
  reiatsu: number
  bond: number
  hunted: number
  hidden: boolean
  seen: boolean
  /** Quando foi guardado (ms desde 1970): o reiatsu cai pelo tempo que o bicho ficou sozinho. */
  t: number
}

declare module 'claude-code' {
  interface PluginState {
    hollowzinho: { pet: Hollow }
  }
}
