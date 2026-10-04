// A arte vetorial para o desktop, o celular e o VS Code (o elemento `Svg`): a mesma figura do <hollow-pet> da página,
// com as expressões escolhidas por atributos `data-*` na raiz do SVG, como o web component faz no shadow DOM.
// O terminal não tem `Svg`: lá a arte é o pixel art de sprite.ts.
// Se mudar a figura em pet/hollow-pet.js, mude aqui também (scripts/claude-plugin-test.mjs confere os trechos principais).

import type { Hollow, HollowBug, HollowFace } from '../types'
import { CERO_FRAMES, CERO_HIT, isBoss } from './pet'
import type { Tint } from './sprite'

const HEAD = 'M80 22C106 22 128 38 128 62C128 82 118 97 104 103C96 106.5 88 108 80 108C72 108 64 106.5 56 103C42 97 32 82 32 62C32 38 54 22 80 22Z'

const f1 = (n: number): string => n.toFixed(1)

/** Dentes ao longo de uma curva quadrática, cada um girado pela tangente. */
function teethAlong(n: number, p0: readonly [number, number], p1: readonly [number, number], p2: readonly [number, number], w: number, h: number, from = 0.1, to = 0.9): string {
  let out = ''
  for (let i = 0; i < n; i++) {
    const t = from + ((to - from) * i) / (n - 1)
    const x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0]
    const y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]
    const dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0])
    const dy = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1])
    const a = (Math.atan2(dy, dx) * 180) / Math.PI
    const k = 1 - Math.abs(t - 0.5) * 0.9
    const ww = w * (0.8 + 0.3 * k)
    const hh = h * (0.8 + 0.3 * k)
    out += `<rect x="${f1(x - ww / 2)}" y="${f1(y - 0.6)}" width="${f1(ww)}" height="${f1(hh)}" rx="1.5" transform="rotate(${f1(a)} ${f1(x)} ${f1(y)})"/>`
  }
  return out
}

/** Dentes de uma boca aberta (elipse), apontando para o centro. */
function teethRing(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number, w: number, h: number): string {
  let out = ''
  for (let i = 0; i < n; i++) {
    const a = a0 + ((a1 - a0) * i) / (n - 1)
    const r = (a * Math.PI) / 180
    const x = cx + rx * Math.cos(r)
    const y = cy + ry * Math.sin(r)
    out += `<rect x="${f1(x - w / 2)}" y="${f1(y - 0.8)}" width="${w}" height="${h}" rx="1.4" transform="rotate(${f1(a - 90)} ${f1(x)} ${f1(y)})"/>`
  }
  return out
}

const MOUTH_CLOSED = `<g class="mouth mouth-closed"><path d="M52 86Q80 104 108 86Q80 116 52 86Z" fill="#0a0a0e"/><g fill="url(#g-bone)" stroke="#8d8573" stroke-width=".5">${teethAlong(9, [52, 86], [80, 104], [108, 86], 4.6, 6)}</g></g>`
const MOUTH_OPEN = `<g class="mouth mouth-open"><ellipse cx="80" cy="94" rx="20" ry="11.5" fill="#0a0a0e"/><ellipse class="mouth-glow" cx="80" cy="95" rx="15" ry="8" fill="url(#g-mouth)"/><g fill="url(#g-bone)" stroke="#8d8573" stroke-width=".5">${teethRing(80, 94, 20, 11.5, 196, 344, 8, 4.6, 6.2)}</g><g fill="url(#g-bone)" stroke="#8d8573" stroke-width=".5">${teethRing(80, 94, 19, 10.5, 28, 152, 6, 3.8, 4.6)}</g></g>`

const eyeSocket = (cx: number, rot: number): string => `<ellipse cx="${cx}" cy="66" rx="11.5" ry="14.5" transform="rotate(${rot} ${cx} 66)"/>`

