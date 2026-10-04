// A arte do terminal: o Hollowzinho em pixel art, desenhado em tempo de execução e empacotado em meias-células.
// Cada célula do terminal mostra dois pixels, um sobre o outro (▀ com a cor da frente no de cima e a de fundo no de baixo),
// então 12×10 pixels ocupam 12 colunas por 5 linhas. O fundo é sempre o do terminal, para servir a qualquer tema.
// Sem imports: dá para rodar este arquivo direto no Node para espiar os quadros (veja scripts/claude-plugin-preview.mjs).

import type { HollowFace } from '../types'

export type Tint = 'cero' | 'reishi' | 'ouro'
export type Grid = readonly string[]

/** Sem cor: o terminal escolhe (0x01000000, o bit 24 sozinho). */
export const DEFAULT = 0x01000000
const CLEAR = -1

// As cores são da paleta de 256 do xterm (os níveis 0, 95, 135, 175, 215 e 255 e a rampa de cinzas): o Claude Code leva
// cada célula do Raster à cor mais próxima dessa paleta, e com estas o desenho sai igual em qualquer terminal.
const BASE: Readonly<Record<string, number>> = {
  W: 0xffffd7, // osso
  w: 0xd7d7af, // sombra do osso
  d: 0x87875f, // contorno
  K: 0x080808, // preto das órbitas e da boca
  B: 0x1c1c1c, // corpo
  b: 0x3a3a3a, // braços
  C: 0x5f5f87, // borda clara do corpo
  G: 0xffaf00, // íris
  O: 0xd78700, // íris, sombra
  H: 0xffffff, // brilho
  S: 0x87d7ff, // suor e lágrima
  P: 0xff87af, // bochecha
  Z: 0xd7d7ff, // o Z do sono
  A: 0xffd75f, // bug dourado
  Y: 0xffffaf, // bug dourado, brilho
  E: 0xffafaf, // clarão do Cero
  L: 0xffffff, // miolo do raio
}

const TINTS: Readonly<Record<Tint, { R: number; r: number; D: number }>> = {
  cero: { R: 0xd7005f, r: 0xff5f5f, D: 0xaf0000 },
  reishi: { R: 0x00af5f, r: 0x5fff87, D: 0x00875f },
  ouro: { R: 0xaf8700, r: 0xffd75f, D: 0x875f00 },
}

export function palette(tint: Tint): Readonly<Record<string, number>> {
  return { ...BASE, ...(TINTS[tint] ?? TINTS.cero) }
}

/* ───────────────────────── tela de pixels ───────────────────────── */

export class Canvas {
  readonly width: number
  readonly height: number
  readonly px: Int32Array

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
    this.px = new Int32Array(width * height).fill(CLEAR)
  }

  set(x: number, y: number, color: number): void {
    if (x >= 0 && y >= 0 && x < this.width && y < this.height) this.px[y * this.width + x] = color
  }

  get(x: number, y: number): number {
    return x >= 0 && y >= 0 && x < this.width && y < this.height ? (this.px[y * this.width + x] ?? CLEAR) : CLEAR
  }

  rect(x0: number, y0: number, x1: number, y1: number, color: number): void {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, color)
  }

  /** Cola uma grade de letras na posição dada; `.` e espaço são transparentes. */
  blit(grid: Grid, x: number, y: number, pal: Readonly<Record<string, number>>): void {
    grid.forEach((row, dy) => {
      for (let dx = 0; dx < row.length; dx++) {
        const c = pal[row[dx] ?? '.']
        if (c !== undefined) this.set(x + dx, y + dy, c)
      }
    })
  }
}

/* ───────────────────────── montar grades por camadas ───────────────────────── */

type Draft = string[][]
const draft = (w: number, h: number): Draft => Array.from({ length: h }, () => Array<string>(w).fill('.'))
const put = (g: Draft, x: number, y: number, c: string): void => {
  const row = g[y]
  if (row && x >= 0 && x < row.length) row[x] = c
}
const fill = (g: Draft, x0: number, y0: number, x1: number, y1: number, c: string): void => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(g, x, y, c)
}
const rows = (g: Draft): Grid => g.map((r) => r.join(''))

