// A lógica do bicho, sem o motor: bugs que nascem e morrem, o Cero, o tempo, a fome, o sono e o que fica guardado.
import { describe, expect, test } from 'claude-code/testing'

import type { Hollow } from '../types'
import { CERO_FRAMES, CERO_HIT, CERO_STEP_MS, act, begin, buildPart, faceOf, family, masksExit, nextDue, onPrompt, onTool, onTurnEnd, onTurnStart, readsFailed, restore, rulesOf, save, seed, stageOf, step, type Rules } from '../hooks/pet'
import { WORDS, choose, pickLang } from '../hooks/text'

const T0 = 1_700_000_000_000
const rules = (extra: Partial<Rules> = {}): Rules => ({ lang: 'pt', chatter: 'normal', sleepAfterMs: 5 * 60_000, roll: () => 0, ...extra })
const fresh = (): Hollow => begin(seed(0), T0, null, rules())
const fail = (p: Hollow, command: string, now = T0): Hollow => onTool(p, now, { tool: 'Bash', ok: false, command }, rules())
const pass = (p: Hollow, command: string, now = T0): Hollow => onTool(p, now, { tool: 'Bash', ok: true, command }, rules())

/** Roda o relógio até o Cero acabar, devolvendo o estado final e o instante. */
function flush(p: Hollow, from: number): { p: Hollow; now: number } {
  let now = from
  let q = p
  for (let i = 0; i < 40 && q.cero; i++) {
    now += CERO_STEP_MS
    q = step(q, now, rules())
  }
  return { p: q, now }
}

describe('o comando vira uma família', () => {
  test('argumentos e caminhos não mudam a família', () => {
    expect(family(buildPart('npm test -- src/a.test.ts') ?? '')).toBe('npm test')
    expect(family(buildPart('npm run build') ?? '')).toBe('npm run build')
    expect(family(buildPart('cd app && cargo test --lib') ?? '')).toBe('cargo test')
    expect(family(buildPart('FOO=1 BAR=2 tsc --noEmit -p .') ?? '')).toBe('tsc')
    expect(family(buildPart('pytest -k parser tests/') ?? '')).toBe('pytest')
    expect(family(buildPart('./node_modules/.bin/vitest run') ?? '')).toBe('vitest')
  })

  test('só o que parece build ou teste conta', () => {
    expect(buildPart('ls -la')).toBeNull()
    expect(buildPart('grep -r "test" src')).toBeNull()
    expect(buildPart('git commit -m "add tests"')).toBeNull()
    expect(buildPart('echo build done')).toBeNull()
    expect(buildPart('cat package.json | grep test')).toBeNull()
  })

  test('num comando composto, vale o primeiro pedaço que parece build', () => {
    expect(buildPart('git pull && npm run lint && ls')).toBe('npm run lint')
  })
})

