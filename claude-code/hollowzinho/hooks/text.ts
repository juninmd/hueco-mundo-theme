// As falas do Hollowzinho no Claude Code, em português e em inglês.
// A voz é a mesma do pet da página e da extensão do VS Code; aqui as falas falam de ferramentas, turnos e bugs.

export type Lang = 'pt' | 'en'

export type Words = {
  stages: readonly [string, string, string]
  hello: readonly string[]
  back: readonly string[]
  idle: readonly string[]
  hungry: readonly string[]
  prompt: readonly string[]
  hunt: readonly string[]
  bugNew: (label: string) => string
  bugAgain: (label: string, fails: number) => string
  bugBoss: (label: string) => string
  bugKill: readonly string[]
  bossKill: readonly string[]
  bugsClear: string
  bugHit: readonly string[]
  passed: readonly string[]
  edit: readonly string[]
  commit: readonly string[]
  push: readonly string[]
  pr: readonly string[]
  branch: readonly string[]
  turnDone: readonly string[]
  turnBugs: (n: number) => string
  aborted: readonly string[]
  failed: readonly string[]
  toolFail: readonly string[]
  sleep: string
  wake: readonly string[]
  cero: readonly string[]
  weak: string
  pet: readonly string[]
  feed: readonly string[]
  full: string
  levelup: { 2: string; 3: string }
  reset: string
  hidden: string
  shown: string
  ui: {
    pane: string
    pet: string
    feed: string
    cero: string
    sleep: string
    wake: string
    hide: string
    reiatsu: string
    bond: string
    hunted: string
    bugs: string
    noBugs: string
    times: (n: number) => string
    paneHint: string
    status: (name: string, stage: string, reiatsu: number, bond: number, bugs: number, hunted: number) => string
    help: string
    unknown: (arg: string) => string
    paneOpened: string
    paneNarrow: string
  }
}

