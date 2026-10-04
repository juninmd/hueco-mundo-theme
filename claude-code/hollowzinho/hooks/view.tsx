// Atenção: `h` e `Fragment` são a fábrica do JSX, globais do ambiente: nada neste arquivo pode se chamar assim.
// O que o Hollowzinho desenha: a faixa acima do prompt e o painel, no terminal (pixel art em `Raster`) e nas telas
// remotas (SVG em `Svg`: desktop, celular e VS Code). Aqui só se monta a árvore: o estado vem pronto do pet.ts.

import type { Elements, RenderElement } from 'claude-code'

import type { Hollow, HollowBug, HollowFace } from '../types'
import { LANE_H, LANE_SLOT, laneSvg, petSvg } from './art'
import { CERO_FRAMES, CERO_HIT, MAX_VISIBLE_BUGS, faceOf, isBoss, stageName, stageOf, type Action } from './pet'
import { AVATAR_H, AVATAR_W, BODY_H, BODY_W, BUG_H, BUG_W, Canvas, avatar, beam, body, boom, bug, bugHit, palette, toCells, type Tint } from './sprite'
import { WORDS, type Lang } from './text'

type Term = Elements['terminal']
type Remote = Pick<Elements['desktop'], 'Box' | 'Text' | 'Button' | 'Svg'>

export type Look = { name: string; lang: Lang; tint: Tint }
export type Handlers = { act: (action: Action) => void }

const ACCENT: Readonly<Record<Tint, string>> = { cero: '#e11d48', reishi: '#16a34a', ouro: '#d97706' }
const GOLD = '#d97706'
const OK = '#22c55e'
const WARN = '#f59e0b'

/** Um rosto de texto para a linha de status, para quem prefere o bicho bem pequeno. */
const KAOMOJI: Readonly<Record<HollowFace, string>> = {
  idle: '(•_•)',
  blink: '(-_-)',
  happy: '(^‿^)',
  worried: '(°_°;)',
  sad: '(;_;)',
  sleep: '(-_-) zZ',
  scan: '(⌐■_■)',
  alert: '(°o°)!',
  fire: '(>o<)━━',
}

export function statusText(p: Hollow, look: Look): string {
  const w = WORDS[look.lang].ui
  const bugs = p.bugs.length > 0 ? ` · ${p.bugs.length} bug${p.bugs.length > 1 ? 's' : ''}` : ''
  return `${KAOMOJI[faceOf(p)]} ${look.name} · ♥ ${p.bond} · ${w.reiatsu} ${Math.round(p.reiatsu)}${bugs}`
}

/** A barra do reiatsu: `█` cheio e `░` vazio. */
export function meter(value: number, cells = 8): string {
  const on = Math.max(0, Math.min(cells, Math.round((value / 100) * cells)))
  return '█'.repeat(on) + '░'.repeat(cells - on)
}

/* ───────────────────────── a faixa de bugs do terminal ─────────────────────────
 * Como no VS Code, o bicho fica à direita e os bugs vêm do lado esquerdo, andando até ele: a vaga 0 é a mais perto do pet.
 * A faixa encosta no pet, então o raio sai da boca dele e cruza a faixa até o alvo, sem nada no meio. */

const SLOT = BUG_W + 2

/** Quantos bugs cabem numa faixa de `cols` colunas. */
function fits(cols: number): number {
  return Math.max(0, Math.min(MAX_VISIBLE_BUGS, Math.floor(cols / SLOT)))
}

/** O que a coluna de texto precisa para a linha do reiatsu não quebrar: `██████░░ reiatsu 100 ♥ 99 ✦ 99`. */
const TEXT_MIN = 30

/**
 * A largura da faixa de bugs: zero quando não há o que mostrar, nem raio no ar. Ela ocupa no máximo `share` de `width` e
 * deixa `reserve` colunas para o resto (o bicho, a coluna de texto), de modo que o texto nunca é espremido por ela.
 */
export function laneColumns(p: Pick<Hollow, 'bugs' | 'cero'>, width: number, share = 0.45, reserve = 0): number {
  const n = Math.min(p.bugs.length, MAX_VISIBLE_BUGS)
  if (n === 0 && !p.cero) return 0
  const want = Math.max(n * SLOT, p.cero ? 30 : 0)
  const cap = Math.max(0, Math.min(Math.floor(width * share), width - reserve))
  return Math.min(want, cap) >= SLOT ? Math.min(want, cap) : 0
}

