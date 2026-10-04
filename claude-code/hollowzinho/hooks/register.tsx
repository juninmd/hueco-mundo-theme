// Hollowzinho para o Claude Code: um Hollow de estimação que mora acima do prompt.
//
//  - Cada comando de build ou teste que falha vira um bugzinho na cena; quando o mesmo comando passa, o pet atira um Cero e abate.
//  - Edições, commits, pushes e PRs alimentam o bicho; um turno em andamento o põe em modo caçador; parado, ele dorme.
//  - /hollowzinho abre o painel (ou carinho, comida, Cero, sono) e guarda o vínculo entre as sessões.
//
// Este arquivo só liga o Claude Code à lógica do pet.ts e ao desenho do view.tsx. Nada aqui altera o que o Claude faz:
// as ferramentas rodam como sempre e o resultado volta intacto, mesmo que o pet tropece.

import type { EngineInterface, PluginOptions, Register, Timer } from 'claude-code'

import type { Hollow } from '../types'
import { act, begin, nextDue, onPrompt, onTool, onTurnEnd, onTurnStart, restore, rulesOf, save, seed, statusLine, step, type Action, type Rules, type ToolInfo } from './pet'
import type { Tint } from './sprite'
import { WORDS } from './text'
import { remoteBand, remotePane, statusText, terminalBand, terminalLine, terminalPane, type Look } from './view'

type Dollar = EngineInterface

const PET = { plugin: 'hollowzinho', key: 'pet' } as const
const PANE = 'hollowzinho'
const SAVED = 'pet'
// Do que o Bash escreveu, só o final importa (o resumo do teste vem por último).
const OUTPUT_TAIL = 4000

const text = (v: unknown, d: string): string => (typeof v === 'string' && v.trim() !== '' ? v.trim() : d)
const oneOf = <T extends string>(v: unknown, list: readonly T[], d: T): T => (list.includes(v as T) ? (v as T) : d)

/** O que o `/hollowzinho` entende, em português e em inglês. */
const WORDS_OF: Readonly<Record<string, Action | 'status' | 'pane' | 'help'>> = {
  '': 'pane', pane: 'pane', painel: 'pane', open: 'pane', abrir: 'pane',
  pet: 'pet', carinho: 'pet',
  feed: 'feed', alimentar: 'feed', comer: 'feed',
  cero: 'cero',
  sleep: 'sleep', dormir: 'sleep',
  wake: 'wake', acordar: 'wake',
  hide: 'hide', esconder: 'hide',
  show: 'show', mostrar: 'show',
  reset: 'reset', recomecar: 'reset', 'recomeçar': 'reset',
  status: 'status', estado: 'status',
  help: 'help', ajuda: 'help', '?': 'help',
}

/* ───────────────────────── configuração e estado do módulo ─────────────────────────
 * O motor só deixa passar o `$` a funções declaradas no topo do arquivo (assim `claude plugin validate` lista tudo o que o
 * módulo chama). Por isso o que `register` recebe fica aqui em cima, em variáveis do módulo: elas valem por carga, e uma
 * recarga a quente começa do zero. */

type Config = { options: PluginOptions; name: string; tint: Tint; display: 'band' | 'status' | 'off' }

let cfg: Config = { options: {}, name: 'Hollowzinho', tint: 'cero', display: 'band' }
/** Sem pessoa à frente (`claude -p`, SDK) não há o que desenhar: o bicho dorme quieto. */
let live = true
let rulesCache: Promise<Rules> | undefined
let timer: Timer | undefined
let saver: Timer | undefined

const lookOf = (r: Rules): Look => ({ name: cfg.name, lang: r.lang, tint: cfg.tint })

async function rules($: Dollar): Promise<Rules> {
  rulesCache ??= (async () => {
    const env = (await $.env.get('LC_ALL')) || (await $.env.get('LC_MESSAGES')) || (await $.env.get('LANG'))
    return rulesOf(cfg.options, env, Math.random)
  })()
  return rulesCache
}

/* ───────── estado: uma única fonte, lida pela tela e escrita só por aqui ───────── */

async function persist($: Dollar): Promise<void> {
  const { value } = await $.state.get(PET)
  if (value) await $.store.set(SAVED, save(value, await $.clock.now()))
}

function saveSoon($: Dollar): void {
  saver?.cancel()
  saver = $.clock.after(1500, () => void persist($).catch(() => {}))
}

async function paintStatus($: Dollar, p: Hollow): Promise<void> {
  if (cfg.display !== 'status') return
  $.ui.status(p.hidden ? undefined : statusText(p, lookOf(await rules($))))
}

/** Aplica `fn` ao estado. Se `fn` devolve o mesmo objeto, nada é escrito e nada é redesenhado. */
async function change($: Dollar, fn: (p: Hollow) => Hollow): Promise<{ state: Hollow; changed: boolean }> {
  for (let tries = 0; tries < 8; tries++) {
    const held = await $.state.get(PET)
    const before = held.value ?? seed(0)
    const after = fn(before)
    if (after === before) return { state: before, changed: false }
    const wrote = await $.state.set(PET, after, { ifVersion: held.version })
    if (wrote.isSet) {
      void paintStatus($, after).catch(() => {})
      saveSoon($)
      return { state: after, changed: true }
    }
  }
  return { state: (await $.state.get(PET)).value ?? seed(0), changed: false }
}

/* ───────── o tempo: um único relógio que acorda quando há o que fazer ───────── */