const pt: Words = {
  stages: ['Hollow', 'Adjuchas', 'Vasto Lorde'],
  hello: ['Cheguei! Tô de olho no seu código.', 'Oi! Posso ficar aqui em cima?'],
  back: ['Voltou! Senti sua falta.', 'Bem-vindo de volta.', 'Hã? Tô acordado!'],
  idle: [
    'Tá quieto demais por aqui…',
    'Sinto um reiatsu gostoso.',
    'Cero carregado. É só falar.',
    'Hueco Mundo é lar, mas aqui tá melhor.',
    'Me dá um carinho? /hollowzinho pet',
    'Shhh… tô vigiando os testes.',
    'Já viu a lua hoje?',
  ],
  hungry: ['Meu buraco tá vazio…', 'Fome de reiatsu…', 'Alguém me alimenta? /hollowzinho feed'],
  prompt: ['Hmm, deixa eu ver…', 'Anotado.', 'Bora!', 'Tô de olho.'],
  hunt: ['Caçando…', 'Farejando bug…', 'Modo caçador.', 'Atento à saída dos comandos.'],
  bugNew: (l) => `Opa… falhou: ${l}.`,
  bugAgain: (l, n) => `${l} de novo (×${n}).`,
  bugBoss: (l) => `${l} virou um chefe!`,
  bugKill: ['Bug abatido!', 'Boom, um a menos.', 'Esse não volta.'],
  bossKill: ['O chefe caiu!', 'Chefe abatido!', 'Mandou bem. Esse era osso duro.'],
  bugsClear: 'Sem bugs! Respirei.',
  bugHit: ['Acertei! Mas ele ainda respira.', 'Pegou de raspão. Conserta esse!', 'Ainda tá vivo. Bora corrigir?'],
  passed: ['Passou!', 'Tudo verde.', 'Cero comemorativo!'],
  edit: ['Nham, código fresco.', 'Delícia de diff.', 'Mais um arquivo no bucho.'],
  commit: ['Nham, um commit!', 'Commit fresquinho.', 'Isso alimenta.'],
  push: ['Enviado!', 'Lá vai ele!', 'No ar!'],
  pr: ['PR aberto! Que orgulho.', 'Pull request no ar.'],
  branch: ['Outra branch! Que passeio.', 'Território novo.'],
  turnDone: ['Pronto!', 'Mandou bem!', 'Acabou? Já?'],
  turnBugs: (n) => (n === 1 ? 'Ainda tem 1 bug vivo…' : `Ainda tem ${n} bugs vivos…`),
  aborted: ['Ué, interrompeu?', 'Parei.', 'Tá bom, tá bom.'],
  failed: ['Deu ruim lá fora.', 'Hmm, isso não parece bom.', 'Poxa…'],
  toolFail: ['Opa…', 'Hmm.', 'Deu erro, mas segue.'],
  sleep: 'Zzz…',
  wake: ['Hã? Tô acordado!', 'Quem chamou?'],
  cero: ['CERO!', 'Alvo na mira.', 'Boom.'],
  weak: 'Sem reiatsu pra isso… me alimenta?',
  pet: ['Hehe!', 'Mais um pouquinho!', 'Bem na máscara.', 'Isso, aí mesmo.', 'Gostei!'],
  feed: ['Nham! Reiatsu fresquinho.', 'Delícia!', 'Meu buraco tá feliz.', 'Mais, por favor!'],
  full: 'Tô cheio de reiatsu!',
  levelup: { 2: 'Evoluí! Agora sou um Adjuchas!', 3: 'Vasto Lorde! Cuidado com o Cero.' },
  reset: 'Voltei a ser um Hollow novinho.',
  hidden: 'Escondido. /hollowzinho show chama de volta.',
  shown: 'Voltei!',
  ui: {
    pane: 'Hollowzinho',
    pet: 'Carinho',
    feed: 'Alimentar',
    cero: 'Cero',
    sleep: 'Dormir',
    wake: 'Acordar',
    hide: 'Esconder',
    reiatsu: 'reiatsu',
    bond: 'vínculo',
    hunted: 'abatidos',
    bugs: 'Bugs vivos',
    noBugs: 'Nenhum bug vivo. Respirando fundo.',
    times: (n) => (n > 1 ? `×${n}` : ''),
    paneHint: 'Um bug nasce quando um comando de build ou teste falha e morre quando o mesmo comando passa.',
    status: (name, stage, r, b, bugs, h) => `${name} · ${stage} · reiatsu ${r} · vínculo ${b} · bugs vivos ${bugs} · abatidos ${h}`,
    help: 'Uso: /hollowzinho [pet | feed | cero | sleep | wake | hide | show | status | reset | pane]',
    unknown: (a) => `Não entendi "${a}". /hollowzinho help lista os comandos.`,
    paneOpened: 'Painel do Hollowzinho aberto.',
    paneNarrow: 'Hollowzinho: alargue o terminal para ver o painel.',
  },
}

