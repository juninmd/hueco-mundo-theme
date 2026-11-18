const stars = Array.from({ length: 60 }, (_, i) => {
  const x = (i * 263) % 1600
  const y = (i * 97) % 480
  const r = 0.8 + (i % 3) * 0.5
  return `<circle class="s" cx="${x}" cy="${y}" r="${r}" style="animation-delay:${(i % 9) * 0.7}s"/>`
}).join('')

const sand = Array.from({ length: 28 }, (_, i) => {
  const y = 520 + ((i * 53) % 340)
  const d = 14 + (i % 7) * 4
  return `<circle class="p" cx="-20" cy="${y}" r="${1 + (i % 3)}" style="animation-duration:${d}s;animation-delay:-${(i * 1.3) % d}s"/>`
}).join('')

export type Variant = 'lua' | 'cero'

const PALETTE = {
  lua: { moon: '#eaf3ff', halo: '#cfe6ff', sky: '#16213a', glow: '' },
  cero: { moon: '#ffd9de', halo: '#e0455a', sky: '#2a1020', glow: '<ellipse cx="800" cy="700" rx="900" ry="140" fill="#e0455a" opacity=".16"/>' },
} as const

export const sceneOf = (variant: Variant): string => {
  const c = PALETTE[variant]
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
<style>
.s{fill:#dfe9f5;opacity:.5;animation:tw 6s ease-in-out infinite}
@keyframes tw{0%,100%{opacity:.15}50%{opacity:.85}}
.p{fill:#aebdd0;opacity:.35;animation-name:drift;animation-timing-function:linear;animation-iteration-count:infinite}
@keyframes drift{from{transform:translate(0,0)}to{transform:translate(1700px,-60px)}}
.m{animation:glow 9s ease-in-out infinite}
@keyframes glow{0%,100%{opacity:.88}50%{opacity:1}}
.h{animation:sway 18s ease-in-out infinite;transform-origin:50% 100%}
@keyframes sway{0%,100%{transform:translateX(0)}50%{transform:translateX(-14px)}}
@media (prefers-reduced-motion: reduce){.s,.p,.m,.h{animation:none}}
</style>
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05070c"/><stop offset=".6" stop-color="#0b1220"/><stop offset="1" stop-color="${c.sky}"/></linearGradient>
<radialGradient id="halo"><stop offset="0" stop-color="${c.halo}" stop-opacity=".35"/><stop offset="1" stop-color="${c.halo}" stop-opacity="0"/></radialGradient>
</defs>
<rect width="1600" height="900" fill="url(#sky)"/>
${stars}
<g class="m">
<circle cx="1180" cy="210" r="260" fill="url(#halo)"/>
<path d="M1180 120a95 95 0 1 0 0 180a75 90 0 1 1 0-180z" fill="${c.moon}"/>
</g>
${c.glow}
<g class="h" fill="#0d1424"><path d="M0 560h120v-60h40v60h90v-90h30v90h140v-40h50v40h110v-70h30v70h200v50H0z"/></g>
<path d="M0 640q300-70 640-20t620-30q200-15 340 25v285H0z" fill="#101a2c"/>
<path d="M0 760q420-90 860-30t740-20v190H0z" fill="#0a111e"/>
<g stroke="#05080f" stroke-width="7" stroke-linecap="round" fill="none">
<path d="M260 800v-170M260 700l-50-60M260 670l45-50"/>
<path d="M1380 790v-210M1380 680l-60-70M1380 640l55-55M1380 600l-20-45"/>
</g>
${sand}
</svg>`
}
