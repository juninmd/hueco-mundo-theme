// O plugin inteiro contra o motor: a sessão, o prompt, as ferramentas, o relógio, o comando, o painel e a faixa,
// em cada superfície que ele desenha. O motor responde por baixo (`on`), como o Claude Code responderia.
import { describe, expect, test } from 'claude-code/testing'

import { fromCells } from '../hooks/sprite'
import { WORDS } from '../hooks/text'
import { laneColumns } from '../hooks/view'
import { BAND, CERO_FRAME_MS, PANE, T0, WITH, peek, probe, say, start, world } from './support'

describe('a sessão', () => {
  test('ao começar ele se apresenta', WITH, async ($, on) => {
    world(on)
    await start($)
    const held = await peek($)
    expect(WORDS.pt.hello).toContain(held?.say)
    expect(held?.greeted).toBe(true)
  })

  test('com o sistema em inglês, ele fala inglês', WITH, async ($, on) => {
    world(on, { LANG: 'en_US.UTF-8' })
    await start($)
    expect(WORDS.en.hello).toContain((await peek($))?.say)
  })

  test('o idioma escolhido nas opções vale mais que o do sistema', { ...WITH, options: { language: 'en' } }, async ($, on) => {
    world(on, { LANG: 'pt_BR.UTF-8' })
    await start($)
    expect(WORDS.en.hello).toContain((await peek($))?.say)
  })

  test('o nome vem das opções', { ...WITH, options: { name: 'Grimmjow' } }, async ($, on) => {
    world(on)
    await start($)
    expect(await say($, 'pet')).toMatch(/^Grimmjow: /)
  })

  test('sem pessoa à frente (claude -p) ele não faz nada', WITH, async ($, on) => {
    const w = world(on)
    await $.session.start({ cwd: '/work', surface: null, isInteractive: false })
    w.outcomes.set('npm test', 'fail')
    await $.tool.call({ tool: 'Bash', command: 'npm test' })
    expect(await peek($)).toBeNull()
  })

  test('o vínculo sobrevive entre sessões: guarda com um tempinho e volta ao abrir', WITH, async ($, on) => {
    const w = world(on)
    await start($)
    await say($, 'feed')
    await w.clock.advance(2_000)
    const saved = JSON.parse(await probe($, 'saved')) as { bond: number; reiatsu: number; v: number; seen: boolean }
    expect(saved).toMatchObject({ v: 1, bond: 2, seen: true })
    expect(saved.reiatsu).toBeGreaterThan(90)
  })

  test('uma sessão nova encontra o que a anterior guardou, sem se apresentar de novo', WITH, async ($, on) => {
    const w = world(on)
    await probe($, JSON.stringify({ v: 1, reiatsu: 55, bond: 21, hunted: 7, hidden: false, seen: true, t: T0 }))
    await start($)
    const held = await peek($)
    expect(held).toMatchObject({ bond: 21, hunted: 7, say: '' })
    expect(held?.reiatsu).toBeGreaterThan(54)
    await w.clock.advance(100)
  })
})