const TINT_VARS: Readonly<Record<Tint, string>> = {
  cero: '--aura:#e11d48;--mark-hi:#ff3b5c;--mark-lo:#a11236',
  reishi: '--aura:#4ade80;--mark-hi:#6ff0a0;--mark-lo:#1f9a52',
  ouro: '--aura:#fbbf24;--mark-hi:#ffd45e;--mark-lo:#b9770e',
}

// O mesmo CSS do web component, só o que a cena usa. A raiz do SVG leva os atributos `data-*` que escolhem a expressão.
const CSS = `
.art{overflow:visible}
.bob,.tail,.aura,.arm,.head,.eye,.horn,.legs{transform-box:view-box}
.bob{transform-origin:80px 148px;animation:breathe 3.6s ease-in-out infinite}
.aura{transform-origin:80px 100px;animation:aura 3.2s ease-in-out infinite}
.tail{transform-origin:108px 138px;animation:wag 2.8s ease-in-out infinite}
.arm-l{transform-origin:51px 112px}.arm-r{transform-origin:109px 112px}
.eye{transform-origin:80px 66px;animation:blink 5.2s infinite}
.eye-r{animation-delay:.02s}
.hole-ring{animation:ring 2.6s ease-in-out infinite}
.hole-glow{opacity:.65;animation:ring 2.6s ease-in-out infinite}
.eye-alt,.mouth-open,.blush,.mouth-glow,.show-2,.show-3,.sweat{opacity:0}
.visor{opacity:0}
[data-stage="2"] .show-2,[data-stage="3"] .show-2,[data-stage="3"] .show-3{opacity:1}
[data-stage="2"] .horn,[data-stage="3"] .horn{transform-origin:70px 29px;transform:scale(1.08)}
[data-stage="3"] .horn{transform:scale(1.28)}
[data-stage="2"] .horn-r,[data-stage="3"] .horn-r{transform-origin:100px 29px}
[data-stage="3"] .horn-r{transform:scale(1.35)}
[data-stage="3"] .crack,[data-stage="3"] .crack-2{stroke:#e11d48;filter:drop-shadow(0 0 1.2px #ff3b5c)}
[data-stage="3"] .aura{animation-duration:2.2s;transform:scale(1.12)}
[data-eyes="happy"] .eye{opacity:0}[data-eyes="happy"] .eye-happy{opacity:1}[data-eyes="happy"] .blush{opacity:.42}
[data-eyes="sleep"] .eye{opacity:0}[data-eyes="sleep"] .eye-sleep{opacity:1}
[data-mouth="open"] .mouth-closed{opacity:0}[data-mouth="open"] .mouth-open{opacity:1}
[data-glow="1"] .mouth-glow{opacity:1}
[data-glow="1"] .marks{filter:drop-shadow(0 0 2px var(--mark-hi,#ff3b5c)) drop-shadow(0 0 4px var(--mark-hi,#ff3b5c))}
[data-glow="1"] .hole-ring{stroke:#fff0f3}
[data-worried="1"] .sweat{opacity:1;animation:sweat 1.5s ease-in infinite}
[data-worried="1"] .pupil{transform-box:fill-box;transform-origin:center;transform:scale(.7)}
[data-worried="1"] .tail{animation-duration:.25s}
[data-worried="1"] .aura{opacity:.6}
[data-sleep="1"] .aura{opacity:.5}
[data-sleep="1"] .bob{animation:breathe-slow 4.8s ease-in-out infinite}
[data-sleep="1"] .tail{animation-duration:6s}
[data-pose="scan"] .visor{opacity:1}
[data-pose="scan"] .aura{animation-duration:1.7s}
[data-pose="alert"] .pupil{transform-box:fill-box;transform-origin:center;transform:scale(.6)}
[data-pose="alert"] .aura{opacity:1;transform:scale(1.15);animation:aura .35s ease-in-out infinite}
[data-pose="alert"] .tail{animation:none;transform:rotate(16deg)}
[data-pose="alert"] .arm-l{transform:rotate(30deg)}[data-pose="alert"] .arm-r{transform:rotate(-30deg)}
[data-pose="alert"] .bob{animation:startle .6s cubic-bezier(.2,0,0,1) 1}
[data-mood="happy"] .arm-l{transform:rotate(42deg)}[data-mood="happy"] .arm-r{transform:rotate(-42deg)}
[data-mood="happy"] .tail{animation-duration:.5s}
.scanline{animation:scan 1.6s linear infinite}
.visor-led{animation:led .9s steps(2) infinite}
.zz{font:700 20px ui-sans-serif,system-ui,sans-serif;fill:#cfd8ff;animation:zz 2.4s ease-in-out infinite}
@keyframes scan{0%{transform:translateY(0)}100%{transform:translateY(38px)}}
@keyframes led{0%{opacity:1}100%{opacity:.25}}
@keyframes startle{0%{transform:translateY(0) scale(1,1)}16%{transform:translateY(-15px) scale(.93,1.1) rotate(-3deg)}38%{transform:translateY(2px) scale(1.07,.92)}58%{transform:translateY(-4px) scale(.98,1.03)}100%{transform:translateY(0) scale(1,1)}}
@keyframes sweat{0%{transform:translateY(-3px);opacity:0}20%{opacity:1}80%{opacity:1}100%{transform:translateY(9px);opacity:0}}
@keyframes breathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.014,1.03)}}
@keyframes breathe-slow{0%,100%{transform:translateY(3px) scale(1.02,.96)}50%{transform:translateY(3px) scale(1.03,.99)}}
@keyframes blink{0%,92%,100%{transform:scaleY(1)}95.5%{transform:scaleY(.07)}}
@keyframes wag{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(9deg)}}
@keyframes aura{0%,100%{opacity:.8}50%{opacity:1}}
@keyframes ring{0%,100%{opacity:.75}50%{opacity:1}}
@keyframes zz{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-6px);opacity:1}}
`