/** Contorna uma silhueta: o que encosta no vazio vira `d`. */
function outline(g: Draft): Draft {
  const h = g.length
  const w = g[0]?.length ?? 0
  const solid = (x: number, y: number): boolean => (g[y]?.[x] ?? '.') !== '.'
  const out = draft(w, h)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!solid(x, y)) continue
      const edge = !solid(x + 1, y) || !solid(x - 1, y) || !solid(x, y + 1) || !solid(x, y - 1)
      put(out, x, y, edge ? 'd' : (g[y]?.[x] ?? 'W'))
    }
  return out
}

/* ───────────────────────── o rosto da faixa: 12×10 ───────────────────────── */

export const AVATAR_W = 12
export const AVATAR_H = 10

function avatarBase(stage: 1 | 2 | 3): Draft {
  const g = draft(AVATAR_W, AVATAR_H)
  const head: ReadonlyArray<readonly [number, number, number]> = [
    [1, 3, 8], [2, 1, 10], [3, 0, 11], [4, 0, 11], [5, 0, 11], [6, 0, 11], [7, 0, 11], [8, 1, 10], [9, 3, 8],
  ]
  for (const [y, a, b] of head) fill(g, a, y, b, y, 'W')
  const o = outline(g)
  put(o, 3, 0, 'd'); put(o, 4, 0, 'd'); put(o, 2, 1, 'd'); put(o, 3, 1, 'W'); put(o, 4, 1, 'd')
  fill(o, 5, 1, 6, 4, 'R')
  put(o, 1, 8, 'R'); put(o, 10, 8, 'R')
  if (stage >= 2) { put(o, 8, 0, 'd'); put(o, 9, 0, 'd'); put(o, 9, 1, 'd'); put(o, 8, 1, 'W') }
  if (stage >= 3) { put(o, 5, 0, 'd'); put(o, 6, 0, 'd'); put(o, 5, 1, 'R'); put(o, 6, 1, 'R') }
  return o
}

const aEye = (g: Draft, x: number, top: number): void => {
  fill(g, x, top, x + 2, top + 3, 'K'); put(g, x, top + 1, 'H'); put(g, x + 1, top + 1, 'G'); put(g, x + 1, top + 2, 'G'); put(g, x + 2, top + 2, 'O')
}
const aEyes = (g: Draft, top = 3): void => { aEye(g, 1, top); aEye(g, 8, top) }
const aMouth = (g: Draft): void => { fill(g, 3, 8, 8, 8, 'K'); put(g, 4, 8, 'W'); put(g, 6, 8, 'W'); put(g, 8, 8, 'W') }
const aClosed = (g: Draft): void => { fill(g, 1, 5, 3, 5, 'K'); fill(g, 8, 5, 10, 5, 'K') }

const AVATAR_FACES: Readonly<Record<HollowFace, (g: Draft) => void>> = {
  idle: (g) => { aEyes(g); aMouth(g) },
  blink: (g) => { aClosed(g); aMouth(g) },
  happy: (g) => {
    for (const x of [1, 8]) { put(g, x + 1, 4, 'K'); put(g, x, 5, 'K'); put(g, x + 2, 5, 'K') }
    put(g, 1, 6, 'P'); put(g, 10, 6, 'P'); aMouth(g)
  },
  worried: (g) => {
    aEyes(g, 4); put(g, 1, 3, 'K'); put(g, 2, 2, 'K'); put(g, 10, 3, 'K'); put(g, 9, 2, 'K'); aMouth(g); put(g, 11, 1, 'S'); put(g, 11, 2, 'S')
  },
  sad: (g) => { aEyes(g, 4); fill(g, 1, 3, 3, 3, 'K'); fill(g, 8, 3, 10, 3, 'K'); aMouth(g); put(g, 0, 8, 'S'); put(g, 0, 9, 'S') },
  sleep: (g) => {
    aClosed(g); aMouth(g)
    for (const [x, y] of [[9, 0], [10, 0], [11, 0], [10, 1], [9, 2], [10, 2], [11, 2]] as const) put(g, x, y, 'Z')
  },
  scan: (g) => {
    aEyes(g)
    for (let y = 2; y <= 8; y++)
      for (let x = 7; x <= 11; x++) {
        const edge = y === 2 || y === 8 || x === 7 || x === 11
        const corner = (x === 7 || x === 11) && (y === 2 || y === 8)
        if (edge && !corner) put(g, x, y, 'r')
      }
    aMouth(g)
  },
  alert: (g) => { aEyes(g, 2); aMouth(g); put(g, 11, 0, 'r'); put(g, 11, 1, 'r'); put(g, 11, 3, 'r') },
  fire: (g) => { aEyes(g, 4); fill(g, 1, 3, 3, 3, 'K'); fill(g, 8, 3, 10, 3, 'K'); fill(g, 4, 7, 7, 8, 'K'); put(g, 5, 8, 'r'); put(g, 6, 8, 'r') },
}