describe('o código de saída escondido', () => {
  test('um pipe ou um `|| true` esconde o código; aspas e && não', () => {
    expect(masksExit('npm test 2>&1 | tail -30')).toBe(true)
    expect(masksExit('pytest -q | tee out.log')).toBe(true)
    expect(masksExit('npm test || true')).toBe(true)
    expect(masksExit('npm test')).toBe(false)
    expect(masksExit('npm run lint && npm test')).toBe(false)
    expect(masksExit('npm test || npm run build')).toBe(false)
    expect(masksExit('git commit -m "a | b"')).toBe(false)
  })

  test('a saída entrega a falha dos executores mais comuns', () => {
    for (const out of [
      'FAIL: ok.flag is missing',
      ' FAIL  src/a.test.ts > soma',
      'Tests:       1 failed, 4 passed, 5 total',
      '=== 2 failed, 3 passed in 0.31s ===',
      'FAILED tests/test_a.py::test_x - assert 1 == 2',
      'test result: FAILED. 0 passed; 1 failed;',
      'src/a.ts(3,1): error TS2322: Type string is not assignable',
      "error[E0308]: mismatched types",
      'npm ERR! Test failed.  See above for more details.',
      '  1 failing',
      'not ok 1 - soma',
      '--- FAIL: TestSoma (0.00s)',
      'Traceback (most recent call last):',
      '✖ 3 problems (3 errors, 0 warnings)',
    ]) expect(readsFailed(out)).toBe(true)
  })

  test('uma saída de sucesso não é confundida com falha', () => {
    for (const out of ['PASS', 'Tests: 0 failed, 5 passed', '0 errors, 0 warnings', 'Compiled successfully.', '5 passing (12ms)', '', 'tudo ok: nenhum erro']) expect(readsFailed(out)).toBe(false)
  })

  test('com o código escondido, a saída decide: falha vira bug, sucesso comemora', () => {
    const run = (p: Hollow, output: string, command = 'npm test 2>&1 | tail -30', now = T0) => onTool(p, now, { tool: 'Bash', ok: true, command, output }, rules())
    const bad = run(fresh(), 'FAIL: ok.flag is missing')
    expect(bad.bugs.map((b) => b.id)).toEqual(['npm test'])
    expect(bad.mood).toBe('worried')
    expect(run(fresh(), 'Tests: 0 failed, 5 passed').bugs).toHaveLength(0)
    // o mesmo comando, agora limpo, mata o bug
    const good = run(bad, 'Tests: 0 failed, 5 passed', 'npm test 2>&1 | tail -30', T0 + 5_000)
    expect(good.cero?.kill).toBe(true)
  })

  test('com o código à mostra, quem decide é o código: sem pipe, a saída é ignorada', () => {
    const p = onTool(fresh(), T0, { tool: 'Bash', ok: true, command: 'npm test', output: 'FAIL: ok.flag is missing' }, rules())
    expect(p.bugs).toHaveLength(0)
  })
})

