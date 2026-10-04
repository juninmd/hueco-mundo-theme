// A vida do Hollowzinho no Claude Code, sem nenhuma dependência do motor: funções puras que recebem o estado, o
// instante e as regras e devolvem o estado novo (ou o mesmo objeto, quando nada mudou).
// Quem liga isso ao Claude Code é o register.tsx; quem desenha é o view.tsx.

import type { Hollow, HollowBug, HollowFace, HollowSaved } from '../types'
import { WORDS, choose, pickLang, type Lang } from './text'

export type Chatter = 'off' | 'low' | 'normal'

export type Rules = {
  lang: Lang
  chatter: Chatter
  /** Parado por este tempo, ele dorme. 0 nunca dorme. */
  sleepAfterMs: number
  /** Um número em [0, 1): trocar por um fixo deixa os testes previsíveis. */
  roll: () => number
}

export const MAX_BUGS = 8
/** Até quantos bugs a cena desenha (os outros só contam). */
export const MAX_VISIBLE_BUGS = 6
export const CERO_STEP_MS = 90
export const CERO_FRAMES = 9
/** O quadro em que o raio acerta o alvo. */
export const CERO_HIT = 4
export const CERO_COST = 12
export const BOSS_FAILS = 3
const SAY_MS = 3600
const BLINK_MS = 170
const DECAY_EVERY_MS = 30_000
const CHEER_GAP_MS = 4_000

/** Lê as opções do plugin (`userConfig`) sem confiar nos tipos que chegam. */
export function rulesOf(options: Readonly<Record<string, unknown>>, env: string | undefined, roll: () => number = Math.random): Rules {
  const chatter = options.chatter === 'off' || options.chatter === 'normal' ? options.chatter : 'low'
  const minutes = typeof options.sleepAfterMinutes === 'number' && options.sleepAfterMinutes >= 0 ? options.sleepAfterMinutes : 5
  return { lang: pickLang(options.language, env), chatter, sleepAfterMs: Math.round(minutes * 60_000), roll }
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

export const stageOf = (bond: number): 1 | 2 | 3 => (bond >= 40 ? 3 : bond >= 15 ? 2 : 1)
export const stageName = (bond: number, lang: Lang): string => WORDS[lang].stages[stageOf(bond) - 1] ?? ''

/** O bicho recém-nascido. Com `now` = 0 é o valor inicial do estado, antes de o motor dizer que horas são. */
export function seed(now: number): Hollow {
  return {
    v: 1,
    reiatsu: 80,
    bond: 0,
    hunted: 0,
    mood: 'calm',
    moodUntil: 0,
    pose: '',
    poseUntil: 0,
    say: '',
    sayUntil: 0,
    bugs: [],
    cero: null,
    hidden: false,
    working: false,
    blink: false,
    lastActive: now,
    lastTick: now,
    lastChat: now,
    lastCheer: 0,
    blinkAt: now + 4000,
    edits: 0,
    greeted: false,
  }
}

/* ───────────────────────── guardar e restaurar ───────────────────────── */

export function save(p: Hollow, now: number): HollowSaved {
  return { v: 1, reiatsu: Math.round(p.reiatsu), bond: p.bond, hunted: p.hunted, hidden: p.hidden, seen: p.greeted, t: now }
}

/** Valida o que veio do disco: formato desconhecido vira `null`, e o reiatsu cai pelo tempo que o bicho ficou sozinho. */
export function restore(raw: unknown, now: number): HollowSaved | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (r.v !== 1) return null
  const num = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d)
  const t = num(r.t, now)
  const away = Math.max(0, (now - t) / 60_000)
  return {
    v: 1,
    reiatsu: clamp(num(r.reiatsu, 80) - Math.min(30, away / 8), 5, 100),
    bond: Math.max(0, Math.floor(num(r.bond, 0))),
    hunted: Math.max(0, Math.floor(num(r.hunted, 0))),
    hidden: r.hidden === true,
    seen: r.seen === true,
    t,
  }
}

/* ───────────────────────── pequenos efeitos ───────────────────────── */