export function avatar(face: HollowFace, stage: 1 | 2 | 3 = 1): Grid {
  const g = avatarBase(stage)
  AVATAR_FACES[face](g)
  return rows(g)
}

/* ───────────────────────── a figura inteira: 16×16 ───────────────────────── */

export const BODY_W = 16
export const BODY_H = 16

function bodyBase(stage: 1 | 2 | 3): Draft {
  const g = draft(BODY_W, BODY_H)
  const head: ReadonlyArray<readonly [number, number, number]> = [
    [2, 5, 10], [3, 3, 12], [4, 2, 13], [5, 1, 14], [6, 1, 14], [7, 1, 14], [8, 1, 14], [9, 2, 13], [10, 3, 12], [11, 4, 11],
  ]
  for (const [y, a, b] of head) fill(g, a, y, b, y, 'W')
  const o = outline(g)
  for (let x = 5; x <= 10; x++) if (o[10]?.[x] === 'W') put(o, x, 10, 'w')
  for (const [x, y, c] of [[4, 0, 'd'], [5, 0, 'd'], [3, 1, 'd'], [4, 1, 'W'], [5, 1, 'd'], [6, 1, 'd'], [3, 2, 'd'], [4, 2, 'W']] as const) put(o, x, y, c)
  fill(o, 7, 3, 8, 6, 'R')
  fill(o, 2, 9, 2, 10, 'R'); fill(o, 13, 9, 13, 10, 'R')
  fill(o, 5, 12, 10, 15, 'B'); fill(o, 3, 12, 4, 14, 'b'); fill(o, 11, 12, 12, 14, 'b')
  for (const [x, y] of [[3, 12], [12, 12], [5, 12], [10, 12]] as const) put(o, x, y, 'C')
  for (const [x, y, c] of [[7, 13, 'R'], [8, 13, 'R'], [6, 14, 'R'], [9, 14, 'R'], [7, 14, 'K'], [8, 14, 'K'], [7, 15, 'R'], [8, 15, 'R'], [4, 15, 'W'], [11, 15, 'W']] as const) put(o, x, y, c)
  if (stage >= 2) { put(o, 10, 1, 'd'); put(o, 11, 1, 'd'); put(o, 11, 2, 'd'); put(o, 10, 2, 'W') }
  if (stage >= 3) { put(o, 7, 1, 'd'); put(o, 8, 1, 'd'); put(o, 7, 2, 'R'); put(o, 8, 2, 'R') }
  return o
}

const fEye = (g: Draft, x: number, top: number): void => {
  fill(g, x, top, x + 3, top + 3, 'K'); put(g, x + 1, top + 1, 'H'); put(g, x + 2, top + 1, 'G'); put(g, x + 1, top + 2, 'G'); put(g, x + 2, top + 2, 'O')
}
const fEyes = (g: Draft, top = 5): void => { fEye(g, 2, top); fEye(g, 10, top) }
const fMouth = (g: Draft): void => { fill(g, 4, 10, 11, 10, 'K'); for (const x of [5, 7, 9]) put(g, x, 10, 'W'); put(g, 4, 9, 'd'); put(g, 11, 9, 'd') }
const fClosed = (g: Draft): void => { fill(g, 2, 7, 5, 7, 'K'); fill(g, 10, 7, 13, 7, 'K') }