describe('os bugs', () => {
  test('um comando de build que falha vira um bug; o mesmo comando de novo só soma', () => {
    let p = fail(fresh(), 'npm test')
    expect(p.bugs).toHaveLength(1)
    expect(p.bugs[0]).toMatchObject({ id: 'npm test', label: 'npm test', fails: 1 })
    expect(p.mood).toBe('worried')
    expect(p.say).toBe(WORDS.pt.bugNew('npm test'))
    p = fail(p, 'npm test -- --watch=false', T0 + 5_000)
    expect(p.bugs).toHaveLength(1)
    expect(p.bugs[0]?.fails).toBe(2)
    p = fail(p, 'npm test', T0 + 9_000)
    expect(p.bugs[0]?.fails).toBe(3)
    expect(p.say).toBe(WORDS.pt.bugBoss('npm test'))
  })

  test('uma falha que não é de build não vira bug', () => {
    const p = onTool(fresh(), T0, { tool: 'Bash', ok: false, command: 'grep -r nada .' }, rules())
    expect(p.bugs).toHaveLength(0)
    expect(p.mood).toBe('worried')
  })

  test('um erro de outra ferramenta preocupa, mas não cria bug', () => {
    const p = onTool(fresh(), T0, { tool: 'Edit', ok: false }, rules())
    expect(p.bugs).toHaveLength(0)
    expect(p.mood).toBe('worried')
  })

  test('quando o mesmo comando passa, o pet atira e o bug morre no quadro do acerto', () => {
    const failed = fail(fail(fresh(), 'tsc'), 'cargo build', T0 + 1_000)
    expect(failed.bugs.map((b) => b.id)).toEqual(['tsc', 'cargo build'])
    const aimed = pass(failed, 'tsc --noEmit', T0 + 2_000)
    expect(aimed.cero).toMatchObject({ frame: 0, target: 'tsc', kill: true })
    expect(aimed.bugs).toHaveLength(2) // ainda vivo: o raio está a caminho
    expect(faceOf(aimed)).toBe('fire')

    let q = aimed
    let now = T0 + 2_000
    for (let frame = 1; frame <= CERO_HIT; frame++) {
      now += CERO_STEP_MS
      q = step(q, now, rules())
    }
    expect(q.bugs.map((b) => b.id)).toEqual(['cargo build'])
    expect(q.hunted).toBe(1)
    expect(q.bond).toBe(1)
    expect(q.say).toBe(WORDS.pt.bugKill[0])
    expect(q.mood).toBe('happy')

    const done = flush(q, now).p
    expect(done.cero).toBeNull()
    expect(done.bugs).toHaveLength(1)
  })

  test('o último bug morto traz o alívio', () => {
    const q = flush(pass(fail(fresh(), 'npm test'), 'npm test', T0 + 1_000), T0 + 1_000).p
    expect(q.bugs).toHaveLength(0)
    expect(q.hunted).toBe(1)
    expect(q.say).toBe(WORDS.pt.bugsClear)
  })

  test('um bug que falhou três vezes é um chefe: vale dois e tem fala própria', () => {
    let p = fresh()
    for (let i = 0; i < 3; i++) p = fail(p, 'make', T0 + i * 1_000)
    const q = flush(pass(p, 'make -j4', T0 + 4_000), T0 + 4_000).p
    expect(q.hunted).toBe(2)
    expect(q.bond).toBe(2)
    expect(WORDS.pt.bossKill).toContain(q.say === WORDS.pt.bugsClear ? WORDS.pt.bossKill[0] : q.say)
  })

  test('passar sem nenhum bug só comemora, e sem repetir a cada segundo', () => {
    let p = pass(fresh(), 'npm test', T0)
    expect(p.mood).toBe('happy')
    expect(WORDS.pt.passed).toContain(p.say)
    expect(p.cero).toBeNull()
    const again = pass({ ...p, say: '', mood: 'calm' }, 'npm test', T0 + 1_000)
    expect(again.say).toBe('')
    p = pass({ ...p, say: '', mood: 'calm' }, 'npm test', T0 + 10_000)
    expect(p.mood).toBe('happy')
  })

  test('nunca guarda mais de oito bugs', () => {
    let p = fresh()
    for (let i = 0; i < 12; i++) p = fail(p, `make t${i}`, T0 + i)
    const ids = new Set(p.bugs.map((b) => b.id))
    expect(p.bugs.length).toBeLessThanOrEqual(8)
    expect(ids.size).toBe(p.bugs.length)
  })

  test('um Cero manual raspa o bug, não o mata, e tira reiatsu', () => {
    const p = act(fail(fresh(), 'npm test'), T0 + 1_000, 'cero', rules())
    expect(p.cero).toMatchObject({ target: 'npm test', kill: false })
    expect(p.reiatsu).toBeLessThan(80)
    const q = flush(p, T0 + 1_000).p
    expect(q.bugs).toHaveLength(1)
    expect(q.bugs[0]?.hit).toBeFalsy()
    expect(q.hunted).toBe(0)
  })

  test('o Cero manual sem alvo só dispara', () => {
    const p = act(fresh(), T0, 'cero', rules())
    expect(p.cero).toMatchObject({ frame: 0, kill: false })
    expect(p.cero?.target).toBeUndefined()
    expect(flush(p, T0).p.cero).toBeNull()
  })

  test('sem reiatsu o Cero não sai', () => {
    const p = act({ ...fresh(), reiatsu: 5 }, T0, 'cero', rules())
    expect(p.cero).toBeNull()
    expect(p.say).toBe(WORDS.pt.weak)
  })
})