const speak = (p: Hollow, now: number, text: string, ms = SAY_MS): Hollow => ({ ...p, say: text, sayUntil: now + ms })
const feel = (p: Hollow, now: number, mood: Hollow['mood'], ms: number): Hollow => ({ ...p, mood, moodUntil: now + ms })
const wakeUp = (p: Hollow, now: number): Hollow => ({ ...p, pose: p.pose === 'sleep' ? '' : p.pose, lastActive: now })
const eat = (p: Hollow, amount: number): Hollow => ({ ...p, reiatsu: clamp(p.reiatsu + amount, 0, 100) })

/** Soma vínculo e anuncia a evolução quando passa de estágio. */
function grow(p: Hollow, now: number, by: number, rules: Rules): Hollow {
  const before = stageOf(p.bond)
  const q = { ...p, bond: p.bond + by }
  const after = stageOf(q.bond)
  if (after > before) return feel(speak(q, now, WORDS[rules.lang].levelup[after === 3 ? 3 : 2], 4200), now, 'happy', 3000)
  return q
}

const pick = (list: readonly string[], rules: Rules): string => choose(list, rules.roll())

/** Comemora sem repetir: no máximo uma vez a cada poucos segundos. */
function cheer(p: Hollow, now: number, text: string, rules: Rules): Hollow {
  if (now - p.lastCheer < CHEER_GAP_MS) return p
  return { ...feel(speak(p, now, text), now, 'happy', 2200), lastCheer: now }
}

/* ───────────────────────── comandos de build e teste ───────────────────────── */

// Só o que parece build, teste ou verificação vira bug: um `grep` sem resultado também sai com erro e não é problema.
const BUILD_RE =
  /\b(test|tests|jest|vitest|mocha|pytest|tox|rspec|phpunit|build|compile|tsc|webpack|rollup|esbuild|make|cmake|gradle|gradlew|mvn|cargo|go\s+(?:test|build|vet)|dotnet\s+(?:test|build)|lint|eslint|ruff|mypy|ctest|bazel|typecheck|type-check)\b/i
const NOT_BUILD = new Set(['git', 'gh', 'echo', 'cat', 'grep', 'rg', 'ls', 'cd', 'sed', 'awk', 'head', 'tail', 'curl', 'wget', 'mkdir', 'rm', 'cp', 'mv', 'touch', 'which', 'find', 'printf', 'pwd', 'export', 'source', 'sleep', 'kill', 'tmux', 'ps', 'open', 'code', 'less', 'tree', 'diff'])
const RUNNERS = new Set(['npm', 'pnpm', 'yarn', 'bun', 'npx', 'pnpx', 'bunx', 'cargo', 'go', 'dotnet', 'make', 'gradle', 'gradlew', 'mvn', 'poetry', 'uv', 'python', 'python3', 'node', 'deno', 'rake', 'bundle', 'composer', 'php', 'swift', 'flutter', 'dart', 'mix', 'sbt', 'tox', 'nox', 'ctest', 'bazel'])

/** Tira o que está entre aspas, para que `git commit -m "add test"` não pareça um teste. */
const unquote = (s: string): string => s.replace(/"(?:[^"\\]|\\.)*"|'[^']*'|`[^`]*`/g, '""')