async function arm($: Dollar, justChanged = true): Promise<void> {
  timer?.cancel()
  const r = await rules($)
  const now = await $.clock.now()
  const p = (await $.state.get(PET)).value ?? seed(0)
  const due = nextDue(p, r)
  if (!Number.isFinite(due)) return
  // Vencido e nada mudou na última volta: espera um pouco em vez de rodar sem parar.
  const delay = due <= now ? (justChanged ? 40 : 1000) : Math.min(Math.max(due - now, 40), 60_000)
  timer = $.clock.after(delay, () => void tick($))
}

async function tick($: Dollar): Promise<void> {
  try {
    const r = await rules($)
    const now = await $.clock.now()
    const { changed } = await change($, (p) => step(p, now, r))
    await arm($, changed)
  } catch (_) {
    timer = $.clock.after(5000, () => void tick($))
  }
}

async function run($: Dollar, fn: (p: Hollow, now: number, r: Rules) => Hollow): Promise<Hollow> {
  const r = await rules($)
  const now = await $.clock.now()
  const { state } = await change($, (p) => fn(p, now, r))
  await arm($)
  return state
}

/* ───────────────────────── os ganchos ───────────────────────── */

export const register: Register = (on, options) => {
  cfg = {
    options,
    name: text(options.name, 'Hollowzinho').slice(0, 24),
    tint: oneOf<Tint>(options.tint, ['cero', 'reishi', 'ouro'], 'cero'),
    display: oneOf(options.display, ['band', 'status', 'off'] as const, 'band'),
  }
  live = true
  rulesCache = undefined
  timer = undefined
  saver = undefined

  /* ───────── a sessão ───────── */

  on('session.start', async ($, e, next) => {
    live = e.isInteractive
    if (live) {
      const r = await rules($)
      const now = await $.clock.now()
      const saved = restore(await $.store.get(SAVED), now)
      await $.command.register({ name: 'hollowzinho', description: WORDS[r.lang].ui.help, argumentHint: '[pet|feed|cero|sleep|wake|hide|show|status|reset|pane]' })
      await change($, (p) => begin(p, now, saved, r))
      await arm($)
    }
    return next(e)
  })

  on('session.end', async ($, e, next) => {
    timer?.cancel()
    saver?.cancel()
    if (live) await persist($).catch(() => {})
    return next(e)
  })

  /* ───────── o que o Claude faz ───────── */

  on('prompt.submit', async ($, e, next) => {
    if (live) await run($, (p, now, r) => onPrompt(p, now, e.text, r)).catch(() => {})
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    if (live) await run($, (p, now, r) => onTurnStart(p, now, r)).catch(() => {})
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const out = await next(e)
    if (live && e.agentId === undefined) await run($, (p, now, r) => onTurnEnd(p, now, e.reason, r)).catch(() => {})
    return out
  })

  // Só observa: o resultado da ferramenta volta como veio, e qualquer tropeço aqui é engolido.
  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    if (!live || ran.deny !== undefined) return ran
    try {
      const info: ToolInfo = { tool: String(e.tool), ok: ran.isError !== true }
      if (e.tool === 'Bash') {
        info.command = e.command
        const bash = (ran.result ?? {}) as { stdout?: unknown; stderr?: unknown; gitOperation?: { commit?: unknown; push?: unknown; pr?: { action?: string } } }
        if (ran.isError !== true) info.output = `${typeof bash.stdout === 'string' ? bash.stdout : ''}\n${typeof bash.stderr === 'string' ? bash.stderr : ''}`.slice(-OUTPUT_TAIL)
        const git = bash.gitOperation
        const newBranch = /\bgit\s+(?:checkout\s+-b|switch\s+-c)\b/.test(e.command)
        info.git = { commit: !!git?.commit, push: !!git?.push, pr: git?.pr?.action === 'created' || git?.pr?.action === 'merged', branch: newBranch }
      }
      await run($, (p, now, r) => onTool(p, now, info, r))
    } catch (_) {
      // o bicho tropeçar não pode derrubar a ferramenta
    }
    return ran
  })

  /* ───────── /hollowzinho ───────── */

  on('command.run', { command: 'hollowzinho' }, async ($, e) => {
    const r = await rules($)
    const w = WORDS[r.lang].ui
    const arg = e.args.trim().toLowerCase()
    const what = WORDS_OF[arg]
    if (what === undefined) return { text: w.unknown(arg) }
    if (what === 'help') return { text: w.help }
    if (what === 'pane') {
      const opened = await $.ui.open({ id: PANE, title: cfg.name })
      return { text: opened.isPlaced ? w.paneOpened : w.paneNarrow }
    }
    if (what === 'status') return { text: statusLine((await $.state.get(PET)).value ?? seed(0), cfg.name, r.lang) }
    const after = await run($, (p, now, rr) => act(p, now, what, rr))
    return { text: `${cfg.name}: ${after.say !== '' ? after.say : statusLine(after, cfg.name, r.lang)}` }
  })

  /* ───────── o que aparece na tela ───────── */

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (cfg.display !== 'band' || e.props.hasSurvey) return next(e)
    const p = (await $.state.get(PET)).value
    if (!p || p.hidden) return next(e)
    const look = lookOf(await rules($))
    if (e.surface === 'terminal') {
      const t = $.ui.resolve(e)
      const width = e.props.bodyColumns
      return width < 40 ? terminalLine(t, p, look) : terminalBand(t, p, look, width)
    }
    if (e.surface === 'desktop') return remoteBand($.ui.resolve(e), p, look)
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const p = (await $.state.get(PET)).value ?? seed(0)
    const look = lookOf(await rules($))
    const handlers = { act: (action: Action) => void run($, (q, now, r) => act(q, now, action, r)).catch(() => {}) }
    if (e.surface === 'terminal') return terminalPane($.ui.resolve(e), p, look, e.props.bodyColumns, handlers)
    return remotePane($.ui.resolve(e), p, look, handlers)
  })
}