export type PetArt = {
  face: HollowFace
  stage: 1 | 2 | 3
  tint: Tint
  /** Só a cabeça (a faixa) ou a figura inteira (o painel). */
  crop: 'head' | 'full'
}

/** O Hollowzinho em SVG, na expressão pedida. */
export function petSvg({ face, stage, tint, crop }: PetArt): string {
  const eyes = face === 'happy' ? 'happy' : face === 'sleep' || face === 'blink' ? 'sleep' : 'open'
  const attrs = [
    `data-stage="${stage}"`,
    `data-eyes="${eyes}"`,
    `data-mouth="${face === 'fire' ? 'open' : 'closed'}"`,
    `data-glow="${face === 'fire' ? 1 : 0}"`,
    `data-worried="${face === 'worried' || face === 'sad' ? 1 : 0}"`,
    `data-sleep="${face === 'sleep' ? 1 : 0}"`,
    `data-pose="${face === 'scan' ? 'scan' : face === 'alert' ? 'alert' : ''}"`,
    `data-mood="${face === 'happy' ? 'happy' : ''}"`,
  ].join(' ')
  const view = crop === 'head' ? '16 0 128 114' : '0 0 160 160'
  const eyeL = eyeSocket(58, 9)
  const eyeR = eyeSocket(102, -9)
  const badge =
    face === 'alert'
      ? '<g><circle cx="136" cy="22" r="14" fill="#e11d48" stroke="#fff" stroke-width="1.5"/><rect x="134" y="13" width="4" height="12" rx="2" fill="#fff"/><circle cx="136" cy="30" r="2.4" fill="#fff"/></g>'
      : face === 'sleep'
        ? '<g><text class="zz" x="118" y="30">z</text><text class="zz" x="130" y="16" style="animation-delay:.8s">Z</text></g>'
        : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" class="art" viewBox="${view}" ${attrs} style="${TINT_VARS[tint]};--gx:0;--gy:0">
<style>${CSS}</style>
<defs>
<radialGradient id="g-bone" gradientUnits="userSpaceOnUse" cx="64" cy="42" r="86"><stop offset="0" stop-color="#fffdf8"/><stop offset=".5" stop-color="#f1ebde"/><stop offset="1" stop-color="#c8bfa9"/></radialGradient>
<linearGradient id="g-chin" gradientUnits="userSpaceOnUse" x1="0" y1="72" x2="0" y2="110"><stop offset="0" stop-color="#8a8068" stop-opacity="0"/><stop offset="1" stop-color="#8a8068" stop-opacity=".5"/></linearGradient>
<linearGradient id="g-body" gradientUnits="userSpaceOnUse" x1="0" y1="98" x2="0" y2="152"><stop offset="0" stop-color="#2d2d3a"/><stop offset=".55" stop-color="#15151c"/><stop offset="1" stop-color="#09090d"/></linearGradient>
<radialGradient id="g-iris" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff2b0"/><stop offset=".55" stop-color="#fbbf24"/><stop offset="1" stop-color="#a8650a"/></radialGradient>
<linearGradient id="g-mark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--mark-hi)"/><stop offset="1" stop-color="var(--mark-lo)"/></linearGradient>
<radialGradient id="g-aura" cx=".5" cy=".55" r=".5"><stop offset="0" stop-color="var(--aura)" stop-opacity=".45"/><stop offset=".6" stop-color="var(--aura)" stop-opacity=".13"/><stop offset="1" stop-color="var(--aura)" stop-opacity="0"/></radialGradient>
<radialGradient id="g-mouth" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff0f3"/><stop offset=".45" stop-color="var(--mark-hi)"/><stop offset="1" stop-color="var(--mark-lo)" stop-opacity="0"/></radialGradient>
<filter id="f-glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.2"/></filter>
<filter id="f-soft" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="2.6"/></filter>
<clipPath id="c-head"><path d="${HEAD}"/></clipPath>
<clipPath id="c-eye-l">${eyeL}</clipPath>
<clipPath id="c-eye-r">${eyeR}</clipPath>
<clipPath id="c-visor"><ellipse cx="102" cy="66" rx="16" ry="18.5"/></clipPath>
<mask id="m-body"><rect width="160" height="160" fill="#fff"/><circle cx="80" cy="127" r="10.5" fill="#000"/></mask>
</defs>
<ellipse class="aura" cx="80" cy="96" rx="76" ry="70" fill="url(#g-aura)"/>
<ellipse cx="80" cy="153" rx="38" ry="6" fill="#000" opacity=".5" filter="url(#f-soft)"/>
<g class="tail"><path d="M108 138C128 141 143 129 141 111C140 104 143 98 150 99" fill="none" stroke="#14141b" stroke-width="8.5" stroke-linecap="round"/><path d="M144 96L158 97L148 106Z" fill="url(#g-bone)" stroke="#8d8573" stroke-width=".6" stroke-linejoin="round"/></g>
<g class="legs"><ellipse cx="63" cy="148" rx="13" ry="6.5" fill="#101017"/><ellipse cx="97" cy="148" rx="13" ry="6.5" fill="#101017"/><g fill="#e6dfcd"><path d="M53 150l-2 4.5 5.5-2.4zM58 152l-.5 5 4.5-3zM91 152l.5 5 4.5-3zM98 152.5l1 4.5 4-3.4z"/></g></g>
<g class="bob">
<g class="arm arm-l"><path d="M51 112C41 114 34 121 33 131" fill="none" stroke="#17171f" stroke-width="10" stroke-linecap="round"/><circle cx="33" cy="132" r="6.6" fill="#17171f"/><path d="M27 135l-1.6 6.4 4.6-3.2zM32 138l0 6.8 3.6-4.2zM37 136.5l2.2 5.6 2.4-4.8z" fill="#e6dfcd"/></g>
<g class="arm arm-r"><path d="M109 112C119 114 126 121 127 131" fill="none" stroke="#17171f" stroke-width="10" stroke-linecap="round"/><circle cx="127" cy="132" r="6.6" fill="#17171f"/><path d="M133 135l1.6 6.4-4.6-3.2zM128 138l0 6.8-3.6-4.2zM123 136.5l-2.2 5.6-2.4-4.8z" fill="#e6dfcd"/></g>
<g mask="url(#m-body)"><path d="M47 102C40 124 50 149 80 149C110 149 120 124 113 102Z" fill="url(#g-body)"/></g>
<circle class="hole-glow" cx="80" cy="127" r="10.5" fill="none" stroke="var(--aura)" stroke-width="3" filter="url(#f-glow)"/>
<circle class="hole-ring" cx="80" cy="127" r="10.5" fill="none" stroke="var(--mark-hi)" stroke-width="1.5"/>
<circle cx="80" cy="127" r="9.2" fill="none" stroke="#000" stroke-opacity=".55" stroke-width="2"/>
<g class="head">
<g class="show-2 horn-r"><path d="M100 30C102 21 106 15 111 9C101 12 92 19 90 29Z" fill="url(#g-bone)" stroke="#8d8573" stroke-width=".7" stroke-linejoin="round"/></g>
<g class="show-3 crest"><path d="M72 27C74 17 77.5 9 80 2C82.5 9 86 17 88 27Z" fill="url(#g-bone)" stroke="#8d8573" stroke-width=".7" stroke-linejoin="round"/></g>
<path class="horn" d="M60 30C57 19 57 10 52 2C66 6 77 15 77 29Z" fill="url(#g-bone)" stroke="#8d8573" stroke-width=".8" stroke-linejoin="round"/>
<g class="show-2 spikes"><path d="M33 78L21 84L31 91Z M127 78L139 84L129 91Z" fill="url(#g-bone)" stroke="#8d8573" stroke-width=".7" stroke-linejoin="round"/></g>
<path d="${HEAD}" fill="url(#g-bone)" stroke="#8d8573" stroke-width="1"/>
<g clip-path="url(#c-head)"><ellipse cx="62" cy="38" rx="30" ry="12" fill="#fff" opacity=".55" filter="url(#f-glow)"/><rect x="20" y="70" width="120" height="42" fill="url(#g-chin)"/><path class="crack" d="M96 22L90 36L99 44L92 58" fill="none" stroke="#2a2a33" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/><path class="crack crack-2 show-2" d="M44 40L52 47L46 56" fill="none" stroke="#2a2a33" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"/></g>
<g class="marks" fill="url(#g-mark)" clip-path="url(#c-head)"><path d="M49.5 79C46 86 45.5 93 48 101C50.4 94 52.6 87 54.6 80Z"/><path d="M110.5 79C114 86 114.5 93 112 101C109.6 94 107.4 87 105.4 80Z"/><path d="M78.5 23L81.5 23L80.7 48L79.3 48Z"/><path d="M49 36L62 45L60.4 47.2L47.6 38.4Z M111 36L98 45L99.6 47.2L112.4 38.4Z"/></g>
<path d="M77 81L83 81L80 87Z" fill="#1b1b22" opacity=".8" stroke="#1b1b22" stroke-width="1.6" stroke-linejoin="round"/>
<ellipse class="blush" cx="44" cy="84" rx="6.5" ry="3.4" fill="#ff3b5c"/><ellipse class="blush" cx="116" cy="84" rx="6.5" ry="3.4" fill="#ff3b5c"/>
<g class="sweat"><path d="M119 38C115 45 114.5 49.5 118 52C121.5 49.5 122 45 119 38Z" fill="#8ecdf5" stroke="#4d8fb8" stroke-width=".6"/><ellipse cx="117.2" cy="46.5" rx="1" ry="1.8" fill="#fff" opacity=".85"/></g>
<g class="eye eye-l"><g fill="#07070a">${eyeL}</g><g clip-path="url(#c-eye-l)"><g class="gaze"><circle cx="58" cy="67" r="9.4" fill="url(#g-iris)"/><ellipse class="pupil" cx="58" cy="67" rx="3.7" ry="5.8" fill="#0a0a0e"/><circle cx="54.2" cy="62.4" r="2.7" fill="#fff"/><circle cx="62.2" cy="71.8" r="1.3" fill="#fff" opacity=".85"/></g></g></g>
<g class="eye eye-r"><g fill="#07070a">${eyeR}</g><g clip-path="url(#c-eye-r)"><g class="gaze"><circle cx="102" cy="67" r="9.4" fill="url(#g-iris)"/><ellipse class="pupil" cx="102" cy="67" rx="3.7" ry="5.8" fill="#0a0a0e"/><circle cx="98.2" cy="62.4" r="2.7" fill="#fff"/><circle cx="106.2" cy="71.8" r="1.3" fill="#fff" opacity=".85"/></g></g></g>
<g class="eye-alt eye-happy" fill="none" stroke="#0a0a0e" stroke-width="4.6" stroke-linecap="round"><path d="M47 71Q58 57 69 71"/><path d="M91 71Q102 57 113 71"/></g>
<g class="eye-alt eye-sleep" fill="none" stroke="#0a0a0e" stroke-width="3.6" stroke-linecap="round"><path d="M47 65Q58 74 69 65"/><path d="M91 65Q102 74 113 65"/></g>
<g class="visor"><path d="M34 53C48 44 112 44 126 53L125.5 59.5C112 51.5 48 51.5 34.5 59.5Z" fill="#17171f" stroke="#050506" stroke-opacity=".6" stroke-width=".8" stroke-linejoin="round"/><ellipse cx="102" cy="66" rx="17.5" ry="20" fill="#e11d48" fill-opacity=".2" stroke="#15151c" stroke-width="3.4"/><ellipse cx="102" cy="66" rx="17.5" ry="20" fill="none" stroke="#ff5a78" stroke-width="1.1" stroke-opacity=".95"/><g clip-path="url(#c-visor)"><rect class="scanline" x="84" y="47" width="36" height="2.6" fill="#ffb3c1" opacity=".9"/></g><path d="M91 57C94 52 100 50 106 51" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.6" stroke-linecap="round"/><circle class="visor-led" cx="122" cy="62" r="2" fill="#ff3b5c"/></g>
${MOUTH_CLOSED}
${MOUTH_OPEN}
</g>
</g>
${badge}
</svg>`
}

/* ───────────────────────── a faixa dos bugs e do raio ───────────────────────── */

/** Largura de cada vaga de bug na faixa SVG, em unidades do viewBox. */
export const LANE_SLOT = 54
export const LANE_H = 96

function bugSvg(x: number, boss: boolean, hit: boolean, delay: number): string {
  const shell = hit ? '#ffffff' : boss ? '#fbbf24' : '#e11d48'
  const shine = hit ? '#ffffff' : boss ? '#fff2b0' : '#ff3b5c'
  const dark = boss ? '#a8650a' : '#0a0a0e'
  const glow = boss ? '<circle cx="21" cy="60" r="24" fill="#fbbf24" opacity=".22"/>' : ''
  return `<g transform="translate(${x} 0)">${glow}<g class="crawl" style="animation-delay:${delay}s">
<path d="M12 40L6 32M30 40L36 32" stroke="#0a0a0e" stroke-width="2.4" stroke-linecap="round"/>
<path d="M6 62L0 58M6 70L0 74M36 62L42 58M36 70L42 74M10 78L6 86M32 78L36 86" stroke="#0a0a0e" stroke-width="2.4" stroke-linecap="round"/>
<ellipse cx="21" cy="62" rx="15" ry="17" fill="${shell}" stroke="#0a0a0e" stroke-width="2"/>
<path d="M21 46V80" stroke="${dark}" stroke-width="2"/>
<ellipse cx="16" cy="55" rx="4" ry="5" fill="${shine}" opacity=".85"/>
<circle cx="27" cy="62" r="2.4" fill="${dark}"/><circle cx="15" cy="70" r="2.2" fill="${dark}"/><circle cx="27" cy="72" r="2" fill="${dark}"/>
<circle cx="21" cy="44" r="7" fill="#0a0a0e"/><circle cx="18.5" cy="42.5" r="1.8" fill="#fff"/><circle cx="24" cy="42.5" r="1.8" fill="#fff"/>
</g></g>`
}

function boomSvg(cx: number, cy: number, step: number): string {
  if (step === 0) return `<circle cx="${cx}" cy="${cy}" r="9" fill="#fff"/>`
  if (step === 1)
    return `<g><circle cx="${cx}" cy="${cy}" r="22" fill="#ff3b5c" opacity=".55"/><circle cx="${cx}" cy="${cy}" r="15" fill="#ffd45e"/><circle cx="${cx}" cy="${cy}" r="8" fill="#fff"/><path d="M${cx} ${cy - 30}V${cy + 30}M${cx - 30} ${cy}H${cx + 30}" stroke="#fff" stroke-width="3" stroke-linecap="round"/></g>`
  if (step === 2) return `<circle cx="${cx}" cy="${cy}" r="26" fill="none" stroke="#ff3b5c" stroke-width="3" stroke-dasharray="4 6"/>`
  return `<circle cx="${cx}" cy="${cy}" r="30" fill="none" stroke="#a11236" stroke-width="2" stroke-dasharray="2 10" opacity=".7"/>`
}

/** Onde fica o bug da vaga `i`, contando da direita (o lado do pet): a vaga 0 é a mais perto dele. */
const bugX = (width: number, i: number): number => width - (i + 1) * LANE_SLOT + 4

/**
 * A faixa dos bugs: os bichinhos andando até o pet (que fica à direita), o raio do Cero saindo da direita até o alvo
 * e a explosão quando acerta.
 */
export function laneSvg(p: Pick<Hollow, 'bugs' | 'cero'>, visible: readonly HollowBug[], width: number): string {
  const cero = p.cero
  const slot = cero && cero.slot !== undefined ? cero.slot : -1
  let beam = ''
  let boom = ''
  if (cero && cero.frame < CERO_FRAMES - 1) {
    const aim = slot >= 0 ? bugX(width, slot) + 21 : 0
    const grow = Math.min(1, (cero.frame + 1) / (CERO_HIT + 1))
    const len = Math.max(8, (width - aim) * grow)
    const thin = cero.frame <= CERO_HIT + 1 ? 1 : Math.max(0.15, 1 - (cero.frame - CERO_HIT - 1) / (CERO_FRAMES - CERO_HIT - 2))
    const h = 14 * thin
    const x = width - len
    beam = `<g><rect x="${x}" y="${60 - h * 1.4}" width="${len}" height="${h * 2.8}" rx="${h}" fill="#ff3b5c" opacity=".35" filter="url(#bf)"/><rect x="${x}" y="${60 - h / 2}" width="${len}" height="${h}" rx="${h / 2}" fill="url(#bg)"/><rect x="${x}" y="${60 - h / 5}" width="${len}" height="${(h * 2) / 5}" rx="${h / 5}" fill="#fff0f3"/></g>`
    if (slot >= 0 && cero.frame >= CERO_HIT && cero.frame <= CERO_HIT + 3) boom = boomSvg(aim, 58, cero.frame - CERO_HIT)
  }
  const bugs = visible
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => !(cero?.kill && cero.target === b.id && cero.frame > CERO_HIT))
    .map(({ b, i }) => bugSvg(bugX(width, i), isBoss(b), !!b.hit || (cero?.target === b.id && cero.frame === CERO_HIT), i * 0.35))
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${LANE_H}">
<style>@keyframes crawl{0%,100%{transform:translateX(0)}50%{transform:translateX(-3px)}}.crawl{animation:crawl 1.4s ease-in-out infinite}</style>
<defs><linearGradient id="bg" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#a11236"/><stop offset=".5" stop-color="#ff3b5c"/><stop offset="1" stop-color="#ffb3c1"/></linearGradient><filter id="bf" x="-10%" y="-100%" width="120%" height="300%"><feGaussianBlur stdDeviation="4"/></filter></defs>
${bugs}${beam}${boom}
</svg>`
}