type LaneGeometry = { px: number; bugY: number; beamY: number }

/** O raio fica mais grosso no instante do acerto e afina até sumir. */
const levelAt = (frame: number): number => (frame < CERO_HIT ? 3 : frame <= CERO_HIT + 1 ? 4 : frame === CERO_HIT + 2 ? 3 : frame === CERO_HIT + 3 ? 2 : 1)

/** A faixa dos bugs: bichinhos andando até o pet, o raio do Cero a caminho do alvo e a explosão no acerto. */
export function laneCells(p: Pick<Hollow, 'bugs' | 'cero'>, cols: number, tint: Tint, g: LaneGeometry): { columns: number; rows: number; cells: string } {
  const pal = palette(tint)
  const c = new Canvas(cols, g.px)
  const shown = p.bugs.slice(0, fits(cols))
  const cero = p.cero
  const left = (i: number): number => cols - 2 - BUG_W - i * SLOT
  const slot = cero ? (cero.slot ?? -1) : -1
  shown.forEach((b, i) => {
    if (cero?.kill && cero.target === b.id && cero.frame > CERO_HIT) return
    const flash = !!b.hit || (cero?.target === b.id && cero.frame === CERO_HIT)
    c.blit(flash ? bugHit(isBoss(b)) : bug(isBoss(b), ((cero?.frame ?? 0) + i) % 2 === 1), left(i), g.bugY, pal)
  })
  if (cero && cero.frame < CERO_FRAMES - 1) {
    const aim = slot >= 0 ? left(slot) + BUG_W / 2 : 0
    const progress = Math.min(1, (cero.frame + 1) / (CERO_HIT + 1))
    const xa = Math.round(cols - 1 - (cols - 1 - aim) * progress)
    beam(c, pal, xa, cols - 1, g.beamY, levelAt(cero.frame))
    if (slot >= 0 && cero.frame >= CERO_HIT && cero.frame <= CERO_HIT + 3) c.blit(boom(cero.frame - CERO_HIT), aim - 3, g.beamY - 3, pal)
  }
  return toCells(c)
}

const BAND_LANE: LaneGeometry = { px: AVATAR_H, bugY: AVATAR_H - BUG_H, beamY: 6 }
const PANE_LANE: LaneGeometry = { px: BODY_H, bugY: 7, beamY: 10 }

function petCells(p: Hollow, tint: Tint, full: boolean): { columns: number; rows: number; cells: string } {
  const pal = palette(tint)
  const face = faceOf(p)
  const stage = stageOf(p.bond)
  const c = full ? new Canvas(BODY_W, BODY_H) : new Canvas(AVATAR_W, AVATAR_H)
  c.blit(full ? body(face, stage) : avatar(face, stage), 0, 0, pal)
  return toCells(c)
}

/* ───────────────────────── a faixa acima do prompt ───────────────────────── */

type Plain = Pick<Term, 'Box' | 'Text'>

const statsRow = (t: Plain, p: Hollow, look: Look): RenderElement => {
  const { Box, Text } = t
  const w = WORDS[look.lang].ui
  const hungry = p.reiatsu < 30
  return (
    <Box flexDirection="row" gap={1}>
      <Text color={hungry ? WARN : OK}>{meter(p.reiatsu)}</Text>
      <Text dimColor>{`${w.reiatsu} ${Math.round(p.reiatsu)}`}</Text>
      <Text color={ACCENT[look.tint]}>{`♥ ${p.bond}`}</Text>
      <Text dimColor>{`✦ ${p.hunted}`}</Text>
    </Box>
  )
}