describe('as ferramentas', () => {
  test('o resultado da ferramenta volta intacto, falhando ou passando', WITH, async ($, on) => {
    const w = world(on)
    await start($)
    w.outcomes.set('npm test', 'fail')
    const failed = await $.tool.call({ tool: 'Bash', command: 'npm test' })
    expect(failed).toMatchObject({ isError: true, text: 'Exit code 1' })
    w.outcomes.set('npm test', 'ok')
    const ok = await $.tool.call({ tool: 'Bash', command: 'npm test' })
    expect(ok).toMatchObject({ result: { stdout: '', interrupted: false } })
  })

  test('um pipe esconde o código de saída, mas o que o teste escreveu o entrega', WITH, async ($, on) => {
    const w = world(on)
    await start($)
    const piped = 'npm test 2>&1 | tail -30'
    w.stdout.set(piped, 'FAIL: ok.flag is missing')
    await $.tool.call({ tool: 'Bash', command: piped })
    expect((await peek($))?.bugs).toEqual([{ id: 'npm test', label: 'npm test', fails: 1 }])

    w.stdout.set(piped, 'PASS')
    await $.tool.call({ tool: 'Bash', command: piped })
    expect((await peek($))?.cero).toMatchObject({ target: 'npm test', kill: true })
    await w.clock.advance(100)
  })

  test('uma ferramenta negada não é falha de build', WITH, async ($, on) => {
    const w = world(on)
    await start($)
    w.outcomes.set('npm test', 'deny')
    const out = await $.tool.call({ tool: 'Bash', command: 'npm test' })
    expect(out).toEqual({ deny: 'não pode' })
    expect((await peek($))?.bugs).toHaveLength(0)
  })

  test('um comando de teste que falha vira bug; passar o abate com um Cero, no relógio simulado', WITH, async ($, on) => {
    const w = world(on)
    await start($)
    w.outcomes.set('npm test', 'fail')
    await $.tool.call({ tool: 'Bash', command: 'npm test' })
    let held = await peek($)
    expect(held?.bugs).toEqual([{ id: 'npm test', label: 'npm test', fails: 1 }])
    expect(held?.say).toBe(WORDS.pt.bugNew('npm test'))

    w.outcomes.set('npm test', 'ok')
    await $.tool.call({ tool: 'Bash', command: 'npm test -- --run' })
    held = await peek($)
    expect(held?.cero).toMatchObject({ frame: 0, target: 'npm test', kill: true })
    expect(held?.bugs).toHaveLength(1)

    await w.clock.advance(2_000)
    held = await peek($)
    expect(held?.cero).toBeNull()
    expect(held?.bugs).toHaveLength(0)
    expect(held?.hunted).toBe(1)
    expect(held?.bond).toBe(1)
  })

  test('a edição de arquivos alimenta o bicho e o git vira festa', WITH, async ($, on) => {
    const w = world(on)
    await start($)
    const before = (await peek($))?.reiatsu ?? 0
    await $.tool.call({ tool: 'Write', file_path: '/work/a.ts', content: 'x' })
    const after = await peek($)
    expect(after?.reiatsu).toBeGreaterThan(before)
    expect(after?.edits).toBe(1)

    w.git.set('git commit -m x', { commit: { sha: 'abc', kind: 'committed' } })
    await $.tool.call({ tool: 'Bash', command: 'git commit -m x' })
    expect(WORDS.pt.commit).toContain((await peek($))?.say)
    w.git.set('git push', { push: { branch: 'main' } })
    await w.clock.advance(5_000)
    await $.tool.call({ tool: 'Bash', command: 'git push' })
    expect(WORDS.pt.push).toContain((await peek($))?.say)
  })

  test('o turno acende o modo caçador e o prompt acorda o bicho', WITH, async ($, on) => {
    const w = world(on)
    await start($)
    await say($, 'sleep')
    expect((await peek($))?.pose).toBe('sleep')
    await $.prompt.submit({ text: 'oi', wait: false, origin: { kind: 'composer' } } as never)
    expect((await peek($))?.pose).toBe('')
    await $.turn.start({ text: 'oi', turnId: 't1' })
    expect((await peek($))?.working).toBe(true)
    await $.turn.complete({ answer: 'feito', durationMs: 900, isAborted: false, turnId: 't1', reason: 'answer' } as never)
    expect((await peek($))?.working).toBe(false)
    await w.clock.advance(1_000)
  })

  test('o turno de um subagente não mexe no bicho', WITH, async ($, on) => {
    world(on)
    await start($)
    await $.turn.start({ text: 'oi', turnId: 't1' })
    await $.turn.complete({ answer: '', durationMs: 5, isAborted: false, turnId: 't1', reason: 'aborted', agentId: 'sub' } as never)
    const held = await peek($)
    expect(held?.working).toBe(true)
    expect(held?.pose).toBe('')
  })
})

describe('o relógio', () => {
  test('o balão passa sozinho e, parado, ele dorme', WITH, async ($, on) => {
    const w = world(on)
    await start($)
    expect((await peek($))?.say).not.toBe('')
    await w.clock.advance(6_000)
    expect((await peek($))?.say).toBe('')
    await w.clock.advance(5 * 60_000)
    expect((await peek($))?.pose).toBe('sleep')
  })

  test('um turno rodando impede o sono', WITH, async ($, on) => {
    const w = world(on)
    await start($)
    await $.turn.start({ text: 'trabalhar', turnId: 't1' })
    await w.clock.advance(20 * 60_000)
    expect((await peek($))?.pose).toBe('')
  })
})

describe('/hollowzinho', () => {
  test('cada ação responde com uma linha e mexe no estado', WITH, async ($, on) => {
    world(on)
    await start($)
    expect(await say($, 'carinho')).toMatch(/^Hollowzinho: /)
    expect((await peek($))?.bond).toBe(1)
    expect(await say($, 'feed')).toMatch(/^Hollowzinho: /)
    expect((await peek($))?.bond).toBe(3)
    expect(await say($, 'cero')).toMatch(/^Hollowzinho: /)
    expect((await peek($))?.cero).not.toBeNull()
  })

  test('status, ajuda, esconder, mostrar e um argumento desconhecido', WITH, async ($, on) => {
    world(on)
    await start($)
    const status = await say($, 'status')
    expect(status).toContain('reiatsu')
    expect(status).toContain('Hollow')
    expect(await say($, 'ajuda')).toBe(WORDS.pt.ui.help)
    expect(await say($, 'esconder')).toContain('Hollowzinho')
    expect((await peek($))?.hidden).toBe(true)
    await say($, 'show')
    expect((await peek($))?.hidden).toBe(false)
    expect(await say($, 'xyz')).toBe(WORDS.pt.ui.unknown('xyz'))
  })
})