const en: Words = {
  stages: ['Hollow', 'Adjuchas', 'Vasto Lorde'],
  hello: ["I'm here! Watching your code.", 'Hi! Can I stay up here?'],
  back: ['You came back! Missed you.', 'Welcome back.', "Huh? I'm awake!"],
  idle: [
    'Too quiet in here…',
    'Nice reiatsu today.',
    'Cero charged. Just say the word.',
    'Hueco Mundo is home, but this is nicer.',
    'Pet me? /hollowzinho pet',
    'Shh… watching the tests.',
    'Seen the moon today?',
  ],
  hungry: ['My hole is empty…', 'Hungry for reiatsu…', 'Anyone feeding me? /hollowzinho feed'],
  prompt: ['Hmm, let me see…', 'Noted.', "Let's go!", 'Watching.'],
  hunt: ['Hunting…', 'Sniffing for bugs…', 'Hunter mode.', 'Eyes on the command output.'],
  bugNew: (l) => `Oops… failed: ${l}.`,
  bugAgain: (l, n) => `${l} again (×${n}).`,
  bugBoss: (l) => `${l} became a boss!`,
  bugKill: ['Bug down!', 'Boom, one less.', "That one won't be back."],
  bossKill: ['The boss fell!', 'Boss down!', 'Well done. That one was tough.'],
  bugsClear: 'No bugs! Phew.',
  bugHit: ["Got it! But it's still breathing.", 'Only grazed it. Fix that one!', 'Still alive. Shall we fix it?'],
  passed: ['Passed!', 'All green.', 'Victory Cero!'],
  edit: ['Yum, fresh code.', 'Tasty diff.', 'One more file in the belly.'],
  commit: ['Yum, a commit!', 'Fresh commit.', 'That feeds me.'],
  push: ['Sent!', 'Off it goes!', 'Live!'],
  pr: ['PR opened! So proud.', 'Pull request is up.'],
  branch: ['Another branch! What a walk.', 'New territory.'],
  turnDone: ['Done!', 'Well done!', 'Already?'],
  turnBugs: (n) => (n === 1 ? 'There is still 1 live bug…' : `There are still ${n} live bugs…`),
  aborted: ['Huh, interrupted?', 'Stopped.', 'Okay, okay.'],
  failed: ['That went wrong out there.', "Hmm, that doesn't look good.", 'Aw…'],
  toolFail: ['Oops…', 'Hmm.', 'Error, but moving on.'],
  sleep: 'Zzz…',
  wake: ["Huh? I'm awake!", 'Who called?'],
  cero: ['CERO!', 'Target locked.', 'Boom.'],
  weak: 'Not enough reiatsu… feed me?',
  pet: ['Hehe!', 'A little more!', 'Right on the mask.', 'Yes, there.', 'Like that!'],
  feed: ['Yum! Fresh reiatsu.', 'Delicious!', 'My hole is happy.', 'More, please!'],
  full: "I'm full of reiatsu!",
  levelup: { 2: 'I evolved! I am an Adjuchas now!', 3: 'Vasto Lorde! Mind the Cero.' },
  reset: "I'm a brand new Hollow again.",
  hidden: 'Hidden. /hollowzinho show calls it back.',
  shown: "I'm back!",
  ui: {
    pane: 'Hollowzinho',
    pet: 'Pet',
    feed: 'Feed',
    cero: 'Cero',
    sleep: 'Sleep',
    wake: 'Wake',
    hide: 'Hide',
    reiatsu: 'reiatsu',
    bond: 'bond',
    hunted: 'hunted',
    bugs: 'Live bugs',
    noBugs: 'No live bugs. Breathing easy.',
    times: (n) => (n > 1 ? `×${n}` : ''),
    paneHint: 'A bug is born when a build or test command fails and dies when the same command passes.',
    status: (name, stage, r, b, bugs, h) => `${name} · ${stage} · reiatsu ${r} · bond ${b} · live bugs ${bugs} · hunted ${h}`,
    help: 'Usage: /hollowzinho [pet | feed | cero | sleep | wake | hide | show | status | reset | pane]',
    unknown: (a) => `I did not get "${a}". /hollowzinho help lists the commands.`,
    paneOpened: 'Hollowzinho pane opened.',
    paneNarrow: 'Hollowzinho: widen the terminal to see the pane.',
  },
}

export const WORDS: Readonly<Record<Lang, Words>> = { pt, en }

/** `auto` segue o idioma do sistema (`LC_ALL`, `LC_MESSAGES` ou `LANG`): português para `pt*`, inglês no resto. */
export function pickLang(setting: unknown, env: string | undefined): Lang {
  if (setting === 'pt' || setting === 'en') return setting
  return (env || '').toLowerCase().startsWith('pt') ? 'pt' : 'en'
}

/** Escolhe um item da lista com o sorteador dado (um número em [0, 1)). */
export function choose<T>(list: readonly T[], roll: number): T {
  const i = Math.min(list.length - 1, Math.floor(roll * list.length))
  return list[Math.max(0, i)] as T
}