/** Primeiro pedaço do comando que parece build ou teste, sem prefixos de ambiente. `null` se nenhum parece. */
export function buildPart(command: string): string | null {
  const bare = unquote(command)
  for (const raw of bare.split(/&&|\|\||;|\||\n/)) {
    const seg = raw
      .trim()
      .replace(/^(?:cd\s+\S+\s*)+/, '')
      .replace(/^(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)+/, '')
      .replace(/^(?:time|nice|sudo|exec)\s+/, '')
      .trim()
    if (!seg) continue
    const first = (seg.split(/\s+/)[0] ?? '').replace(/^.*\//, '')
    if (NOT_BUILD.has(first)) continue
    if (BUILD_RE.test(seg)) return seg
  }
  return null
}

/** A "família" do comando: `npm test -- a.test.ts` e `npm test` são o mesmo bug. */
export function family(segment: string): string {
  const words = segment.split(/\s+/).filter(Boolean)
  const first = (words[0] ?? '').replace(/^.*\//, '')
  const second = words[1] ?? ''
  const third = words[2] ?? ''
  if (!RUNNERS.has(first) || !/^[a-z][\w:.-]*$/i.test(second)) return first.slice(0, 40)
  if (/^(?:npm|pnpm|yarn|bun)$/.test(first) && second === 'run' && /^[a-z][\w:.-]*$/i.test(third)) return `${first} run ${third}`.slice(0, 40)
  return `${first} ${second}`.slice(0, 40)
}

/* ───────────────────────── o código de saída escondido ───────────────────────── */

// O modelo costuma escrever `npm test 2>&1 | tail -30`: o `tail` sai com 0 e o teste que falhou passa como se nada tivesse
// acontecido. Quando o comando esconde o código de saída (um pipe, um `|| true`), a saída é a única pista.
const FAIL_MARKS: readonly RegExp[] = [
  /^\s*(?:---\s+)?(?:FAIL|FAILED|FAILURES|ERROR)\b/m,
  /^\s*not ok\b|^# fail [1-9]/m,
  /\b[1-9]\d*\s+(?:failed|failing|failures?|errors?)\b/i,
  /\bnpm ERR!|\berror\s+TS\d+\s*:|\berror\[E\d+\]\s*:|\berror:\s+(?:could not compile|aborting)/i,
  /^Traceback \(most recent call last\)|\bAssertionError\b|\bpanicked at\b|\bBUILD (?:FAILURE|FAILED)\b|^make: \*\*\*/m,
  /[✗✖]/,
]

/** O comando esconde o código de saída do que roda (um pipe, `|| true`)? */
export function masksExit(command: string): boolean {
  const bare = unquote(command)
  if (/\|\|\s*(?:true|:|exit\s+0)\b/.test(bare)) return true
  return bare.replace(/\|\|/g, ' ').includes('|')
}

/** A saída de um build ou teste diz que ele falhou? */
export function readsFailed(output: string): boolean {
  return FAIL_MARKS.some((re) => re.test(output))
}

/* ───────────────────────── o que o Claude Code conta ───────────────────────── */

export type ToolInfo = {
  tool: string
  /** A ferramenta terminou sem erro. */
  ok: boolean
  /** O comando do Bash, quando é ele. */
  command?: string
  /** O final do que o Bash escreveu (stdout e stderr). Só serve quando o comando esconde o código de saída. */
  output?: string
  /** O que o Bash diz ter feito com o git (`gitOperation` do resultado), mais a criação de branch, que ele não anuncia. */
  git?: { commit?: boolean; push?: boolean; pr?: boolean; branch?: boolean }
}

const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])

/** Um comando de build ou teste terminou. */
function onBuild(p: Hollow, now: number, segment: string, ok: boolean, rules: Rules): Hollow {
  const w = WORDS[rules.lang]
  const id = family(segment)
  const known = p.bugs.find((b) => b.id === id)
  if (ok) {
    if (known) {
      const done = finishCero(p, now, rules)
      const slot = done.bugs.findIndex((b) => b.id === id)
      return { ...done, cero: { frame: 0, nextAt: now + CERO_STEP_MS, target: id, slot: Math.max(0, slot), kill: true }, mood: 'calm', moodUntil: 0 }
    }
    return cheer(eat(p, 0.4), now, pick(w.passed, rules), rules)
  }
  if (known) {
    const fails = known.fails + 1
    const bugs = p.bugs.map((b) => (b.id === id ? { ...b, fails, hit: false } : b))
    const line = fails === BOSS_FAILS ? w.bugBoss(known.label) : w.bugAgain(known.label, fails)
    return feel(speak({ ...p, bugs }, now, line, 4200), now, 'worried', 3200)
  }
  const bug: HollowBug = { id, label: id, fails: 1 }
  const bugs = [...p.bugs, bug].slice(-MAX_BUGS)
  return feel(speak({ ...p, bugs }, now, w.bugNew(id), 4200), now, 'worried', 3200)
}