describe('o que o Claude faz', () => {
  test('um commit alimenta o bicho e cria vínculo', () => {
    const p = onTool({ ...fresh(), reiatsu: 40 }, T0, { tool: 'Bash', ok: true, command: 'git commit -m x', git: { commit: true } }, rules())
    expect(p.reiatsu).toBeGreaterThan(44)
    expect(p.bond).toBe(1)
    expect(WORDS.pt.commit).toContain(p.say)
  })

  test('push e PR comemoram, e o PR vale mais vínculo', () => {
    const pushed = onTool(fresh(), T0, { tool: 'Bash', ok: true, command: 'git push', git: { push: true } }, rules())
    expect(WORDS.pt.push).toContain(pushed.say)
    expect(pushed.bond).toBe(1)
    const pr = onTool(fresh(), T0, { tool: 'Bash', ok: true, command: 'gh pr create', git: { pr: true } }, rules())
    expect(WORDS.pt.pr).toContain(pr.say)
    expect(pr.bond).toBe(2)
  })

  test('uma branch nova é um passeio', () => {
    const p = onTool(fresh(), T0, { tool: 'Bash', ok: true, command: 'git checkout -b x', git: { branch: true } }, rules())
    expect(WORDS.pt.branch).toContain(p.say)
  })

  test('editar arquivos alimenta; a fala só vem de vez em quando e só no modo normal', () => {
    let p = fresh()
    const r = rules()
    for (let i = 0; i < 7; i++) p = onTool({ ...p, say: '', sayUntil: 0 }, T0 + i * 1_000, { tool: 'Edit', ok: true }, r)
    expect(p.edits).toBe(7)
    expect(p.say).toBe('')
    p = onTool({ ...p, say: '', sayUntil: 0 }, T0 + 60_000, { tool: 'Write', ok: true }, r)
    expect(p.edits).toBe(8)
    expect(WORDS.pt.edit).toContain(p.say)
    const quiet = onTool({ ...p, say: '', edits: 7, lastChat: 0 }, T0 + 120_000, { tool: 'Edit', ok: true }, rules({ chatter: 'low' }))
    expect(quiet.say).toBe('')
  })

  test('o prompt acorda o bicho e o alimenta um pouco', () => {
    const asleep = act(fresh(), T0, 'sleep', rules())
    expect(asleep.pose).toBe('sleep')
    const p = onPrompt({ ...asleep, reiatsu: 50 }, T0 + 1_000, 'por favor, conserte o parser', rules())
    expect(p.pose).toBe('')
    expect(p.reiatsu).toBeGreaterThan(50)
    expect(WORDS.pt.back).toContain(p.say)
  })

  test('o turno põe o bicho em modo caçador e o solta no fim', () => {
    let p = onTurnStart(fresh(), T0, rules())
    expect(p.working).toBe(true)
    expect(faceOf({ ...p, mood: 'calm', cero: null })).toBe('scan')
    p = onTurnEnd({ ...p, edits: 3 }, T0 + 30_000, 'answer', rules())
    expect(p.working).toBe(false)
    expect(p.edits).toBe(0)
    expect(WORDS.pt.turnDone).toContain(p.say)
  })

  test('terminar com bug vivo avisa quantos faltam; interromper dá um susto', () => {
    const bugs = fail(fail(fresh(), 'npm test'), 'tsc', T0 + 1_000)
    const ended = onTurnEnd({ ...bugs, working: true }, T0 + 5_000, 'answer', rules())
    expect(ended.say).toBe(WORDS.pt.turnBugs(2))
    const cut = onTurnEnd({ ...fresh(), working: true }, T0, 'aborted', rules())
    expect(cut.pose).toBe('alert')
    expect(faceOf(cut)).toBe('alert')
    const broke = onTurnEnd({ ...fresh(), working: true }, T0, 'error', rules())
    expect(broke.mood).toBe('sad')
  })
})