const BODY_FACES: Readonly<Record<HollowFace, (g: Draft) => void>> = {
  idle: (g) => { fEyes(g); fMouth(g) },
  blink: (g) => { fClosed(g); fMouth(g) },
  happy: (g) => {
    for (const x of [2, 10]) { put(g, x + 1, 6, 'K'); put(g, x + 2, 6, 'K'); put(g, x, 7, 'K'); put(g, x + 3, 7, 'K') }
    fill(g, 2, 8, 3, 8, 'P'); fill(g, 12, 8, 13, 8, 'P'); fMouth(g)
  },
  worried: (g) => {
    fEyes(g, 6); put(g, 2, 5, 'K'); put(g, 3, 4, 'K'); put(g, 13, 5, 'K'); put(g, 12, 4, 'K'); fMouth(g); put(g, 6, 10, 'K'); put(g, 9, 10, 'K')
    for (const y of [2, 3, 4]) put(g, 14, y, 'S')
    put(g, 13, 3, 'S')
  },
  sad: (g) => { fEyes(g, 6); fill(g, 2, 5, 3, 5, 'K'); fill(g, 12, 5, 13, 5, 'K'); fMouth(g); put(g, 1, 9, 'S'); put(g, 1, 10, 'S') },
  sleep: (g) => {
    fClosed(g); fMouth(g)
    for (const [x, y] of [[12, 0], [13, 0], [14, 0], [13, 1], [12, 2], [13, 2], [14, 2]] as const) put(g, x, y, 'Z')
  },
  scan: (g) => {
    fEyes(g)
    for (let y = 4; y <= 10; y++)
      for (let x = 9; x <= 14; x++) {
        const edge = y === 4 || y === 10 || x === 9 || x === 14
        const corner = (x === 9 || x === 14) && (y === 4 || y === 10)
        if (edge && !corner) put(g, x, y, 'r')
      }
    put(g, 15, 5, 'r'); fMouth(g)
  },
  alert: (g) => { fEyes(g, 4); fMouth(g); for (const y of [0, 1, 2, 4]) put(g, 15, y, 'r') },
  fire: (g) => {
    fEyes(g, 6); fill(g, 2, 5, 5, 5, 'K'); fill(g, 10, 5, 13, 5, 'K')
    fill(g, 5, 9, 10, 10, 'K'); put(g, 7, 10, 'r'); put(g, 8, 10, 'r'); put(g, 6, 9, 'W'); put(g, 9, 9, 'W')
  },
}

export function body(face: HollowFace, stage: 1 | 2 | 3 = 1): Grid {
  const g = bodyBase(stage)
  BODY_FACES[face](g)
  return rows(g)
}

/* ───────────────────────── bugs, raio e explosão ───────────────────────── */

export const BUG_W = 8
export const BUG_H = 6

/** O bug: um besouro vermelho; o chefe é dourado. `legs` alterna as perninhas para ele andar. */
export function bug(boss: boolean, legs = false): Grid {
  const g = draft(BUG_W, BUG_H)
  const shell = boss ? 'A' : 'R'
  const shine = boss ? 'Y' : 'r'
  const dark = boss ? 'O' : 'K'
  for (const [x, y] of [[1, 0], [6, 0], [2, 1], [5, 1]] as const) put(g, x, y, 'K')
  fill(g, 2, 2, 5, 4, shell); put(g, 1, 3, shell); put(g, 6, 3, shell); put(g, 3, 2, shine); put(g, 4, 2, shine)
  put(g, 3, 3, dark); put(g, 4, 3, dark); put(g, 2, 4, dark); put(g, 5, 4, dark)
  for (const x of legs ? [0, 2, 5, 7] : [1, 3, 4, 6]) put(g, x, 5, 'K')
  put(g, 0, 2, 'K'); put(g, 7, 2, 'K')
  return rows(g)
}

/** O bug que levou um raspão pisca em branco. */
export function bugHit(boss: boolean): Grid {
  return bug(boss).map((r) => r.replace(/[RrAYO]/g, 'H'))
}

export const BOOM_SIZE = 7

const BOOM: ReadonlyArray<Grid> = [
  ['.......', '.......', '..HHH..', '..HHH..', '..HHH..', '.......', '.......'],
  ['...H...', '.rHYHr.', '.HYAYH.', 'HYAHAYH', '.HYAYH.', '.rHYHr.', '...H...'],
  ['..r.r..', '.r.E.r.', 'r.....r', '.E...E.', 'r.....r', '.r.E.r.', '..r.r..'],
  ['.......', '..D.D..', '.......', '.D...D.', '.......', '..D.D..', '.......'],
]