describe('a faixa acima do prompt', () => {
  test('no terminal: o rosto em pixel art, o nome e as barras', WITH, async ($, on) => {
    world(on)
    await start($)
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
    const face = await ui.find({ type: 'Raster', key: 'pet' })
    expect(face?.props).toMatchObject({ columns: 12, rows: 5 })
    const cells = fromCells(String(face?.props.cells))
    expect(cells).toHaveLength(12 * 5)
    expect(cells.every(([glyph]) => glyph === 0x20 || (glyph >= 0x2580 && glyph <= 0x259f))).toBe(true)
    expect(cells.some(([glyph]) => glyph !== 0x20)).toBe(true)
    expect(await ui.find({ type: 'Text', text: /reiatsu/ })).toBeDefined()
    expect(await ui.find({ type: 'Raster', key: 'lane' })).toBeUndefined()
    await ui.unmount()
  })

  test('no desktop: o rosto em SVG', WITH, async ($, on) => {
    world(on)
    await start($)
    const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
    const art = await ui.find({ type: 'Svg' })
    expect(String(art?.props.source)).toContain('<svg')
    expect(String(art?.props.source)).toContain('data-stage="1"')
    expect(String(art?.props.alt)).toContain('Hollowzinho')
    await ui.unmount()
  })

  test('um bug aparece na faixa e some depois que o Cero acerta', WITH, async ($, on) => {
    const w = world(on)
    await start($)
    for (const surface of ['terminal', 'desktop'] as const) {
      w.outcomes.set('cargo test', 'fail')
      await $.tool.call({ tool: 'Bash', command: 'cargo test' })
      const ui = await $.ui.mount({ ...BAND, surface })
      if (surface === 'terminal') expect(await ui.find({ type: 'Raster', key: 'lane' })).toBeDefined()
      else expect(await ui.findAll({ type: 'Svg' })).toHaveLength(2)
      w.outcomes.set('cargo test', 'ok')
      await $.tool.call({ tool: 'Bash', command: 'cargo test' })
      await w.clock.advance(2_000)
      expect((await peek($))?.bugs).toHaveLength(0)
      if (surface === 'terminal') expect(await ui.find({ type: 'Raster', key: 'lane' })).toBeUndefined()
      await ui.unmount()
    }
  })

  test('numa faixa estreita, vira uma linha só', WITH, async ($, on) => {
    world(on)
    await start($)
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, bodyColumns: 30 }, viewport: { columns: 30, rows: 24 } })
    expect(await ui.find({ type: 'Raster' })).toBeUndefined()
    expect(await ui.find({ type: 'Text' })).toBeDefined()
  })

  test('escondido, quem desenha é o motor', WITH, async ($, on) => {
    world(on)
    await start($)
    await say($, 'hide')
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
    expect((await ui.find({ type: 'Text' }))?.text).toBe('desenho do motor')
  })

  test('com uma pesquisa na tela, ele cede a faixa', WITH, async ($, on) => {
    world(on)
    await start($)
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, hasSurvey: true } })
    expect((await ui.find({ type: 'Text' }))?.text).toBe('desenho do motor')
  })

  test('com display "status" ou "off" a faixa não aparece', { ...WITH, options: { display: 'off' } }, async ($, on) => {
    world(on)
    await start($)
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
    expect((await ui.find({ type: 'Text' }))?.text).toBe('desenho do motor')
  })
})

describe('a faixa de bugs do terminal', () => {
  const bugs = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `cmd ${i}`, label: `cmd ${i}`, fails: 1 }))
  const cero = { frame: 0, nextAt: 0, target: 'cmd 0', slot: 0, kill: true }

  test('deixa sempre o texto respirar: nunca passa de 45% da largura nem toma o que o resto precisa', () => {
    for (const width of [64, 69, 80, 110, 160]) {
      for (const p of [{ bugs: bugs(1), cero: null }, { bugs: bugs(6), cero: null }, { bugs: bugs(2), cero }]) {
        const lane = laneColumns(p, width, 0.45, 50)
        expect(lane).toBeLessThanOrEqual(Math.floor(width * 0.45))
        expect(lane === 0 || lane >= 10).toBe(true)
        if (lane > 0) expect(width - lane).toBeGreaterThanOrEqual(50)
      }
    }
  })

  test('sem bug e sem raio no ar não há faixa', () => {
    expect(laneColumns({ bugs: [], cero: null }, 110)).toBe(0)
    expect(laneColumns({ bugs: bugs(1), cero: null }, 20)).toBe(0)
  })
})