export function terminalBand(t: Term, p: Hollow, look: Look, width: number): RenderElement {
  const { Box, Text, Raster } = t
  const pet = petCells(p, look.tint, false)
  const lane = laneColumns(p, width, 0.45, 2 + AVATAR_W + 2 + TEXT_MIN)
  const laneOn = lane >= SLOT && width >= 64
  const textW = Math.max(14, width - 2 - AVATAR_W - 1 - (laneOn ? lane + 1 : 0))
  const lanePx = laneOn ? laneCells(p, lane, look.tint, BAND_LANE) : null
  const w = WORDS[look.lang]
  const extra = p.bugs.length - (laneOn ? fits(lane) : 0)
  return (
    <Box flexDirection="row" gap={1} paddingX={1}>
      <Box flexDirection="column" width={textW} height={pet.rows} justifyContent="center">
        {p.say !== '' ? (
          <Box borderStyle="round" borderColor={ACCENT[look.tint]} paddingX={1} width={Math.min(textW, p.say.length + 4)}>
            <Text wrap="truncate-end">{p.say}</Text>
          </Box>
        ) : (
          <Box flexDirection="row" gap={1}>
            <Text bold>{look.name}</Text>
            <Text dimColor>{`· ${stageName(p.bond, look.lang)}`}</Text>
          </Box>
        )}
        {statsRow(t, p, look)}
        {extra > 0 ? <Text color={GOLD}>{`+${extra} bugs · ${w.ui.hunted} ${p.hunted}`}</Text> : null}
      </Box>
      {lanePx ? <Raster key="lane" columns={lanePx.columns} rows={lanePx.rows} cells={lanePx.cells} /> : null}
      <Raster key="pet" columns={pet.columns} rows={pet.rows} cells={pet.cells} />
    </Box>
  )
}

/** Quando nem a faixa cabe: uma linha só. */
export function terminalLine(t: Pick<Term, 'Box' | 'Text'>, p: Hollow, look: Look): RenderElement {
  const { Box, Text } = t
  return (
    <Box paddingX={1}>
      <Text wrap="truncate-end" dimColor>{p.say !== '' ? `${KAOMOJI[faceOf(p)]} ${p.say}` : statusText(p, look)}</Text>
    </Box>
  )
}

export function remoteBand(r: Remote, p: Hollow, look: Look): RenderElement {
  const { Box, Text, Svg } = r
  const face = faceOf(p)
  const shown = p.bugs.slice(0, MAX_VISIBLE_BUGS)
  const laneW = shown.length === 0 && !p.cero ? 0 : Math.max(shown.length * LANE_SLOT, p.cero ? 240 : 0)
  return (
    <Box flexDirection="row" alignItems="center" gap={2} paddingX={1}>
      <Box flexDirection="column" flexGrow={1}>
        <Text bold>{p.say !== '' ? p.say : `${look.name} · ${stageName(p.bond, look.lang)}`}</Text>
        {statsRow(r, p, look)}
      </Box>
      {laneW > 0 ? <Svg source={laneSvg(p, shown, laneW)} alt={`${p.bugs.length} bugs`} width={Math.round(laneW / 2)} height={LANE_H / 2} isInteractive /> : null}
      <Svg source={petSvg({ face, stage: stageOf(p.bond), tint: look.tint, crop: 'head' })} alt={`${look.name}: ${face}`} width={88} height={78} isInteractive />
    </Box>
  )
}

/* ───────────────────────── o painel ───────────────────────── */

const BUTTONS: ReadonlyArray<readonly [Action, 'pet' | 'feed' | 'cero' | 'sleep' | 'hide', string]> = [
  ['pet', 'pet', '1'],
  ['feed', 'feed', '2'],
  ['cero', 'cero', '3'],
  ['sleep', 'sleep', '4'],
  ['hide', 'hide', '5'],
]

function buttonLabel(look: Look, p: Hollow, key: 'pet' | 'feed' | 'cero' | 'sleep' | 'hide'): string {
  const ui = WORDS[look.lang].ui
  return key === 'sleep' && p.pose === 'sleep' ? ui.wake : ui[key]
}

function bugRows(t: Plain, p: Hollow, look: Look): RenderElement {
  const { Box, Text } = t
  const ui = WORDS[look.lang].ui
  return (
    <Box flexDirection="column">
      <Text bold>{ui.bugs}</Text>
      {p.bugs.length === 0 ? <Text dimColor>{ui.noBugs}</Text> : null}
      {p.bugs.map((b: HollowBug) => (
        <Box key={`bug:${b.id}`} flexDirection="row" gap={1}>
          <Text color={isBoss(b) ? GOLD : ACCENT[look.tint]}>●</Text>
          <Text>{b.label}</Text>
          <Text dimColor>{ui.times(b.fails)}</Text>
        </Box>
      ))}
    </Box>
  )
}

/** A partir desta largura o texto cabe ao lado da faixa e do bicho; num painel mais estreito ele sobe para uma fileira própria. */
const WIDE_PANE = 72

