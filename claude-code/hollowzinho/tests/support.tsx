// O que os testes e a prévia têm em comum: o mundo por baixo do plugin (relógio, armazém, ambiente e as respostas do
// motor), um plugin que espia o estado e as props de cada lugar onde o plugin desenha.
import { mock, type Engine, type Plugin } from 'claude-code/testing'
import type { On } from 'claude-code'

import type { Hollow } from '../types'

export const T0 = 1_700_000_000_000
export const CERO_FRAME_MS = 90

export const BAND = {
  plugin: 'hollowzinho',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 12, bodyColumns: 110, scroll: { offset: 0, bodyRows: 12 }, view: {} },
  viewport: { columns: 110, rows: 40, isFullscreen: false },
} as const

export const PANE = {
  plugin: 'hollowzinho',
  component: 'Pane',
  requestId: 'hollowzinho',
  props: { title: 'Hollowzinho', isFocused: true, bodyColumns: 80, placement: 'inline', scroll: { offset: 0, bodyRows: 20 }, view: {} },
  viewport: { columns: 110, rows: 40, isFullscreen: false },
} as const

/**
 * Um plugin de teste que espia o estado do bicho: o `$` do teste não lê `$.state`, mas qualquer plugin lê.
 * O `register` de um plugin inline não enxerga nada do arquivo, então tudo o que ele usa está dentro dele.
 */
export const WITH: { readonly plugins: readonly Plugin[] } = {
  plugins: [
    {
      name: 'probe',
      register: (on) => {
        on('command.run', { command: 'probe' }, async ($, e) => {
          if (e.args === 'state') return { text: JSON.stringify((await $.state.get({ plugin: 'hollowzinho', key: 'pet' })).value ?? null) }
          if (e.args === 'saved') return { text: JSON.stringify((await $.store.get('pet')) ?? null) }
          await $.store.set('pet', JSON.parse(e.args))
          return { text: 'ok' }
        })
      },
    },
  ],
}

export const probe = async ($: Engine, args: string): Promise<string> => String((await $.command.run({ command: 'probe', args } as never)).text)
export const peek = async ($: Engine): Promise<Hollow | null> => JSON.parse(await probe($, 'state')) as Hollow | null

export type Outcome = 'ok' | 'fail' | 'deny'

/** O mundo por baixo do plugin: o relógio, o armazém, o ambiente e as respostas do motor. */
export function world(on: On, env: Record<string, string> = { LANG: 'pt_BR.UTF-8' }) {
  const clock = mock.clock(on, { now: T0 })
  mock.store(on)
  mock.env(on, env)
  const outcomes = new Map<string, Outcome>()
  const git = new Map<string, unknown>()
  const stdout = new Map<string, string>()
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.end', (_$, e) => ({ sessionId: e.sessionId }))
  on('command.register', () => ({ value: { command: 'hollowzinho' } }) as never)
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('tool.call', (_$, e) => {
    const command = 'command' in e ? String(e.command) : ''
    const outcome = outcomes.get(command) ?? 'ok'
    if (outcome === 'deny') return { deny: 'não pode' }
    if (outcome === 'fail') return { isError: true, result: 'Exit code 1', text: 'Exit code 1' } as never
    return { result: { stdout: stdout.get(command) ?? '', stderr: '', interrupted: false, gitOperation: git.get(command) }, text: '' } as never
  })
  // Quando o plugin se cala (`next(e)`), é o motor quem desenha.
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return Text({ children: 'desenho do motor' })
  })
  return { clock, outcomes, git, stdout }
}

export const start = ($: Engine) => $.session.start({ cwd: '/work', surface: 'terminal', isInteractive: true })
export const say = async ($: Engine, args: string) => String((await $.command.run({ command: 'hollowzinho', args } as never)).text)