describe('o tempo', () => {
  test('o balão e o humor passam sozinhos', () => {
    const p = fail(fresh(), 'npm test', T0)
    expect(step(p, T0 + 1_000, rules()).say).not.toBe('')
    const later = step(p, T0 + 10_000, rules())
    expect(later.say).toBe('')
    expect(later.mood).toBe('calm')
  })

  test('sem atividade ele dorme, e só quando nada está rodando', () => {
    const p = fresh()
    expect(step(p, T0 + 4 * 60_000, rules()).pose).toBe('')
    expect(step({ ...p, working: true }, T0 + 20 * 60_000, rules()).pose).toBe('')
    const slept = step(p, T0 + 5 * 60_000 + 1, rules())
    expect(slept.pose).toBe('sleep')
    expect(faceOf(slept)).toBe('sleep')
    expect(step(p, T0 + 60 * 60_000, rules({ sleepAfterMs: 0 })).pose).toBe('')
  })

  test('a fome cai devagar, e dormindo cai ainda mais devagar', () => {
    const awake = step({ ...fresh(), lastActive: T0 + 3_600_000 }, T0 + 60 * 60_000, rules({ sleepAfterMs: 0, chatter: 'off' }))
    expect(awake.reiatsu).toBeGreaterThan(64.9)
    expect(awake.reiatsu).toBeLessThan(65.1) // 80 - 60 min x 0,25
    const napping = step({ ...fresh(), pose: 'sleep' }, T0 + 60 * 60_000, rules({ chatter: 'off' }))
    expect(napping.reiatsu).toBeGreaterThan(76.9)
    expect(napping.reiatsu).toBeLessThan(77.1) // 80 - 60 min x 0,05
  })

  test('o bicho pisca de vez em quando, e não durante o sono', () => {
    const p = fresh()
    const closed = step(p, p.blinkAt, rules())
    expect(closed.blink).toBe(true)
    const open = step(closed, closed.blinkAt, rules())
    expect(open.blink).toBe(false)
    expect(open.blinkAt).toBeGreaterThan(closed.blinkAt + 3_000)
    const dozing = step({ ...p, pose: 'sleep' }, p.blinkAt, rules())
    expect(dozing.blink).toBe(false)
  })

  test('parado e quieto, ele puxa conversa, mais ainda com fome', () => {
    const quiet = fresh()
    expect(step(quiet, T0 + 2 * 60_000, rules()).say).toBe('')
    const chat = step({ ...quiet, lastChat: 0 }, T0 + 4 * 60_000, rules())
    expect(WORDS.pt.idle).toContain(chat.say)
    const hungry = step({ ...quiet, reiatsu: 20, lastChat: 0 }, T0 + 4 * 60_000, rules())
    expect(WORDS.pt.hungry).toContain(hungry.say)
    expect(step({ ...quiet, lastChat: 0 }, T0 + 4 * 60_000, rules({ chatter: 'off' })).say).toBe('')
  })

  test('sem mudança, step devolve o mesmo objeto (nada para escrever)', () => {
    const p = { ...fresh(), lastTick: T0 + 10 }
    expect(step(p, T0 + 20, rules())).toBe(p)
  })

  test('nextDue aponta o próximo vencimento e nunca fica para trás do raio', () => {
    const p = fail(fresh(), 'npm test', T0)
    const due = nextDue(p, rules())
    expect(due).toBeGreaterThan(T0)
    expect(due).toBeLessThanOrEqual(p.sayUntil)
    const aimed = pass(p, 'npm test', T0 + 100)
    expect(nextDue(aimed, rules())).toBe(aimed.cero?.nextAt)
    expect(CERO_FRAMES).toBeGreaterThan(CERO_HIT + 2)
  })
})

describe('ações e evolução', () => {
  test('carinho e comida', () => {
    const p = act({ ...fresh(), reiatsu: 40 }, T0, 'feed', rules())
    expect(p.reiatsu).toBe(66)
    expect(p.bond).toBe(2)
    const full = act({ ...fresh(), reiatsu: 99 }, T0, 'feed', rules())
    expect(full.reiatsu).toBe(99)
    expect(full.say).toBe(WORDS.pt.full)
    expect(act(fresh(), T0, 'pet', rules()).bond).toBe(1)
  })

  test('com 15 de vínculo ele vira Adjuchas, com 40, Vasto Lorde, e avisa', () => {
    expect([stageOf(0), stageOf(14), stageOf(15), stageOf(39), stageOf(40)]).toEqual([1, 1, 2, 2, 3])
    const a = act({ ...fresh(), bond: 14 }, T0, 'pet', rules())
    expect(a.say).toBe(WORDS.pt.levelup[2])
    const v = act({ ...fresh(), bond: 39 }, T0, 'pet', rules())
    expect(v.say).toBe(WORDS.pt.levelup[3])
  })

  test('dormir, acordar, esconder e recomeçar', () => {
    const asleep = act(fresh(), T0, 'sleep', rules())
    expect(asleep.pose).toBe('sleep')
    expect(act(asleep, T0 + 1, 'wake', rules()).pose).toBe('')
    expect(act(fresh(), T0, 'hide', rules()).hidden).toBe(true)
    expect(act({ ...fresh(), hidden: true }, T0, 'show', rules()).hidden).toBe(false)
    const reset = act({ ...fresh(), bond: 30, hunted: 9 }, T0, 'reset', rules())
    expect([reset.bond, reset.hunted, reset.reiatsu]).toEqual([0, 0, 80])
  })
})