/** Uma ferramenta terminou. */
export function onTool(p: Hollow, now: number, info: ToolInfo, rules: Rules): Hollow {
  const w = WORDS[rules.lang]
  let q = wakeUp(p, now)
  const part = info.tool === 'Bash' && info.command ? buildPart(info.command) : null
  if (part !== null) q = onBuild(q, now, part, info.ok && !(masksExit(info.command ?? '') && readsFailed(info.output ?? '')), rules)
  else if (!info.ok) {
    q = feel(q, now, 'worried', 1800)
    if (rules.chatter !== 'off' && now - q.lastChat > 8_000) q = { ...speak(q, now, pick(w.toolFail, rules), 2400), lastChat: now }
  }
  if (!info.ok) return q
  if (info.git?.commit) q = grow(feel(speak(eat(q, 5), now, pick(w.commit, rules)), now, 'happy', 2200), now, 1, rules)
  if (info.git?.push) q = grow(cheer({ ...q, lastCheer: 0 }, now, pick(w.push, rules), rules), now, 1, rules)
  if (info.git?.pr) q = grow(cheer({ ...q, lastCheer: 0 }, now, pick(w.pr, rules), rules), now, 2, rules)
  if (info.git?.branch) q = feel(speak(q, now, pick(w.branch, rules)), now, 'happy', 2200)
  if (EDIT_TOOLS.has(info.tool)) {
    q = { ...eat(q, 0.35), edits: q.edits + 1 }
    if (rules.chatter === 'normal' && q.edits % 8 === 0 && now - q.lastChat > 25_000 && q.say === '') q = { ...speak(q, now, pick(w.edit, rules), 2600), lastChat: now }
  } else if (part === null && !info.git) q = eat(q, 0.05)
  return q
}

/** O usuário mandou um prompt: o bicho acorda e come um pouco do texto. */
export function onPrompt(p: Hollow, now: number, text: string, rules: Rules): Hollow {
  const was = p.pose === 'sleep'
  let q = eat(wakeUp(p, now), Math.min(1.5, 0.3 + text.length / 160))
  if (was) return feel(speak(q, now, pick(WORDS[rules.lang].back, rules)), now, 'happy', 1800)
  if (rules.chatter === 'normal' && now - q.lastChat > 20_000 && q.say === '') q = { ...speak(q, now, pick(WORDS[rules.lang].prompt, rules), 2200), lastChat: now }
  return q
}

export function onTurnStart(p: Hollow, now: number, rules: Rules): Hollow {
  let q = { ...wakeUp(p, now), working: true }
  if (rules.chatter === 'normal' && now - q.lastChat > 25_000 && q.say === '') q = { ...speak(q, now, pick(WORDS[rules.lang].hunt, rules), 2400), lastChat: now }
  return q
}

export type TurnEnd = 'answer' | 'aborted' | 'refusal' | 'error'

export function onTurnEnd(p: Hollow, now: number, reason: TurnEnd, rules: Rules): Hollow {
  const w = WORDS[rules.lang]
  const q = { ...p, working: false, lastActive: now }
  if (reason === 'aborted') return { ...speak(q, now, pick(w.aborted, rules), 2400), pose: 'alert', poseUntil: now + 1400, edits: 0 }
  if (reason !== 'answer') return feel(speak({ ...q, edits: 0 }, now, pick(w.failed, rules), 3200), now, 'sad', 3200)
  const fed = eat(q, 1.5)
  if (fed.bugs.length > 0) return rules.chatter === 'off' ? { ...fed, edits: 0 } : feel(speak({ ...fed, edits: 0 }, now, w.turnBugs(fed.bugs.length), 3600), now, 'worried', 2400)
  if (fed.edits > 0 && rules.chatter !== 'off') return { ...cheer(fed, now, pick(w.turnDone, rules), rules), edits: 0 }
  return { ...fed, edits: 0 }
}

/** Começa a sessão: aplica o que estava guardado e cumprimenta. */
export function begin(p: Hollow, now: number, saved: HollowSaved | null, rules: Rules): Hollow {
  const w = WORDS[rules.lang]
  let q: Hollow = { ...seed(now), greeted: true }
  let line = pick(w.hello, rules)
  if (saved) {
    q = { ...q, reiatsu: saved.reiatsu, bond: saved.bond, hunted: saved.hunted, hidden: saved.hidden }
    line = now - saved.t > 10 * 60_000 ? pick(w.back, rules) : ''
  }
  q = { ...q, bugs: p.bugs }
  if (!saved || rules.chatter !== 'off') q = line ? { ...speak(q, now, line, 4200), mood: 'happy', moodUntil: now + 2400 } : q
  return q
}

