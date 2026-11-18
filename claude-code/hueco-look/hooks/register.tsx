import type { Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { sceneOf, type Variant } from './scene.js'

// Hueco Mundo: bone-white sand, black-blue night, cero red as danger.
const { theme, problems } = makeColors({
  label: 'Hueco Mundo',
  roles: { accent: '#8fd3ff', danger: '#e0455a', success: '#7fd1b0', warning: '#e6c36a', pro: '#b79cff' },
  only: 'dark',
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0b0e14',
        'surface-1': '#10151d',
        'surface-2': '#151b26',
        'surface-3': '#1a2230',
        'text-primary': '#e8eef5',
        'text-secondary': '#b9c4d2',
        'text-muted': '#8e9aab',
      },
    },
  },
})

const LOOK: ThemeSetArgs = {
  colors: theme,
  backdrop: { scene: 'hueco-mundo', glass: { blur: 6, tint: '#0b0e14', opacity: 0.55 } },
}

export const register: Register = (on, options) => {
  const variant: Variant = options.variant === 'cero' ? 'cero' : 'lua'
  on('session.start', async ($, e, next) => {
    const bad = problems.find(l => l.startsWith("Desktop won't paint"))
    if (bad !== undefined) $.ui.toast(bad)
    const set = await $.theme.set(LOOK)
    if (!set.isDrawn) $.ui.status(set.reason)
    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') return next(e)
    const { Svg } = $.ui.resolve(e)
    return <Svg source={sceneOf(variant)} alt="Hueco Mundo: crescent moon over endless white sand" isInteractive />
  })
}