describe('guardar e restaurar', () => {
  test('o que se guarda volta igual, e o tempo fora cobra reiatsu', () => {
    const p = { ...fresh(), reiatsu: 70.4, bond: 21, hunted: 6, hidden: true }
    const saved = save(p, T0)
    expect(saved).toEqual({ v: 1, reiatsu: 70, bond: 21, hunted: 6, hidden: true, seen: true, t: T0 })
    const back = restore(saved, T0)
    expect(back).toMatchObject({ reiatsu: 70, bond: 21, hunted: 6, hidden: true })
    const away = restore(saved, T0 + 8 * 60 * 60_000)
    expect(away?.reiatsu).toBe(40) // 70 - min(30, 480 min / 8 = 60)
  })

  test('formato desconhecido ou estragado é recusado', () => {
    expect(restore(null, T0)).toBeNull()
    expect(restore({ v: 2 }, T0)).toBeNull()
    expect(restore('oi', T0)).toBeNull()
    const odd = restore({ v: 1, reiatsu: 'muito', bond: -4, hunted: 2.9, t: 'ontem' }, T0)
    expect(odd).toMatchObject({ reiatsu: 80, bond: 0, hunted: 2, hidden: false, seen: false })
  })

  test('na primeira vez ele se apresenta; voltando logo, fica quieto; depois de um tempo, recebe você', () => {
    const first = begin(seed(0), T0, null, rules())
    expect(WORDS.pt.hello).toContain(first.say)
    const saved = save(first, T0)
    const soon = begin(seed(0), T0 + 60_000, restore(saved, T0 + 60_000), rules())
    expect(soon.say).toBe('')
    const later = begin(seed(0), T0 + 30 * 60_000, restore(saved, T0 + 30 * 60_000), rules())
    expect(WORDS.pt.back).toContain(later.say)
  })
})

describe('as opções', () => {
  test('o idioma segue o sistema quando está em auto', () => {
    expect(pickLang('auto', 'pt_BR.UTF-8')).toBe('pt')
    expect(pickLang('auto', 'en_US.UTF-8')).toBe('en')
    expect(pickLang('auto', undefined)).toBe('en')
    expect(pickLang('pt', 'en_US')).toBe('pt')
    expect(pickLang('en', 'pt_BR')).toBe('en')
  })

  test('valores estranhos viram os padrões', () => {
    const r = rulesOf({ chatter: 'gritando', sleepAfterMinutes: -3, language: 'klingon' }, 'pt_BR', () => 0.5)
    expect(r).toMatchObject({ chatter: 'low', sleepAfterMs: 300_000, lang: 'pt' })
    expect(rulesOf({ chatter: 'off', sleepAfterMinutes: 0 }, 'en', () => 0).sleepAfterMs).toBe(0)
  })

  test('choose cai sempre dentro da lista', () => {
    expect(choose(['a', 'b', 'c'], 0)).toBe('a')
    expect(choose(['a', 'b', 'c'], 0.99999)).toBe('c')
    expect(choose(['a', 'b', 'c'], 1)).toBe('c')
  })

  test('as duas línguas têm as mesmas falas', () => {
    for (const key of Object.keys(WORDS.pt) as Array<keyof typeof WORDS.pt>) {
      expect(typeof WORDS.en[key]).toBe(typeof WORDS.pt[key])
      const a = WORDS.pt[key]
      const b = WORDS.en[key]
      if (Array.isArray(a) && Array.isArray(b)) expect(b.length).toBe(a.length)
    }
  })
})