/* ───────────────────────── ações do usuário ───────────────────────── */

export type Action = 'pet' | 'feed' | 'cero' | 'sleep' | 'wake' | 'hide' | 'show' | 'reset'

export function act(p: Hollow, now: number, action: Action, rules: Rules): Hollow {
  const w = WORDS[rules.lang]
  switch (action) {
    case 'pet':
      return grow(feel(speak(eat(wakeUp(p, now), 1), now, pick(w.pet, rules)), now, 'happy', 1800), now, 1, rules)
    case 'feed': {
      const awake = wakeUp(p, now)
      if (awake.reiatsu >= 98) return feel(speak(awake, now, w.full), now, 'happy', 1500)
      return grow(feel(speak(eat(awake, 26), now, pick(w.feed, rules)), now, 'happy', 1800), now, 2, rules)
    }
    case 'cero': {
      const awake = wakeUp(p, now)
      if (awake.reiatsu < CERO_COST) return feel(speak(awake, now, w.weak), now, 'sad', 1800)
      const done = finishCero(awake, now, rules)
      const target = done.bugs[0]?.id
      return grow({ ...eat(done, -CERO_COST), cero: { frame: 0, nextAt: now + CERO_STEP_MS, target, slot: target === undefined ? undefined : 0, kill: false } }, now, 1, rules)
    }
    case 'sleep':
      return { ...speak(p, now, w.sleep, 2200), pose: 'sleep', poseUntil: 0, mood: 'calm', moodUntil: 0 }
    case 'wake':
      return feel(speak(wakeUp(p, now), now, pick(w.wake, rules)), now, 'happy', 1500)
    case 'hide':
      return { ...p, hidden: true }
    case 'show':
      return feel(speak({ ...wakeUp(p, now), hidden: false }, now, w.shown), now, 'happy', 1500)
    case 'reset':
      return speak({ ...seed(now), greeted: true, hunted: 0, bugs: p.bugs }, now, w.reset)
  }
}

/* ───────────────────────── o tempo passa ───────────────────────── */

/** Termina na hora o Cero que está no ar (o abate e as contas valem como se ele tivesse chegado). */
function finishCero(p: Hollow, now: number, rules: Rules): Hollow {
  if (!p.cero) return p
  let q = p
  while (q.cero) q = advanceCero(q, now, rules)
  return q
}

/** O Cero dá um passo; no quadro do acerto, abate (ou só raspa) o alvo. */
function advanceCero(p: Hollow, now: number, rules: Rules): Hollow {
  const cero = p.cero
  if (!cero) return p
  const w = WORDS[rules.lang]
  const frame = cero.frame + 1
  let q: Hollow = { ...p, cero: { ...cero, frame, nextAt: now + CERO_STEP_MS } }
  if (frame === CERO_HIT && cero.target) {
    const bug = q.bugs.find((b) => b.id === cero.target)
    if (bug && cero.kill) {
      const boss = bug.fails >= BOSS_FAILS
      const left = q.bugs.filter((b) => b.id !== bug.id)
      const line = left.length === 0 ? w.bugsClear : pick(boss ? w.bossKill : w.bugKill, rules)
      q = grow(feel(speak({ ...eat(q, 4), bugs: left, hunted: q.hunted + (boss ? 2 : 1) }, now, line, 4200), now, 'happy', 2600), now, boss ? 2 : 1, rules)
    } else if (bug) {
      q = speak({ ...q, bugs: q.bugs.map((b) => (b.id === bug.id ? { ...b, hit: true } : b)) }, now, pick(w.bugHit, rules), 3800)
    }
  } else if (frame === CERO_HIT) {
    q = speak(q, now, pick(w.cero, rules), 1600)
  }
  if (frame >= CERO_FRAMES - 1) q = { ...q, cero: null, bugs: q.bugs.some((b) => b.hit) ? q.bugs.map((b) => ({ ...b, hit: false })) : q.bugs }
  return q
}

