import { expect, test } from 'claude-code/testing'

test('the backdrop scene draws an Svg on desktop and mobile', async $ => {
  for (const surface of ['desktop', 'mobile'] as const) {
    const ui = await $.ui.mount({ plugin: 'hueco-look', surface, component: 'Backdrop', props: { scene: 'hueco-mundo' } })
    expect(await ui.find({ type: 'Svg' })).toBeDefined()
    await ui.unmount()
  }
})