export function terminalPane(t: Term, p: Hollow, look: Look, width: number, handlers: Handlers): RenderElement {
  const { Box, Text, Raster, Button } = t
  const w = WORDS[look.lang]
  const pet = petCells(p, look.tint, true)
  const stacked = width < WIDE_PANE
  // O que sobra à esquerda do bicho. No painel estreito ele é todo da faixa, que encosta no bicho como na faixa de cima.
  const room = Math.max(0, width - 2 - BODY_W - 1)
  const lane = stacked ? laneColumns(p, room, 1) : laneColumns(p, width, 0.45, 2 + BODY_W + 2 + TEXT_MIN)
  const laneOn = lane >= SLOT
  const lanePx = laneOn ? laneCells(p, lane, look.tint, PANE_LANE) : null
  const side = stacked ? {} : { width: Math.max(16, width - 2 - BODY_W - 1 - (laneOn ? lane + 1 : 0)), height: pet.rows }
  const info = (
    <Box flexDirection="column" {...side}>
      <Box flexDirection="row" gap={1}>
        <Text bold>{look.name}</Text>
        <Text dimColor>{`· ${stageName(p.bond, look.lang)}`}</Text>
      </Box>
      <Text wrap="truncate-end">{p.say !== '' ? `“${p.say}”` : ' '}</Text>
      {statsRow(t, p, look)}
      <Text dimColor>{`${w.ui.bond} ${p.bond} · ${w.ui.hunted} ${p.hunted}`}</Text>
    </Box>
  )
  return (
    <Box flexDirection="column" gap={1} paddingX={1}>
      {stacked ? info : null}
      <Box flexDirection="row" gap={1} justifyContent={stacked ? 'flex-end' : 'flex-start'}>
        {stacked ? null : info}
        {lanePx ? <Raster key="lane" columns={lanePx.columns} rows={lanePx.rows} cells={lanePx.cells} /> : null}
        <Raster key="pet" columns={pet.columns} rows={pet.rows} cells={pet.cells} />
      </Box>
      <Box flexDirection="row" flexWrap="wrap" columnGap={1}>
        {BUTTONS.map(([action, key, hotkey]) => (
          <Button key={action} label={buttonLabel(look, p, key)} hotkey={hotkey} onPress={() => handlers.act(action === 'sleep' && p.pose === 'sleep' ? 'wake' : action)} />
        ))}
      </Box>
      {bugRows(t, p, look)}
      <Text dimColor wrap="wrap">{w.ui.paneHint}</Text>
    </Box>
  )
}

export function remotePane(r: Remote, p: Hollow, look: Look, handlers: Handlers): RenderElement {
  const { Box, Text, Button, Svg } = r
  const w = WORDS[look.lang]
  const face = faceOf(p)
  const shown = p.bugs.slice(0, MAX_VISIBLE_BUGS)
  const laneW = shown.length === 0 && !p.cero ? 0 : Math.max(shown.length * LANE_SLOT, p.cero ? 240 : 0)
  return (
    <Box flexDirection="column" gap={1} paddingX={1}>
      <Box flexDirection="row" alignItems="center" gap={2}>
        <Box flexDirection="column" flexGrow={1}>
          <Box flexDirection="row" gap={1}>
            <Text bold>{look.name}</Text>
            <Text dimColor>{`· ${stageName(p.bond, look.lang)}`}</Text>
          </Box>
          <Text>{p.say !== '' ? `“${p.say}”` : ' '}</Text>
          {statsRow(r, p, look)}
          <Text dimColor>{`${w.ui.bond} ${p.bond} · ${w.ui.hunted} ${p.hunted}`}</Text>
        </Box>
        {laneW > 0 ? <Svg source={laneSvg(p, shown, laneW)} alt={`${p.bugs.length} bugs`} width={Math.round(laneW / 2)} height={LANE_H / 2} isInteractive /> : null}
        <Svg source={petSvg({ face, stage: stageOf(p.bond), tint: look.tint, crop: 'full' })} alt={`${look.name}: ${face}`} width={150} height={150} isInteractive />
      </Box>
      <Box flexDirection="row" flexWrap="wrap" columnGap={1}>
        {BUTTONS.map(([action, key, hotkey]) => (
          <Button key={action} label={buttonLabel(look, p, key)} hotkey={hotkey} onPress={() => handlers.act(action === 'sleep' && p.pose === 'sleep' ? 'wake' : action)} />
        ))}
      </Box>
      {bugRows(r, p, look)}
      <Text dimColor>{w.ui.paneHint}</Text>
    </Box>
  )
}