const chatGap = (rules: Rules): number => (rules.chatter === 'normal' ? 3.5 * 60_000 : 7 * 60_000)

/** Faz o que já venceu: balão e humor que acabam, piscar, Cero, sono, fome e fala sozinho. */
export function step(p: Hollow, now: number, rules: Rules): Hollow {
  let q = p
  if (q.cero && now >= q.cero.nextAt) q = advanceCero(q, now, rules)
  if (q.say !== '' && now >= q.sayUntil) q = { ...q, say: '' }
  if (q.mood !== 'calm' && now >= q.moodUntil) q = { ...q, mood: 'calm' }
  if (q.pose === 'alert' && now >= q.poseUntil) q = { ...q, pose: '' }
  const dozing = q.pose === 'sleep'
  if (now >= q.blinkAt) {
    const closing = !q.blink && !dozing && !q.cero
    q = { ...q, blink: closing, blinkAt: now + (closing ? BLINK_MS : 3500 + Math.floor(rules.roll() * 3000)) }
  }
  if (now - q.lastTick >= DECAY_EVERY_MS) {
    const minutes = (now - q.lastTick) / 60_000
    q = { ...q, reiatsu: clamp(q.reiatsu - minutes * (dozing ? 0.05 : 0.25), 0, 100), lastTick: now }
  }
  if (!dozing && !q.working && !q.cero && rules.sleepAfterMs > 0 && now - q.lastActive >= rules.sleepAfterMs) {
    q = { ...speak(q, now, WORDS[rules.lang].sleep, 2600), pose: 'sleep', poseUntil: 0, mood: 'calm', moodUntil: 0, blink: false }
  } else if (!dozing && !q.working && !q.cero && !q.hidden && rules.chatter !== 'off' && q.say === '' && now - q.lastChat >= chatGap(rules) && now - q.lastActive >= 60_000) {
    const w = WORDS[rules.lang]
    const line = q.reiatsu < 30 ? pick(w.hungry, rules) : pick(w.idle, rules)
    q = { ...speak(q, now, line, 4200), lastChat: now }
  }
  return q
}

/** Quando `step` volta a ter o que fazer (ms desde 1970). `Infinity` se nada está marcado. */
export function nextDue(p: Hollow, rules: Rules): number {
  if (p.cero) return p.cero.nextAt
  const due: number[] = [p.lastTick + DECAY_EVERY_MS]
  if (p.say !== '') due.push(p.sayUntil)
  if (p.mood !== 'calm') due.push(p.moodUntil)
  if (p.pose === 'alert') due.push(p.poseUntil)
  if (p.pose !== 'sleep') due.push(p.blinkAt)
  if (p.pose !== 'sleep' && !p.working && rules.sleepAfterMs > 0) due.push(p.lastActive + rules.sleepAfterMs)
  if (p.pose !== 'sleep' && !p.working && !p.hidden && rules.chatter !== 'off') due.push(Math.max(p.lastChat + chatGap(rules), p.lastActive + 60_000))
  return Math.min(...due)
}

/* ───────────────────────── o rosto e as contas para a tela ───────────────────────── */

export function faceOf(p: Hollow): HollowFace {
  if (p.cero) return 'fire'
  if (p.pose === 'alert') return 'alert'
  if (p.pose === 'sleep') return 'sleep'
  if (p.mood === 'worried') return 'worried'
  if (p.mood === 'sad') return 'sad'
  if (p.mood === 'happy') return 'happy'
  if (p.working) return 'scan'
  return p.blink ? 'blink' : 'idle'
}

export const isBoss = (b: HollowBug): boolean => b.fails >= BOSS_FAILS

/** A linha de estado para o `/hollowzinho status` e para o status do Claude Code. */
export function statusLine(p: Hollow, name: string, lang: Lang): string {
  return WORDS[lang].ui.status(name, stageName(p.bond, lang), Math.round(p.reiatsu), p.bond, p.bugs.length, p.hunted)
}