export function boom(step: number): Grid {
  return BOOM[Math.min(BOOM.length - 1, Math.max(0, step))] ?? BOOM[0]!
}

/**
 * O raio, de `x0` a `x1` (inclusive) na altura `y`, que é o pixel de baixo do miolo. A espessura vai de 1 a 4:
 * 1 é um fio vermelho, 2 o miolo claro, 3 miolo mais a borda viva (quatro pixels) e 4 acrescenta a borda escura (seis).
 */
export function beam(c: Canvas, pal: Readonly<Record<string, number>>, x0: number, x1: number, y: number, level: number): void {
  if (level <= 0 || x1 < x0) return
  const L = pal.L ?? 0xffffff
  const r = pal.r ?? 0xff3b5c
  const D = pal.D ?? 0xa11236
  if (level === 1) return c.rect(x0, y, x1, y, r)
  c.rect(x0, y - 1, x1, y, L)
  if (level >= 3) { c.rect(x0, y - 2, x1, y - 2, r); c.rect(x0, y + 1, x1, y + 1, r) }
  if (level >= 4) { c.rect(x0, y - 3, x1, y - 3, D); c.rect(x0, y + 2, x1, y + 2, D) }
}

/* ───────────────────────── células do terminal ───────────────────────── */

const UPPER_HALF = 0x2580
const LOWER_HALF = 0x2584
const FULL = 0x2588

/** Empacota a tela em meias-células: o formato do `Raster` (code point, frente e fundo, em u32 little-endian, base64). */
export function toCells(c: Canvas): { columns: number; rows: number; cells: string } {
  const columns = c.width
  const rowsN = Math.ceil(c.height / 2)
  const bytes = new Uint8Array(columns * rowsN * 12)
  const view = new DataView(bytes.buffer)
  let o = 0
  for (let cy = 0; cy < rowsN; cy++)
    for (let x = 0; x < columns; x++) {
      const top = c.get(x, cy * 2)
      const bottom = c.get(x, cy * 2 + 1)
      let glyph = 0x20
      let fg = DEFAULT
      let bg = DEFAULT
      if (top !== CLEAR && bottom !== CLEAR) {
        if (top === bottom) { glyph = FULL; fg = top } else { glyph = UPPER_HALF; fg = top; bg = bottom }
      } else if (top !== CLEAR) { glyph = UPPER_HALF; fg = top }
      else if (bottom !== CLEAR) { glyph = LOWER_HALF; fg = bottom }
      view.setUint32(o, glyph, true); view.setUint32(o + 4, fg, true); view.setUint32(o + 8, bg, true)
      o += 12
    }
  return { columns, rows: rowsN, cells: base64(bytes) }
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/** Base64 padrão, à mão: o ambiente dos plugins não tem `Buffer`. */
export function base64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0
    const b = bytes[i + 1] ?? 0
    const d = bytes[i + 2] ?? 0
    out += B64[a >> 2]! + B64[((a & 3) << 4) | (b >> 4)]!
    out += i + 1 < bytes.length ? B64[((b & 15) << 2) | (d >> 6)]! : '='
    out += i + 2 < bytes.length ? B64[d & 63]! : '='
  }
  return out
}

/** O contrário, para os testes e para a prévia: lê as células de volta como `[glifo, frente, fundo]`. */
export function fromCells(cells: string): Array<[number, number, number]> {
  const clean = cells.replace(/=+$/, '')
  const bytes: number[] = []
  let bits = 0
  let acc = 0
  for (const ch of clean) {
    acc = (acc << 6) | B64.indexOf(ch)
    bits += 6
    if (bits >= 8) { bits -= 8; bytes.push((acc >> bits) & 255) }
  }
  const view = new DataView(new Uint8Array(bytes).buffer)
  const out: Array<[number, number, number]> = []
  for (let o = 0; o + 12 <= bytes.length; o += 12) out.push([view.getUint32(o, true), view.getUint32(o + 4, true), view.getUint32(o + 8, true)])
  return out
}