describe('o painel', () => {
  test('desenha em todas as superfícies, com os cinco botões e a lista de bugs', WITH, async ($, on) => {
    const w = world(on)
    await start($)
    w.outcomes.set('make test', 'fail')
    await $.tool.call({ tool: 'Bash', command: 'make test' })
    for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
      const ui = await $.ui.mount({ ...PANE, surface })
      const buttons = await ui.findAll({ type: 'Button' })
      expect(buttons.map((b) => b.key)).toEqual(['pet', 'feed', 'cero', 'sleep', 'hide'])
      expect(await ui.find({ type: 'Text', text: /make test/ })).toBeDefined()
      await ui.unmount()
    }
  })

  test('os botões fazem o que dizem', WITH, async ($, on) => {
    const w = world(on)
    await start($)
    for (const surface of ['terminal', 'desktop'] as const) {
      await say($, 'reset')
      const ui = await $.ui.mount({ ...PANE, surface })
      await ui.press({ key: 'pet' })
      expect((await peek($))?.bond).toBe(1)
      await ui.press({ key: 'feed' })
      expect((await peek($))?.bond).toBe(3)
      await ui.press({ key: 'sleep' })
      expect((await peek($))?.pose).toBe('sleep')
      expect((await ui.find({ type: 'Button', key: 'sleep' }))?.props.label).toBe(WORDS.pt.ui.wake)
      await ui.press({ key: 'sleep' })
      expect((await peek($))?.pose).toBe('')
      await ui.press({ key: 'cero' })
      expect((await peek($))?.cero).not.toBeNull()
      await w.clock.advance(2_000)
      await ui.press({ key: 'hide' })
      expect((await peek($))?.hidden).toBe(true)
      await ui.unmount()
    }
  })

  test('num painel estreito o texto sobe e a faixa de bugs fica com todo o espaço ao lado do bicho', WITH, async ($, on) => {
    const w = world(on)
    await start($)
    for (const command of ['npm test', 'make test', 'cargo test', 'tsc']) w.outcomes.set(command, 'fail')
    for (const command of ['npm test', 'make test', 'cargo test']) await $.tool.call({ tool: 'Bash', command })
    for (const columns of [40, 46, 60]) {
      const ui = await $.ui.mount({ ...PANE, surface: 'terminal', props: { ...PANE.props, bodyColumns: columns } })
      const lane = await ui.find({ type: 'Raster', key: 'lane' })
      const pet = await ui.find({ type: 'Raster', key: 'pet' })
      expect(Number(lane?.props.columns) + Number(pet?.props.columns) + 3).toBeLessThanOrEqual(columns)
      expect(Number(lane?.props.columns)).toBeGreaterThanOrEqual(10)
      expect(await ui.find({ type: 'Text', text: 'Hollowzinho' })).toBeDefined()
      expect(await ui.findAll({ type: 'Button' })).toHaveLength(5)
      await ui.unmount()
    }
  })

  test('num painel largo o texto fica ao lado, numa coluna que nunca é menor que 16', WITH, async ($, on) => {
    const w = world(on)
    await start($)
    w.outcomes.set('npm test', 'fail')
    await $.tool.call({ tool: 'Bash', command: 'npm test' })
    const ui = await $.ui.mount({ ...PANE, surface: 'terminal', props: { ...PANE.props, bodyColumns: 100 } })
    const lane = await ui.find({ type: 'Raster', key: 'lane' })
    const pet = await ui.find({ type: 'Raster', key: 'pet' })
    expect(Number(lane?.props.columns) + Number(pet?.props.columns) + 16 + 4).toBeLessThanOrEqual(100)
    await ui.unmount()
  })

  test('com o Cero no ar, a faixa de bugs do terminal muda a cada quadro', WITH, async ($, on) => {
    const w = world(on)
    await start($)
    w.outcomes.set('npm test', 'fail')
    await $.tool.call({ tool: 'Bash', command: 'npm test' })
    const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
    const before = String((await ui.find({ type: 'Raster', key: 'lane' }))?.props.cells)
    await ui.press({ key: 'cero' })
    await w.clock.advance(CERO_FRAME_MS * 3)
    const during = String((await ui.find({ type: 'Raster', key: 'lane' }))?.props.cells)
    expect(during).not.toBe(before)
  })
})
