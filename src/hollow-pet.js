/*!
 * <hollow-pet> — o Hollowzinho, um pet de canto de tela para o tema Hueco Mundo.
 * Zero dependências, um arquivo só. Funciona por <script src> (inclusive em file://) e por import de efeito colateral.
 *
 *   <script src="hollow-pet.js"></script>
 *   <hollow-pet></hollow-pet>
 *
 * Atributos: corner (br|bl|tr|tl), size (px), name, lang (pt|en), tint (reishi|ouro),
 *            inline (não fixa na tela), static (sem vida própria), no-persist, shake (seletor que treme no Cero).
 * Métodos:   pet() feed() cero({x,y,power}) aim() sleep() wake() say(texto) dock(canto) reset() setStage(n) setStats({reiatsu,bond})
 * Sem HTML:  HollowPet.mount({ corner: "bl" })
 * Eventos:   hollow-pet:pet | feed | cero | sleep | wake | levelup  (detail: { stage, bond, reiatsu })
 */
(function () {
  "use strict";
  if (typeof window === "undefined" || typeof customElements === "undefined") return;
  if (customElements.get("hollow-pet")) return;

  /* ───────────────────────── dados ───────────────────────── */

  const STAGES = [
    { id: 1, at: 0, name: "Hollow" },
    { id: 2, at: 15, name: "Adjuchas" },
    { id: 3, at: 40, name: "Vasto Lorde" },
  ];

  const T = {
    pt: {
      region: "Hollowzinho, pet interativo",
      hit: "Acariciar o Hollowzinho. Segure para carregar um Cero.",
      actions: { pet: "Carinho", feed: "Alimentar", cero: "Cero", sleep: "Dormir", hide: "Esconder" },
      reiatsu: "Reiatsu",
      bond: "Vínculo",
      peek: "Chamar o Hollowzinho de volta",
      aim: "Escolha o alvo. Esc cancela.",
      hello: ["Cheguei! Tô de olho no seu código.", "Oi! Posso ficar no cantinho?"],
      idle: [
        "Tá quieto demais por aqui…",
        "Sinto um reiatsu gostoso.",
        "Cero carregado. É só falar.",
        "Hueco Mundo é lar, mas aqui tá melhor.",
        "Não sou perigoso. Só um pouquinho.",
        "Me dá um carinho?",
        "Shhh… tô vigiando.",
        "Já viu a lua hoje?",
      ],
      pet: ["Hehe!", "Mais um pouquinho!", "Bem na máscara.", "Isso, aí mesmo.", "Grrr… quer dizer, ronc!", "Gostei!"],
      feed: ["Nham! Reiatsu fresquinho.", "Delícia!", "Meu buraco tá feliz.", "Mais, por favor!"],
      full: "Tô cheio de reiatsu!",
      hungry: ["Meu buraco tá vazio…", "Fome de reiatsu…", "Alguém me alimenta?"],
      cero: ["CERO!", "Alvo na mira.", "Boom."],
      weak: "Sem reiatsu pra isso… me alimenta?",
      sleep: "Zzz…",
      wake: ["Hã? Tô acordado!", "Quem chamou?"],
      levelup: { 2: "Evoluí! Agora sou um Adjuchas!", 3: "Vasto Lorde! Cuidado com o Cero." },
      reset: "Voltei a ser um Hollow novinho.",
    },
    en: {
      region: "Hollowzinho, interactive pet",
      hit: "Pet Hollowzinho. Hold to charge a Cero.",
      actions: { pet: "Pet", feed: "Feed", cero: "Cero", sleep: "Sleep", hide: "Hide" },
      reiatsu: "Reiatsu",
      bond: "Bond",
      peek: "Call Hollowzinho back",
      aim: "Pick a target. Esc cancels.",
      hello: ["I'm here! Watching your code.", "Hi! Can I stay in the corner?"],
      idle: ["Too quiet in here…", "Nice reiatsu today.", "Cero charged. Just say the word.", "Hueco Mundo is home, but this is nicer.", "Not dangerous. Only a little.", "Pet me?", "Shh… on watch.", "Seen the moon today?"],
      pet: ["Hehe!", "A little more!", "Right on the mask.", "Yes, there.", "Grr… I mean, purr!", "Like that!"],
      feed: ["Yum! Fresh reiatsu.", "Delicious!", "My hole is happy.", "More, please!"],
      full: "I'm full of reiatsu!",
      hungry: ["My hole is empty…", "Hungry for reiatsu…", "Anyone feeding me?"],
      cero: ["CERO!", "Target locked.", "Boom."],
      weak: "Not enough reiatsu… feed me?",
      sleep: "Zzz…",
      wake: ["Huh? I'm awake!", "Who called?"],
      levelup: { 2: "I evolved! I'm an Adjuchas now!", 3: "Vasto Lorde! Mind the Cero." },
      reset: "I'm a brand new Hollow again.",
    },
  };

  const ICON = {
    pet: '<path d="M12 21C5.5 16.2 3 12.6 3 9.2 3 6.4 5.1 4.5 7.5 4.5c1.8 0 3.5 1 4.5 2.7C13 5.5 14.7 4.5 16.5 4.5 18.9 4.5 21 6.4 21 9.2c0 3.4-2.5 7-9 11.8z"/>',
    feed: '<circle cx="12" cy="14" r="5"/><path d="M12 3.5v3M5 6.5l2 2M19 6.5l-2 2"/>',
    cero: '<path d="M13.5 2.5 5 13.5h6.2l-1 8 8.8-11h-6.3z"/>',
    sleep: '<path d="M20 14.6A8 8 0 0 1 9.4 4a8 8 0 1 0 10.6 10.6z"/>',
    hide: '<path d="M3 3l18 18M10.6 6.1A9.6 9.6 0 0 1 12 6c5 0 9 6 9 6a15.5 15.5 0 0 1-3.1 3.5M6.5 7.6A15.4 15.4 0 0 0 3 12s4 6 9 6a9 9 0 0 0 3.2-.6"/>',
  };

  const pick = (a) => a[(Math.random() * a.length) | 0];
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const reduced = () => !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const stageFor = (bond) => STAGES.reduce((s, x) => (bond >= x.at ? x : s), STAGES[0]);

  /* ───────────────────────── arte (SVG original, viewBox 160×160) ───────────────────────── */

  const HEAD = "M80 22C106 22 128 38 128 62C128 82 118 97 104 103C96 106.5 88 108 80 108C72 108 64 106.5 56 103C42 97 32 82 32 62C32 38 54 22 80 22Z";

  /** Dentes ao longo de uma curva quadrática, cada um girado pela tangente. */
  function teethAlong(n, p0, p1, p2, w, h, from = 0.1, to = 0.9) {
    let out = "";
    for (let i = 0; i < n; i++) {
      const t = from + ((to - from) * i) / (n - 1);
      const x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0];
      const y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1];
      const dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
      const dy = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
      const a = (Math.atan2(dy, dx) * 180) / Math.PI;
      const k = 1 - Math.abs(t - 0.5) * 0.9; // os do meio são maiores
      const ww = w * (0.8 + 0.3 * k);
      const hh = h * (0.8 + 0.3 * k);
      out += `<rect x="${(x - ww / 2).toFixed(1)}" y="${(y - 0.6).toFixed(1)}" width="${ww.toFixed(1)}" height="${hh.toFixed(1)}" rx="1.5" transform="rotate(${a.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
    }
    return out;
  }

  /** Dentes de uma boca aberta (elipse), apontando para o centro. */
  function teethRing(cx, cy, rx, ry, a0, a1, n, w, h) {
    let out = "";
    for (let i = 0; i < n; i++) {
      const a = a0 + ((a1 - a0) * i) / (n - 1);
      const r = (a * Math.PI) / 180;
      const x = cx + rx * Math.cos(r);
      const y = cy + ry * Math.sin(r);
      out += `<rect x="${(x - w / 2).toFixed(1)}" y="${(y - 0.8).toFixed(1)}" width="${w}" height="${h}" rx="1.4" transform="rotate(${(a - 90).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
    }
    return out;
  }

  const MOUTH_CLOSED = `
    <g class="mouth mouth-closed">
      <path d="M52 86Q80 104 108 86Q80 116 52 86Z" fill="#0a0a0e"/>
      <g fill="url(#g-bone)" stroke="#8d8573" stroke-width=".5">${teethAlong(9, [52, 86], [80, 104], [108, 86], 4.6, 6)}</g>
    </g>`;

  const MOUTH_OPEN = `
    <g class="mouth mouth-open">
      <ellipse cx="80" cy="94" rx="20" ry="11.5" fill="#0a0a0e"/>
      <ellipse class="mouth-glow" cx="80" cy="95" rx="15" ry="8" fill="url(#g-mouth)"/>
      <g fill="url(#g-bone)" stroke="#8d8573" stroke-width=".5">${teethRing(80, 94, 20, 11.5, 196, 344, 8, 4.6, 6.2)}</g>
      <g fill="url(#g-bone)" stroke="#8d8573" stroke-width=".5">${teethRing(80, 94, 19, 10.5, 28, 152, 6, 3.8, 4.6)}</g>
    </g>`;

  function eyeSocket(cx, rot) {
    return `<ellipse cx="${cx}" cy="66" rx="11.5" ry="14.5" transform="rotate(${rot} ${cx} 66)"/>`;
  }

  function art() {
    const eyeL = eyeSocket(58, 9);
    const eyeR = eyeSocket(102, -9);
    return `
<svg class="art" viewBox="0 0 160 160" aria-hidden="true" focusable="false">
  <defs>
    <radialGradient id="g-bone" gradientUnits="userSpaceOnUse" cx="64" cy="42" r="86">
      <stop offset="0" stop-color="#fffdf8"/><stop offset=".5" stop-color="#f1ebde"/><stop offset="1" stop-color="#c8bfa9"/>
    </radialGradient>
    <linearGradient id="g-chin" gradientUnits="userSpaceOnUse" x1="0" y1="72" x2="0" y2="110">
      <stop offset="0" stop-color="#8a8068" stop-opacity="0"/><stop offset="1" stop-color="#8a8068" stop-opacity=".5"/>
    </linearGradient>
    <linearGradient id="g-body" gradientUnits="userSpaceOnUse" x1="0" y1="98" x2="0" y2="152">
      <stop offset="0" stop-color="#2d2d3a"/><stop offset=".55" stop-color="#15151c"/><stop offset="1" stop-color="#09090d"/>
    </linearGradient>
    <radialGradient id="g-iris" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#fff2b0"/><stop offset=".55" stop-color="var(--eye, #fbbf24)"/><stop offset="1" stop-color="#a8650a"/>
    </radialGradient>
    <linearGradient id="g-mark" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="var(--mark-hi, #ff3b5c)"/><stop offset="1" stop-color="var(--mark-lo, #a11236)"/>
    </linearGradient>
    <radialGradient id="g-aura" cx=".5" cy=".55" r=".5">
      <stop offset="0" stop-color="var(--aura, #e11d48)" stop-opacity=".45"/><stop offset=".6" stop-color="var(--aura, #e11d48)" stop-opacity=".13"/><stop offset="1" stop-color="var(--aura, #e11d48)" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="g-mouth" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#fff0f3"/><stop offset=".45" stop-color="var(--mark-hi, #ff3b5c)"/><stop offset="1" stop-color="var(--mark-lo, #a11236)" stop-opacity="0"/>
    </radialGradient>
    <filter id="f-glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.2"/></filter>
    <filter id="f-soft" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="2.6"/></filter>
    <clipPath id="c-head"><path d="${HEAD}"/></clipPath>
    <clipPath id="c-eye-l">${eyeL}</clipPath>
    <clipPath id="c-eye-r">${eyeR}</clipPath>
    <mask id="m-body"><rect width="160" height="160" fill="#fff"/><circle cx="80" cy="127" r="10.5" fill="#000"/></mask>
  </defs>

  <ellipse class="aura" cx="80" cy="96" rx="76" ry="70" fill="url(#g-aura)"/>
  <ellipse class="ground" cx="80" cy="153" rx="38" ry="6" fill="#000" opacity=".5" filter="url(#f-soft)"/>

  <g class="flip">
   <g class="tail">
    <path d="M108 138C128 141 143 129 141 111C140 104 143 98 150 99" fill="none" stroke="#14141b" stroke-width="8.5" stroke-linecap="round"/>
    <path d="M144 96L158 97L148 106Z" fill="url(#g-bone)" stroke="#8d8573" stroke-width=".6" stroke-linejoin="round"/>
   </g>

   <g class="legs">
    <ellipse cx="63" cy="148" rx="13" ry="6.5" fill="#101017"/><ellipse cx="97" cy="148" rx="13" ry="6.5" fill="#101017"/>
    <g fill="#e6dfcd"><path d="M53 150l-2 4.5 5.5-2.4zM58 152l-.5 5 4.5-3zM91 152l.5 5 4.5-3zM98 152.5l1 4.5 4-3.4z"/></g>
   </g>

   <g class="bob">
    <g class="arm arm-l">
      <path d="M51 112C41 114 34 121 33 131" fill="none" stroke="#17171f" stroke-width="10" stroke-linecap="round"/>
      <circle cx="33" cy="132" r="6.6" fill="#17171f"/>
      <path d="M27 135l-1.6 6.4 4.6-3.2zM32 138l0 6.8 3.6-4.2zM37 136.5l2.2 5.6 2.4-4.8z" fill="#e6dfcd"/>
    </g>
    <g class="arm arm-r">
      <path d="M109 112C119 114 126 121 127 131" fill="none" stroke="#17171f" stroke-width="10" stroke-linecap="round"/>
      <circle cx="127" cy="132" r="6.6" fill="#17171f"/>
      <path d="M133 135l1.6 6.4-4.6-3.2zM128 138l0 6.8-3.6-4.2zM123 136.5l-2.2 5.6-2.4-4.8z" fill="#e6dfcd"/>
    </g>

    <g mask="url(#m-body)"><path d="M47 102C40 124 50 149 80 149C110 149 120 124 113 102Z" fill="url(#g-body)"/></g>
    <circle class="hole-glow" cx="80" cy="127" r="10.5" fill="none" stroke="var(--aura, #e11d48)" stroke-width="3" filter="url(#f-glow)"/>
    <circle class="hole-ring" cx="80" cy="127" r="10.5" fill="none" stroke="var(--mark-hi, #ff3b5c)" stroke-width="1.5"/>
    <circle cx="80" cy="127" r="9.2" fill="none" stroke="#000" stroke-opacity=".55" stroke-width="2"/>

    <g class="head">
     <g class="show-2 horn-r">
      <path d="M100 30C102 21 106 15 111 9C101 12 92 19 90 29Z" fill="url(#g-bone)" stroke="#8d8573" stroke-width=".7" stroke-linejoin="round"/>
     </g>
     <g class="show-3 crest">
      <path d="M72 27C74 17 77.5 9 80 2C82.5 9 86 17 88 27Z" fill="url(#g-bone)" stroke="#8d8573" stroke-width=".7" stroke-linejoin="round"/>
     </g>
     <path class="horn" d="M60 30C57 19 57 10 52 2C66 6 77 15 77 29Z" fill="url(#g-bone)" stroke="#8d8573" stroke-width=".8" stroke-linejoin="round"/>
     <g class="show-2 spikes">
      <path d="M33 78L21 84L31 91Z M127 78L139 84L129 91Z" fill="url(#g-bone)" stroke="#8d8573" stroke-width=".7" stroke-linejoin="round"/>
     </g>

     <path d="${HEAD}" fill="url(#g-bone)" stroke="#8d8573" stroke-width="1"/>
     <g clip-path="url(#c-head)">
       <ellipse cx="62" cy="38" rx="30" ry="12" fill="#fff" opacity=".55" filter="url(#f-glow)"/>
       <rect x="20" y="70" width="120" height="42" fill="url(#g-chin)"/>
       <path class="crack" d="M96 22L90 36L99 44L92 58" fill="none" stroke="#2a2a33" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/>
       <path class="crack crack-2 show-2" d="M44 40L52 47L46 56" fill="none" stroke="#2a2a33" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"/>
     </g>

     <g class="marks" fill="url(#g-mark)" clip-path="url(#c-head)">
       <path d="M49.5 79C46 86 45.5 93 48 101C50.4 94 52.6 87 54.6 80Z"/><path d="M110.5 79C114 86 114.5 93 112 101C109.6 94 107.4 87 105.4 80Z"/>
       <path d="M78.5 23L81.5 23L80.7 48L79.3 48Z"/>
       <path d="M49 36L62 45L60.4 47.2L47.6 38.4Z M111 36L98 45L99.6 47.2L112.4 38.4Z"/>
     </g>
     <path d="M77 81L83 81L80 87Z" fill="#1b1b22" opacity=".8" stroke="#1b1b22" stroke-width="1.6" stroke-linejoin="round"/>
     <ellipse class="blush" cx="44" cy="84" rx="6.5" ry="3.4" fill="#ff3b5c"/><ellipse class="blush" cx="116" cy="84" rx="6.5" ry="3.4" fill="#ff3b5c"/>
     <g class="sweat"><path d="M119 38C115 45 114.500 49.500 118 52C121.500 49.500 122 45 119 38Z" fill="#8ecdf5" stroke="#4d8fb8" stroke-width=".6"/><ellipse cx="117.200" cy="46.500" rx="1" ry="1.800" fill="#fff" opacity=".85"/></g>

     <g class="eye eye-l"><g fill="#07070a">${eyeL}</g>
       <g clip-path="url(#c-eye-l)"><g class="gaze"><circle cx="58" cy="67" r="9.4" fill="url(#g-iris)"/><ellipse class="pupil" cx="58" cy="67" rx="3.7" ry="5.8" fill="#0a0a0e"/><circle cx="54.2" cy="62.4" r="2.7" fill="#fff"/><circle cx="62.2" cy="71.8" r="1.3" fill="#fff" opacity=".85"/></g></g></g>
     <g class="eye eye-r"><g fill="#07070a">${eyeR}</g>
       <g clip-path="url(#c-eye-r)"><g class="gaze"><circle cx="102" cy="67" r="9.4" fill="url(#g-iris)"/><ellipse class="pupil" cx="102" cy="67" rx="3.7" ry="5.8" fill="#0a0a0e"/><circle cx="98.2" cy="62.4" r="2.7" fill="#fff"/><circle cx="106.2" cy="71.8" r="1.3" fill="#fff" opacity=".85"/></g></g></g>
     <g class="eye-alt eye-happy" fill="none" stroke="#0a0a0e" stroke-width="4.6" stroke-linecap="round"><path d="M47 71Q58 57 69 71"/><path d="M91 71Q102 57 113 71"/></g>
     <g class="eye-alt eye-sleep" fill="none" stroke="#0a0a0e" stroke-width="3.6" stroke-linecap="round"><path d="M47 65Q58 74 69 65"/><path d="M91 65Q102 74 113 65"/></g>

     ${MOUTH_CLOSED}
     ${MOUTH_OPEN}
    </g>
   </g>
  </g>
</svg>`;
  }

  /* ───────────────────────── estilos ───────────────────────── */

  const CSS = `
:host{position:fixed;inset:0;z-index:2147483000;display:block;pointer-events:none;contain:layout style;
  --panel:var(--color-panel,#0e0e11);--ink:var(--color-ink,#050506);--edge:var(--color-edge,#2c2c33);--accent:var(--color-accent,#e11d48);
  --accent-text:var(--color-accent-text,#f6506d);--on-accent:var(--color-on-accent,#fff);--fg:var(--color-fg,#ede9e0);--muted:var(--color-muted,#a8a29e);
  --faint:var(--color-faint,#948e86);--line:var(--color-line,#62626b);--ok:var(--color-ok,#4ade80);--warn:var(--color-warn,#fbbf24);
  --font:var(--hm-font-sans,ui-sans-serif,system-ui,"Segoe UI",sans-serif);--ease:cubic-bezier(.2,0,0,1);--spring:cubic-bezier(.34,1.56,.64,1)}
:host([hidden]){display:none}
:host([inline]){position:relative;inset:auto;display:inline-block;width:var(--size,120px);height:var(--size,120px);contain:none;z-index:auto;pointer-events:auto}
:host([tint="reishi"]){--aura:#4ade80;--mark-hi:#6ff0a0;--mark-lo:#1f9a52}
:host([tint="ouro"]){--aura:#fbbf24;--mark-hi:#ffd45e;--mark-lo:#b9770e}
*{box-sizing:border-box}

.root{position:absolute;left:0;top:0;width:var(--size,120px);height:var(--size,120px);transform:translate3d(var(--x,0px),var(--y,0px),0);will-change:transform;
  --gx:0;--gy:0;--tilt:0;font-family:var(--font)}
:host([inline]) .root{position:relative;transform:none}
.pet{position:absolute;inset:0;margin:0;padding:0;border:0;background:none;cursor:grab;pointer-events:auto;touch-action:none;user-select:none;-webkit-user-select:none;
  -webkit-tap-highlight-color:transparent;border-radius:40%;color:inherit}
.pet:active{cursor:grabbing}
.pet:focus-visible{outline:2px solid var(--accent);outline-offset:4px}
.art{display:block;width:100%;height:100%;overflow:visible;filter:drop-shadow(0 0 .8px rgba(244,239,227,.55));pointer-events:none}
.flip{transform-origin:80px 100px}
.root.flipped .flip{transform:scaleX(-1)}

/* corpo: tudo em unidades do viewBox */
.bob,.tail,.aura,.arm,.head,.eye,.horn,.legs{transform-box:view-box}
.bob{transform-origin:80px 148px;animation:breathe 3.6s ease-in-out infinite}
.head{transform-origin:80px 106px;transform:rotate(calc(var(--tilt) * 1deg))}
.aura{transform-origin:80px 100px;animation:aura 3.2s ease-in-out infinite}
.tail{transform-origin:108px 138px;animation:wag 2.8s ease-in-out infinite}
.arm-l{transform-origin:51px 112px}.arm-r{transform-origin:109px 112px}
.eye{transform-origin:80px 66px;animation:blink 5.2s infinite}
.eye-r{animation-delay:.02s}
.gaze{transform:translate(calc(var(--gx) * 1px),calc(var(--gy) * 1px))}
.hole-ring{animation:ring 2.6s ease-in-out infinite}
.hole-glow{opacity:.65;animation:ring 2.6s ease-in-out infinite}
.eye-alt,.mouth-open,.blush,.mouth-glow,.show-2,.show-3,.sweat{opacity:0}
.sweat{transform-box:view-box}
[data-hungry="1"][data-mode="idle"] .sweat{opacity:1;animation:sweat 2.6s ease-in infinite}
.blush{transition:opacity .2s}
.mouth,.eye,.eye-alt,.show-2,.show-3{transition:opacity .12s}
.arm{transition:transform .25s var(--ease)}

[data-stage="2"] .show-2,[data-stage="3"] .show-2,[data-stage="3"] .show-3{opacity:1}
[data-stage="2"] .horn,[data-stage="3"] .horn{transform-origin:70px 29px;transform:scale(1.08)}
[data-stage="3"] .horn{transform:scale(1.28)}
[data-stage="2"] .horn-r,[data-stage="3"] .horn-r{transform-origin:100px 29px}
[data-stage="3"] .horn-r{transform:scale(1.35)}
[data-stage="3"] .crack,[data-stage="3"] .crack-2{stroke:#e11d48;filter:drop-shadow(0 0 1.2px #ff3b5c)}
[data-stage="3"] .aura{animation-duration:2.2s;transform:scale(1.12)}

/* olhos e boca por estado */
[data-eyes="happy"] .eye{opacity:0}[data-eyes="happy"] .eye-happy{opacity:1}[data-eyes="happy"] .blush{opacity:.42}
[data-eyes="sleep"] .eye{opacity:0}[data-eyes="sleep"] .eye-sleep{opacity:1}
[data-mouth="open"] .mouth-closed{opacity:0}[data-mouth="open"] .mouth-open{opacity:1}
[data-glow="1"] .mouth-glow{opacity:1}
[data-glow="1"] .marks{filter:drop-shadow(0 0 2px var(--mark-hi,#ff3b5c)) drop-shadow(0 0 4px var(--mark-hi,#ff3b5c))}
[data-glow="1"] .hole-ring{stroke:#fff0f3}
[data-wide="1"] .pupil{transform-box:fill-box;transform-origin:center;transform:scale(.72)}
[data-hungry="1"] .eye{transform:scaleY(.8)}
[data-hungry="1"] .aura{opacity:.45}
[data-hungry="1"] .hole-ring,[data-hungry="1"] .hole-glow{animation:flicker 1.9s steps(1) infinite}
[data-mode="sleeping"] .aura{opacity:.5}
[data-mode="sleeping"] .bob{animation:breathe-slow 4.8s ease-in-out infinite}
[data-mode="sleeping"] .tail{animation-duration:6s}

/* pose por estado */
[data-mode="happy"] .arm-l{transform:rotate(42deg)}[data-mode="happy"] .arm-r{transform:rotate(-42deg)}
[data-mode="happy"] .tail{animation-duration:.5s}
[data-mode="dragging"] .arm-l{transform:rotate(78deg)}[data-mode="dragging"] .arm-r{transform:rotate(-78deg)}
[data-mode="dragging"] .legs{transform:translateY(4px)}
[data-mode="dragging"] .ground{opacity:.25}
[data-mode="charging"] .bob,[data-mode="firing"] .bob{animation:none}
[data-mode="charging"] .art{animation:rumble .09s linear infinite}
[data-mode="charging"] .aura{animation:aura .5s ease-in-out infinite}
[data-mode="firing"] .aura{transform:scale(1.25);opacity:1}

.anim-hop .bob{animation:hop .62s var(--ease) 1}
.anim-wag .tail{animation:wag .35s ease-in-out 5}
.anim-chomp .mouth-open{animation:chomp .2s ease-in-out 3;transform-box:view-box;transform-origin:80px 90px}
.anim-recoil .bob{animation:recoil .5s var(--ease) 1}
.anim-nope .head{animation:nope .45s ease-in-out 1}
.anim-land .bob{animation:land .5s var(--ease) 1}
.anim-pulse .bob{animation:pulse .9s var(--spring) 1}

@keyframes sweat{0%{transform:translateY(-3px);opacity:0}20%{opacity:1}80%{opacity:1}100%{transform:translateY(9px);opacity:0}}
@keyframes breathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.014,1.03)}}
@keyframes breathe-slow{0%,100%{transform:translateY(3px) scale(1.02,.96)}50%{transform:translateY(3px) scale(1.03,.99)}}
@keyframes blink{0%,92%,100%{transform:scaleY(1)}95.5%{transform:scaleY(.07)}}
@keyframes wag{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(9deg)}}
@keyframes aura{0%,100%{opacity:.8}50%{opacity:1}}
@keyframes ring{0%,100%{opacity:.75}50%{opacity:1}}
@keyframes flicker{0%{opacity:.25}35%{opacity:.8}60%{opacity:.2}100%{opacity:.6}}
@keyframes hop{0%,100%{transform:translateY(0) scale(1,1)}22%{transform:translateY(2px) scale(1.07,.9)}55%{transform:translateY(-16px) scale(.95,1.07)}82%{transform:translateY(0) scale(1.08,.9)}}
@keyframes land{0%{transform:scale(1.14,.82)}45%{transform:scale(.94,1.08)}100%{transform:scale(1,1)}}
@keyframes pulse{0%{transform:scale(1)}40%{transform:scale(1.2)}100%{transform:scale(1)}}
@keyframes chomp{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.35)}}
@keyframes recoil{0%{transform:translateX(0)}20%{transform:translateX(var(--rx,6px)) scale(1.06,.94)}100%{transform:translateX(0)}}
@keyframes nope{0%,100%{transform:rotate(0)}20%{transform:rotate(-10deg)}50%{transform:rotate(9deg)}80%{transform:rotate(-5deg)}}
@keyframes rumble{0%{transform:translate(-.9px,.4px)}25%{transform:translate(.8px,-.5px)}50%{transform:translate(-.5px,-.7px)}75%{transform:translate(.7px,.6px)}100%{transform:translate(-.9px,.4px)}}

/* balão e bandeja ficam do lado de dentro da tela */
.stack{position:absolute;display:flex;flex-direction:column;gap:8px;width:max-content;max-width:min(240px,calc(100vw - 24px));pointer-events:none}
.c-br .stack,.c-bl .stack{bottom:calc(100% + 4px);flex-direction:column-reverse}
.c-tr .stack,.c-tl .stack{top:calc(100% + 4px)}
.c-br .stack,.c-tr .stack{right:0;align-items:flex-end}
.c-bl .stack,.c-tl .stack{left:0;align-items:flex-start}
:host([inline]) .stack{display:none}

.bubble{position:relative;max-width:220px;padding:9px 12px;border:1px solid var(--edge);border-radius:14px;background:var(--panel);color:var(--fg);
  font-size:13px;line-height:1.35;box-shadow:0 10px 30px -10px rgba(0,0,0,.8),0 0 0 1px color-mix(in oklab,var(--accent) 22%,transparent);
  opacity:0;transform:translateY(6px) scale(.96);transition:opacity .18s var(--ease),transform .22s var(--spring);text-wrap:pretty}
.bubble.on{opacity:1;transform:none}
.bubble::after{content:"";position:absolute;width:10px;height:10px;background:var(--panel);border:solid var(--edge);border-width:0 1px 1px 0;transform:rotate(45deg)}
.c-br .bubble::after,.c-bl .bubble::after{bottom:-6px}
.c-tr .bubble::after,.c-tl .bubble::after{top:-6px;transform:rotate(225deg)}
.c-br .bubble::after,.c-tr .bubble::after{right:calc(var(--size,120px) * .4)}
.c-bl .bubble::after,.c-tl .bubble::after{left:calc(var(--size,120px) * .4)}
.bubble b{color:var(--accent-text);font-weight:700}

.tray{position:relative;width:236px;padding:10px;border:1px solid var(--edge);border-radius:16px;background:var(--panel);color:var(--fg);pointer-events:auto;
  box-shadow:0 18px 40px -14px rgba(0,0,0,.85),0 0 0 1px color-mix(in oklab,var(--accent) 18%,transparent),inset 0 1px 0 rgba(237,233,224,.06);
  opacity:0;visibility:hidden;transform:translateY(8px) scale(.97);transition:opacity .16s var(--ease),transform .2s var(--ease),visibility 0s .2s}
.root.open .tray,.root:has(:focus-visible) .tray{opacity:1;visibility:visible;transform:none;transition-delay:0s}
.root[data-mode="aiming"] .tray,.root[data-mode="charging"] .tray,.root[data-mode="firing"] .tray,.root[data-mode="dragging"] .tray{opacity:0;visibility:hidden;pointer-events:none}
.tray-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin:0 2px 8px}
.tray-name{font-weight:700;font-size:13px;letter-spacing:.01em}
.tray-stage{font-size:11px;color:var(--accent-text);border:1px solid color-mix(in oklab,var(--accent) 45%,transparent);border-radius:999px;padding:1px 8px;white-space:nowrap}
.meters{display:grid;gap:7px;margin:0 2px 10px}
.meter{display:grid;grid-template-columns:62px 1fr 26px;align-items:center;gap:8px;font-size:11px;color:var(--muted)}
.meter .bar{height:6px;border-radius:99px;background:color-mix(in oklab,var(--fg) 10%,transparent);overflow:hidden}
.meter .bar i{display:block;height:100%;width:var(--v,0%);border-radius:inherit;transition:width .5s var(--ease)}
.meter.r .bar i{background:linear-gradient(90deg,#22a85a,var(--ok));box-shadow:0 0 10px color-mix(in oklab,var(--ok) 60%,transparent)}
.meter.b .bar i{background:linear-gradient(90deg,#b3123a,var(--accent));box-shadow:0 0 10px color-mix(in oklab,var(--accent) 60%,transparent)}
.meter output{font-variant-numeric:tabular-nums;text-align:right;color:var(--fg)}
.acts{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
.act{display:grid;place-items:center;height:36px;min-width:24px;padding:0;border:1px solid var(--edge);border-radius:10px;background:color-mix(in oklab,var(--panel) 90%,var(--fg));color:var(--fg);cursor:pointer;
  transition:border-color .12s var(--ease),background-color .12s var(--ease),transform .1s var(--ease),color .12s}
.act svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.act:hover{border-color:var(--accent);background:color-mix(in oklab,var(--accent) 14%,var(--panel));color:#fff}
.act:active{transform:scale(.94)}
.act:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.act[data-act="feed"]:hover{border-color:var(--ok);background:color-mix(in oklab,var(--ok) 14%,var(--panel))}
.act[disabled]{opacity:.45;cursor:default}
.tray-hint{display:flex;gap:10px;margin:9px 2px 0;font-size:10.5px;color:var(--faint);line-height:1.35}
.tray-hint kbd{display:inline-grid;place-items:center;min-width:16px;height:16px;margin-right:4px;padding:0 4px;border:1px solid var(--edge);border-bottom-width:2px;border-radius:4px;background:color-mix(in oklab,var(--panel) 88%,var(--fg));color:var(--fg);font:600 10px/1 var(--font)}

.peek{position:absolute;display:none;width:34px;height:34px;padding:0;border:1px solid var(--edge);border-radius:50%;background:var(--panel);color:var(--fg);cursor:pointer;pointer-events:auto;
  box-shadow:0 8px 20px -8px rgba(0,0,0,.8),0 0 0 1px color-mix(in oklab,var(--accent) 30%,transparent)}
.peek svg{width:20px;height:20px}
.peek:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.hidden-pet .root{display:none}.hidden-pet .peek{display:block}
.menu-dot{position:absolute;top:-2px;right:-2px;display:none;width:26px;height:26px;border-radius:50%;border:1px solid var(--edge);background:var(--panel);color:var(--fg);font:700 14px/1 var(--font);cursor:pointer;pointer-events:auto;padding:0}
@media (hover:none){.menu-dot{display:block}}

/* efeitos */
.fx{position:absolute;inset:0;pointer-events:none;overflow:visible}
.heart,.spark,.orb,.zzz,.puff{position:absolute;left:0;top:0;pointer-events:none;will-change:transform,opacity}
.heart{width:19px;height:19px;fill:var(--heart,#f6506d);filter:drop-shadow(0 0 4px rgba(225,29,72,.7))}
.spark{width:12px;height:12px;fill:#fff3d6;filter:drop-shadow(0 0 4px rgba(251,191,36,.9))}
.orb{width:14px;height:14px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#eafff1,var(--ok) 55%,#14803f);box-shadow:0 0 14px 3px color-mix(in oklab,var(--ok) 70%,transparent)}
.zzz{font:800 20px/1 var(--hm-font-display,Georgia,serif);color:var(--fg);opacity:0;text-shadow:0 0 10px rgba(0,0,0,.85),0 0 14px color-mix(in oklab,var(--accent) 55%,transparent)}
.puff{width:14px;height:14px;border-radius:50%;background:radial-gradient(circle,rgba(237,233,224,.55),rgba(237,233,224,0) 70%)}

.layer{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.beam{position:absolute;left:0;top:0;height:var(--bh,46px);transform-origin:0 50%;margin-top:calc(var(--bh,46px) / -2)}
.beam i{position:absolute;inset:0;border-radius:999px}
.beam .b-glow{background:linear-gradient(90deg,rgba(255,46,85,.0),rgba(255,46,85,.65) 6%,rgba(255,46,85,.5) 70%,rgba(255,46,85,.15));filter:blur(14px);transform:scaleY(1.7)}
.beam .b-mid{background:linear-gradient(90deg,#8f0f30,#ff2e55 6%,#f0224f 55%,rgba(240,34,79,.28));transform:scaleY(.6);box-shadow:0 0 34px 8px rgba(255,46,85,.7)}
.beam .b-core{background:linear-gradient(90deg,#fff,#ffe9ee 70%,rgba(255,233,238,.35));transform:scaleY(.17);filter:blur(.5px)}
.flash{position:absolute;inset:0;opacity:0}
.ring{position:absolute;left:0;top:0;border-radius:50%;border:3px solid #ff5a78;box-shadow:0 0 22px 4px rgba(255,46,85,.55),inset 0 0 22px 2px rgba(255,46,85,.45)}
.scorch{position:absolute;left:0;top:0;border-radius:50%;background:radial-gradient(circle,rgba(255,200,210,.85) 0,rgba(255,46,85,.55) 22%,rgba(120,10,40,.35) 52%,rgba(0,0,0,0) 72%)}
.charge{position:absolute;left:0;top:0;border-radius:50%;background:radial-gradient(circle,#fff 0,#ffd1da 22%,#ff2e55 52%,rgba(179,18,58,0) 74%);box-shadow:0 0 30px 8px rgba(255,46,85,.55)}
.aimcap{position:absolute;inset:0;pointer-events:auto;cursor:crosshair;background:radial-gradient(circle at var(--ax,50%) var(--ay,50%),rgba(255,46,85,.10),rgba(5,5,6,.28) 55%)}
.aimcap::before,.aimcap::after{content:"";position:absolute;background:#ff5a78;opacity:.9;box-shadow:0 0 8px #ff2e55}
.aimcap::before{left:var(--ax,50%);top:calc(var(--ay,50%) - 14px);width:2px;height:28px;margin-left:-1px}
.aimcap::after{top:var(--ay,50%);left:calc(var(--ax,50%) - 14px);height:2px;width:28px;margin-top:-1px}

@media (prefers-reduced-motion:reduce){
  .bob,.tail,.aura,.eye,.hole-ring,.hole-glow{animation:none!important}
  .bubble,.tray{transition:opacity .01s!important;transform:none!important}
}
@media (forced-colors:active){
  .pet:focus-visible,.act:focus-visible{outline-color:Highlight}
  .tray,.bubble,.act{border-color:CanvasText;background:Canvas;color:CanvasText}
}
`;

  /* ───────────────────────── o elemento ───────────────────────── */

  const KEY = "hueco-mundo:pet";
  const CORNERS = ["br", "bl", "tr", "tl"];

  class HollowPet extends HTMLElement {
    static get observedAttributes() {
      return ["corner", "size", "name", "lang", "inline", "static", "stage"];
    }

    /** Cria um <hollow-pet> no body (para quem não quer escrever o HTML), ex.: HollowPet.mount({ corner: "bl" }). */
    static mount(attrs = {}) {
      const el = document.createElement("hollow-pet");
      for (const k of Object.keys(attrs)) el.setAttribute(k, attrs[k]);
      (document.body || document.documentElement).appendChild(el);
      return el;
    }

    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.s = { reiatsu: 80, bond: 0, corner: "br", hidden: false, seen: false };
      this.mode = "idle";
      this._timers = new Set();
      this._gaze = { x: 0, y: 0, tx: 0, ty: 0 };
      this._pointer = null;
      this._lastPet = 0;
      this._lastActive = Date.now();
      this._build();
      this._wire();
    }

    /* ── construção ── */
    _build() {
      const sr = this.shadowRoot;
      sr.innerHTML = `<style>${CSS}</style>
<div class="wrap">
  <div class="layer" part="layer"></div>
  <div class="root c-br" data-mode="idle" data-eyes="open" data-mouth="closed" data-stage="1" role="region">
    <div class="stack">
      <div class="bubble" role="status" aria-live="polite" aria-atomic="true"></div>
      <div class="tray" role="group">
        <div class="tray-head"><span class="tray-name"></span><span class="tray-stage"></span></div>
        <div class="meters">
          <div class="meter r"><span class="l-r"></span><span class="bar"><i></i></span><output></output></div>
          <div class="meter b"><span class="l-b"></span><span class="bar"><i></i></span><output></output></div>
        </div>
        <div class="acts">${["pet", "feed", "cero", "sleep", "hide"]
          .map((a) => `<button class="act" type="button" data-act="${a}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[a]}</svg></button>`)
          .join("")}</div>
        <div class="tray-hint" aria-hidden="true"></div>
      </div>
    </div>
    <div class="fx"></div>
    <button class="pet" type="button" aria-keyshortcuts="F C S">${art()}</button>
    <button class="menu-dot" type="button" aria-label="Menu">⋯</button>
  </div>
  <button class="peek" type="button"><svg viewBox="0 0 160 160" aria-hidden="true"><path d="${HEAD}" fill="#ede9e0"/><ellipse cx="58" cy="66" rx="11" ry="14" fill="#0a0a0e"/><ellipse cx="102" cy="66" rx="11" ry="14" fill="#0a0a0e"/><path d="M44 78C39 86 39 95 44 103C46 95 49 87 52 79ZM116 78C121 86 121 95 116 103C114 95 111 87 108 79Z" fill="#e11d48"/></svg></button>
</div>`;
      const $ = (q) => sr.querySelector(q);
      this.$ = {
        wrap: $(".wrap"), root: $(".root"), layer: $(".layer"), fx: $(".fx"), pet: $(".pet"), bubble: $(".bubble"), tray: $(".tray"),
        name: $(".tray-name"), stage: $(".tray-stage"), hint: $(".tray-hint"), peek: $(".peek"), dot: $(".menu-dot"),
        mr: $(".meter.r"), mb: $(".meter.b"), lr: $(".l-r"), lb: $(".l-b"),
      };
      this.$.acts = [...sr.querySelectorAll(".act")];
    }

    connectedCallback() {
      this._load();
      this._bind();
      this._i18n();
      this._applyStage();
      this._layout(false);
      this._meters();
      if (this.hasAttribute("static") || this.hasAttribute("inline")) return;
      this._schedule(() => {
        if (!this.s.seen) {
          this.s.seen = true;
          this._save();
          this.say(pick(this._t.hello), 4200);
        }
      }, 900);
      this._loops();
    }

    disconnectedCallback() {
      this._unbind();
      this._timers.forEach((id) => clearTimeout(id));
      this._timers.clear();
      clearInterval(this._tick);
      cancelAnimationFrame(this._raf);
    }

    attributeChangedCallback(name) {
      if (!this.isConnected) return;
      if (name === "lang" || name === "name") this._i18n();
      if (name === "size" || name === "corner" || name === "inline") this._layout(false);
      if (name === "stage") this._applyStage();
    }

    /* ── utilidades de estado ── */
    get _t() {
      const l = (this.getAttribute("lang") || document.documentElement.lang || "pt").slice(0, 2).toLowerCase();
      return T[l] || T.pt;
    }
    get _name() {
      return this.getAttribute("name") || "Hollowzinho";
    }
    get _inline() {
      return this.hasAttribute("inline");
    }
    get stage() {
      const f = parseInt(this.getAttribute("stage"), 10);
      return f >= 1 && f <= 3 ? STAGES[f - 1] : stageFor(this.s.bond);
    }
    get stats() {
      return { ...this.s, stage: this.stage.id, mode: this.mode };
    }

    _schedule(fn, ms) {
      const id = setTimeout(() => {
        this._timers.delete(id);
        fn();
      }, ms);
      this._timers.add(id);
      return id;
    }

    _load() {
      if (this.hasAttribute("no-persist") || this._inline) return;
      try {
        const raw = JSON.parse(localStorage.getItem(KEY) || "null");
        if (raw && raw.v === 1) {
          const away = Math.max(0, (Date.now() - (raw.t || Date.now())) / 60000);
          this.s.reiatsu = clamp(raw.r - Math.min(30, away / 8), 5, 100);
          this.s.bond = raw.b | 0;
          this._persistedCorner = CORNERS.includes(raw.c);
          this.s.corner = this._persistedCorner ? raw.c : "br";
          this.s.hidden = !!raw.h;
          this.s.seen = !!raw.s;
        }
      } catch (_) {}
      const attr = this.getAttribute("corner");
      if (attr && CORNERS.includes(attr) && !this._persistedCorner) this.s.corner = attr;
    }

    _save() {
      if (this.hasAttribute("no-persist") || this._inline) return;
      try {
        localStorage.setItem(KEY, JSON.stringify({ v: 1, r: Math.round(this.s.reiatsu), b: this.s.bond, c: this.s.corner, h: this.s.hidden, s: this.s.seen, t: Date.now() }));
      } catch (_) {}
    }

    _i18n() {
      const t = this._t;
      const deco = this._inline && this.hasAttribute("static");
      // Fixo na tela vira um marco da página; embutido e estático é só ilustração.
      this.$.root.setAttribute("role", this._inline ? "group" : "region");
      if (deco) this.$.root.setAttribute("aria-hidden", "true");
      else this.$.root.removeAttribute("aria-hidden");
      this.$.pet.tabIndex = deco ? -1 : 0;
      this.$.root.setAttribute("aria-label", t.region);
      this.$.pet.setAttribute("aria-label", t.hit);
      this.$.name.textContent = this._name;
      this.$.lr.textContent = t.reiatsu;
      this.$.lb.textContent = t.bond;
      this.$.peek.setAttribute("aria-label", t.peek);
      this.$.acts.forEach((b) => {
        const label = t.actions[b.dataset.act];
        b.setAttribute("aria-label", label);
        b.title = label;
      });
      this.$.hint.innerHTML = [["F", t.actions.feed], ["C", t.actions.cero], ["S", t.actions.sleep]].map(([k, l]) => `<span><kbd>${k}</kbd>${l}</span>`).join("");
    }

    _applyStage() {
      const st = this.stage;
      this.$.root.dataset.stage = String(st.id);
      this.$.stage.textContent = st.name;
    }

    _meters() {
      const r = Math.round(this.s.reiatsu);
      const b = this.s.bond;
      const st = this.stage;
      const next = STAGES.find((x) => x.at > b);
      const pct = next ? ((b - st.at) / (next.at - st.at)) * 100 : 100;
      this.$.mr.querySelector("i").style.setProperty("--v", r + "%");
      this.$.mr.querySelector("output").textContent = r;
      this.$.mb.querySelector("i").style.setProperty("--v", clamp(pct, 4, 100) + "%");
      this.$.mb.querySelector("output").textContent = b;
      this.$.mr.setAttribute("role", "meter");
      this.$.mr.setAttribute("aria-valuenow", String(r));
      this.$.mr.setAttribute("aria-valuemin", "0");
      this.$.mr.setAttribute("aria-valuemax", "100");
      this.$.mr.setAttribute("aria-label", this._t.reiatsu);
      this.$.root.dataset.hungry = r < 30 ? "1" : "0";
    }

    /* ── layout e cantos ── */
    _size() {
      const a = parseFloat(this.getAttribute("size"));
      if (a > 0) return a;
      const w = document.documentElement.clientWidth || innerWidth;
      return Math.round(clamp(w * 0.11, 72, 120));
    }

    _cornerXY(c, size = this._size()) {
      const w = document.documentElement.clientWidth || innerWidth;
      const h = document.documentElement.clientHeight || innerHeight;
      const m = w < 520 ? 8 : 16;
      return { x: c[1] === "r" ? w - size - m : m, y: c[0] === "b" ? h - size - m : m };
    }

    _layout(animate) {
      const size = this._size();
      this.style.setProperty("--size", size + "px");
      const root = this.$.root;
      root.style.setProperty("--size", size + "px");
      for (const c of CORNERS) root.classList.toggle("c-" + (c[0] + c[1]), this.s.corner === c);
      root.classList.toggle("flipped", this.s.corner[1] === "l");
      const p = this._cornerXY(this.s.corner, size);
      if (this._inline) return;
      this._pos = p;
      root.style.setProperty("--x", p.x + "px");
      root.style.setProperty("--y", p.y + "px");
      this.$.peek.style.cssText = `left:${this.s.corner[1] === "r" ? p.x + size - 34 : p.x}px;top:${this.s.corner[0] === "b" ? p.y + size - 34 : p.y}px`;
      this.$.wrap.classList.toggle("hidden-pet", !!this.s.hidden);
    }

    /* ── ligações globais ── */
    _bind() {
      if (this._bound) return;
      this._bound = true;
      this._onMove = (e) => {
        this._pointer = { x: e.clientX, y: e.clientY };
        if (this.mode === "idle" || this.mode === "happy") this._kick();
      };
      this._onResize = () => this._layout(false);
      this._onVis = () => {
        if (!document.hidden) this._lastActive = Date.now();
      };
      this._onKey = (e) => {
        if (e.key === "Escape") {
          this._endAim();
          this.$.root.classList.remove("open");
        }
      };
      addEventListener("pointermove", this._onMove, { passive: true });
      addEventListener("resize", this._onResize, { passive: true });
      document.addEventListener("visibilitychange", this._onVis);
      addEventListener("keydown", this._onKey);
    }

    /** Ligações do shadow DOM: feitas uma vez, mesmo que o elemento mude de lugar. */
    _wire() {
      const pet = this.$.pet;
      pet.addEventListener("pointerdown", (e) => this._down(e));
      pet.addEventListener("pointermove", (e) => this._move(e));
      pet.addEventListener("pointerup", (e) => this._up(e));
      pet.addEventListener("pointercancel", (e) => this._up(e, true));
      pet.addEventListener("click", (e) => {
        if (this._suppress) {
          this._suppress = false;
          return;
        }
        if (e.detail === 0 || this._clickOK) this.pet();
      });
      pet.addEventListener("keydown", (e) => this._keys(e));
      this.$.acts.forEach((b) => b.addEventListener("click", () => this._act(b.dataset.act)));
      this.$.dot.addEventListener("click", () => this.$.root.classList.toggle("open"));
      this.$.peek.addEventListener("click", () => {
        this.s.hidden = false;
        this._layout(false);
        this._save();
        this.wake();
        this.$.pet.focus({ preventScroll: true });
      });
      const root = this.$.root;
      root.addEventListener("pointerenter", () => {
        this._lastActive = Date.now();
        if (this.mode === "sleeping") this._hint("sleep");
      });
      root.addEventListener("pointerleave", () => {
        if (this._dragging) return;
        this._schedule(() => !root.matches(":hover") && root.classList.remove("open"), 600);
      });
      root.addEventListener("pointerenter", () => {
        if (!this._inline) root.classList.add("open");
      });
    }

    _unbind() {
      if (!this._bound) return;
      this._bound = false;
      removeEventListener("pointermove", this._onMove);
      removeEventListener("resize", this._onResize);
      document.removeEventListener("visibilitychange", this._onVis);
      removeEventListener("keydown", this._onKey);
    }

    _keys(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "f") this.feed();
      else if (k === "c") this.aim();
      else if (k === "s") (this.mode === "sleeping" ? this.wake() : this.sleep());
      else if (k === "escape") this.$.root.classList.remove("open");
      else return;
      e.preventDefault();
    }

    _act(a) {
      if (a === "pet") this.pet();
      else if (a === "feed") this.feed();
      else if (a === "cero") this.aim();
      else if (a === "sleep") this.mode === "sleeping" ? this.wake() : this.sleep();
      else if (a === "hide") {
        this.s.hidden = true;
        this.$.root.classList.remove("open");
        this._layout(false);
        this._save();
        this.$.peek.focus({ preventScroll: true });
      }
    }

    /* ── ponteiro no pet: carinho, arrastar e carregar Cero ── */
    _down(e) {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      this._lastActive = Date.now();
      this._p = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), moved: false, charged: false };
      this._clickOK = true;
      this.$.pet.setPointerCapture?.(e.pointerId);
      if (this.mode === "sleeping") return;
      if (this._inline) return;
      clearTimeout(this._holdT);
      this._holdT = setTimeout(() => {
        if (!this._p || this._p.moved || this._dragging) return;
        if (this.s.reiatsu < 12) return;
        this._p.charged = true;
        this._beginCharge();
      }, 420);
    }

    _move(e) {
      const p = this._p;
      if (!p || p.id !== e.pointerId) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      if (!p.moved && Math.hypot(dx, dy) > 7 && !this._inline) {
        p.moved = true;
        clearTimeout(this._holdT);
        if (p.charged) this._cancelCharge();
        this._beginDrag(e);
      }
      if (this._dragging) this._drag(e);
    }

    _up(e, cancelled) {
      const p = this._p;
      if (!p || p.id !== e.pointerId) return;
      clearTimeout(this._holdT);
      this._p = null;
      try {
        this.$.pet.releasePointerCapture?.(e.pointerId);
      } catch (_) {}
      if (this._dragging) {
        this._suppress = true;
        this._endDrag(e);
        return;
      }
      if (p.charged) {
        this._suppress = true;
        if (cancelled) this._cancelCharge();
        else this._releaseCharge(performance.now() - p.t);
        return;
      }
      this._clickOK = !cancelled;
    }

    /* ── ações ── */
    pet() {
      const now = performance.now();
      if (now - this._lastPet < 380) return;
      this._lastPet = now;
      this._touch();
      if (this.mode === "sleeping") return this.wake();
      if (this.mode === "aiming") return this._endAim();
      if (this.mode === "charging" || this.mode === "firing" || this.mode === "dragging") return;
      const before = this.stage.id;
      this.s.bond += 1;
      this.s.reiatsu = clamp(this.s.reiatsu + 1, 0, 100);
      this._setMode("happy", 1500);
      this._anim("hop");
      this._hearts(5);
      this.say(pick(this._t.pet), 1800);
      this._after(before);
      this._emit("pet");
    }

    feed() {
      this._touch();
      if (this.mode === "sleeping") this.wake(true);
      if (["charging", "firing", "dragging", "eating"].includes(this.mode)) return;
      if (this.s.reiatsu >= 98) {
        this._setMode("happy", 1100);
        this._anim("wag");
        this.say(this._t.full, 1800);
        return;
      }
      const before = this.stage.id;
      this.s.reiatsu = clamp(this.s.reiatsu + 26, 0, 100);
      this.s.bond += 2;
      this._setMode("eating", 1700);
      this._orbs();
      this._schedule(() => {
        this.$.root.dataset.mouth = "open";
        this._anim("chomp", 600);
        this.say(pick(this._t.feed), 1800);
      }, 560);
      this._schedule(() => {
        if (this.mode === "eating") this.$.root.dataset.mouth = "closed";
      }, 1250);
      this._after(before);
      this._emit("feed");
    }

    sleep() {
      this._touch();
      if (this.mode === "sleeping" || ["charging", "firing", "dragging", "aiming"].includes(this.mode)) return;
      this._setMode("sleeping");
      this.say(this._t.sleep, 1600);
      this._zzz();
      this._emit("sleep");
    }

    wake(silent) {
      this._lastActive = Date.now();
      if (this.mode !== "sleeping") return;
      this._setMode("idle");
      this._anim("hop");
      if (!silent) this.say(pick(this._t.wake), 1800);
      this._emit("wake");
    }

    aim() {
      this._touch();
      if (this.mode === "sleeping") this.wake(true);
      if (["charging", "firing", "dragging"].includes(this.mode)) return;
      if (this.s.reiatsu < 12) return this._weak();
      this._setMode("aiming");
      this.$.root.classList.remove("open");
      // Quem apertou um botão da bandeja volta o foco para o pet, para a bandeja poder fechar sem perder o teclado.
      if (this.$.tray.contains(this.shadowRoot.activeElement)) this.$.pet.focus({ preventScroll: true });
      this.say(this._t.aim, 6000);
      const cap = document.createElement("div");
      cap.className = "aimcap";
      const move = (e) => {
        cap.style.setProperty("--ax", e.clientX + "px");
        cap.style.setProperty("--ay", e.clientY + "px");
        this._pointer = { x: e.clientX, y: e.clientY };
      };
      cap.addEventListener("pointermove", move);
      cap.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        const t = { x: e.clientX, y: e.clientY };
        this._endAim(true);
        this._setMode("charging");
        this._chargeOrb(0.8);
        this._schedule(() => this.cero({ x: t.x, y: t.y }), 620);
      });
      this.$.layer.appendChild(cap);
      this._cap = cap;
      const c = this._mouth();
      move({ clientX: innerWidth / 2, clientY: innerHeight / 2 - (c.y > innerHeight / 2 ? 40 : -40) });
    }

    _endAim(keepMode) {
      if (!this._cap) return;
      this._cap.remove();
      this._cap = null;
      if (!keepMode && this.mode === "aiming") {
        this._setMode("idle");
        this.say("", 0);
      }
    }

    _weak() {
      this._anim("nope");
      this.say(this._t.weak, 2400);
    }

    /** Dispara o Cero. Sem alvo, mira no centro da tela. */
    cero(opts = {}) {
      if (this.mode === "firing") return;
      if (this.s.reiatsu < 12) return this._weak();
      this._touch();
      if (this.mode === "sleeping") this.wake(true);
      const before = this.stage.id;
      const power = clamp(opts.power ?? 1, 0.55, 1.4);
      const m = this._mouth();
      const tx = opts.x ?? innerWidth / 2;
      const ty = opts.y ?? innerHeight / 2;
      this.s.reiatsu = clamp(this.s.reiatsu - 12, 0, 100);
      this.s.bond += 1;
      this._setMode("firing", 1000);
      this.say(pick(this._t.cero), 1400);
      this._fire(m, { x: tx, y: ty }, power);
      this._after(before);
      this._emit("cero");
    }

    reset() {
      this.s.reiatsu = 80;
      this.s.bond = 0;
      this._applyStage();
      this._meters();
      this._save();
      this._setMode("happy", 1200);
      this.say(this._t.reset, 2200);
    }

    setStage(n) {
      this.setAttribute("stage", String(clamp(n | 0, 1, 3)));
    }

    /** Ajusta reiatsu (0-100) e vínculo; útil em demonstrações e testes. */
    setStats({ reiatsu, bond } = {}) {
      if (reiatsu != null) this.s.reiatsu = clamp(+reiatsu, 0, 100);
      if (bond != null) this.s.bond = Math.max(0, bond | 0);
      this._applyStage();
      this._meters();
      this._save();
    }

    setMode(m) {
      this._setMode(m);
    }

    dock(corner, animate = true) {
      if (!CORNERS.includes(corner)) return;
      const from = this._pos;
      this.s.corner = corner;
      this._layout(false);
      this._save();
      if (animate && from && !reduced()) {
        const to = this._pos;
        this.$.root.animate(
          [{ transform: `translate3d(${from.x}px,${from.y}px,0)` }, { transform: `translate3d(${to.x}px,${to.y}px,0)` }],
          { duration: 520, easing: "cubic-bezier(.34,1.4,.64,1)" }
        );
        this._schedule(() => this._anim("land"), 380);
      }
    }

    say(text, ms = 2600) {
      const b = this.$.bubble;
      clearTimeout(this._sayT);
      if (!text) {
        b.classList.remove("on");
        return;
      }
      b.textContent = text;
      b.classList.add("on");
      if (ms > 0) this._sayT = setTimeout(() => b.classList.remove("on"), ms);
    }

    /* ── modos ── */
    _setMode(m, back) {
      this.mode = m;
      const r = this.$.root;
      r.dataset.mode = m;
      const eyes = m === "happy" || m === "eating" || m === "yawn" ? "happy" : m === "sleeping" ? "sleep" : "open";
      r.dataset.eyes = eyes;
      r.dataset.mouth = m === "charging" || m === "firing" || m === "yawn" ? "open" : "closed";
      r.dataset.glow = m === "charging" || m === "firing" ? "1" : "0";
      r.dataset.wide = m === "dragging" || m === "aiming" ? "1" : "0";
      clearTimeout(this._modeT);
      if (back) this._modeT = setTimeout(() => this.mode === m && this._setMode("idle"), back);
    }

    _anim(name, ms = 800) {
      const r = this.$.root;
      r.classList.remove("anim-" + name);
      void r.offsetWidth;
      r.classList.add("anim-" + name);
      setTimeout(() => r.classList.remove("anim-" + name), ms);
    }

    _hint(kind) {
      if (kind === "sleep") this.say("Zzz…", 1200);
    }

    _touch() {
      this._lastActive = Date.now();
    }

    _after(beforeStage) {
      this._meters();
      this._save();
      const now = this.stage.id;
      if (now > beforeStage && !this.hasAttribute("stage")) this._levelUp(now);
    }

    _levelUp(n) {
      this._applyStage();
      this._setMode("happy", 2600);
      this._anim("pulse", 1000);
      this._hearts(10, true);
      this._schedule(() => this.say(this._t.levelup[n], 3600), 500);
      this._emit("levelup");
    }

    _emit(name) {
      this.dispatchEvent(new CustomEvent("hollow-pet:" + name, { bubbles: true, composed: true, detail: { stage: this.stage.id, bond: this.s.bond, reiatsu: Math.round(this.s.reiatsu) } }));
    }

    /* ── posição da boca e geometria ── */
    _rect() {
      return this.$.pet.getBoundingClientRect();
    }

    _mouth() {
      const r = this._rect();
      const flip = this.$.root.classList.contains("flipped");
      return { x: r.left + r.width * (flip ? 0.5 : 0.5), y: r.top + r.height * 0.6, r };
    }

    /* ── olhar ── */
    _kick() {
      if (this._raf || this.hasAttribute("static")) return;
      const step = () => {
        this._raf = 0;
        const r = this._rect();
        const flip = this.$.root.classList.contains("flipped") ? -1 : 1;
        let tx = 0;
        let ty = 0;
        const sleepy = this.mode === "sleeping";
        if (this._pointer && !sleepy && !this._lookAway) {
          const cx = r.left + r.width * 0.5;
          const cy = r.top + r.height * 0.42;
          const dx = this._pointer.x - cx;
          const dy = this._pointer.y - cy;
          const d = Math.hypot(dx, dy) || 1;
          const k = clamp(d / 180, 0, 1);
          tx = (dx / d) * 3.6 * k * flip;
          ty = (dy / d) * 3.2 * k;
        }
        if (this._lookAway) {
          tx = this._lookAway.x * flip;
          ty = this._lookAway.y;
        }
        const g = this._gaze;
        g.x += (tx - g.x) * 0.2;
        g.y += (ty - g.y) * 0.2;
        const root = this.$.root;
        root.style.setProperty("--gx", g.x.toFixed(2));
        root.style.setProperty("--gy", g.y.toFixed(2));
        root.style.setProperty("--tilt", (g.x * 1.4 * flip).toFixed(2));
        if (Math.abs(tx - g.x) > 0.03 || Math.abs(ty - g.y) > 0.03) this._raf = requestAnimationFrame(step);
      };
      this._raf = requestAnimationFrame(step);
    }

    /* ── vida própria ── */
    _loops() {
      // reiatsu desce devagar; com fome o Hollowzinho avisa
      this._tick = setInterval(() => {
        if (document.hidden) return;
        const sleeping = this.mode === "sleeping";
        this.s.reiatsu = clamp(this.s.reiatsu - (sleeping ? 0.15 : 0.5), 0, 100);
        this._meters();
        if (!sleeping && this.s.reiatsu < 30 && Math.random() < 0.25 && this.mode === "idle") this.say(pick(this._t.hungry), 2600);
        if (!sleeping && Date.now() - this._lastActive > 70000 && this.mode === "idle") this.sleep();
        if (Math.round(this.s.reiatsu) % 5 === 0) this._save();
      }, 10000);
      this._idle();
    }

    _idle() {
      const next = 7000 + Math.random() * 9000;
      this._schedule(() => {
        if (!document.hidden && this.mode === "idle" && !reduced()) {
          const r = Math.random();
          if (r < 0.3) this._lookAround();
          else if (r < 0.5) this._anim("hop");
          else if (r < 0.65) this._anim("wag", 1900);
          else if (r < 0.8) this._yawn();
          else this.say(pick(this._t.idle), 3200);
        } else if (!document.hidden && this.mode === "idle" && Math.random() < 0.3) this.say(pick(this._t.idle), 3200);
        this._idle();
      }, next);
    }

    _lookAround() {
      const seq = [
        { x: -3.4, y: -0.5 },
        { x: 3.4, y: 0.4 },
        { x: 0, y: -2.6 },
        null,
      ];
      seq.forEach((v, i) =>
        this._schedule(() => {
          this._lookAway = v;
          this._kick();
        }, i * 900)
      );
    }

    _yawn() {
      this._setMode("yawn", 1400);
      this.$.root.dataset.eyes = "happy";
      this._schedule(() => this.mode === "idle" && (this.$.root.dataset.eyes = "open"), 1450);
    }

    /* ── arrastar e encaixar ── */
    _beginDrag(e) {
      this._dragging = true;
      this._endAim();
      this.$.root.classList.remove("open");
      this._setMode("dragging");
      this.say("", 0);
      const r = this._rect();
      this._grab = { dx: e.clientX - r.left, dy: e.clientY - r.top, size: r.width };
      this.$.root.style.transition = "none";
    }

    _drag(e) {
      const g = this._grab;
      const x = e.clientX - g.dx;
      const y = e.clientY - g.dy;
      this.$.root.style.setProperty("--x", x + "px");
      this.$.root.style.setProperty("--y", y + "px");
      this._pointer = { x: e.clientX, y: e.clientY };
    }

    _endDrag() {
      this._dragging = false;
      const r = this._rect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const w = document.documentElement.clientWidth || innerWidth;
      const h = document.documentElement.clientHeight || innerHeight;
      const corner = (cy < h / 2 ? "t" : "b") + (cx < w / 2 ? "l" : "r");
      const from = { x: r.left, y: r.top };
      this.s.corner = corner;
      this._layout(false);
      this._save();
      const to = this._pos;
      this._setMode("idle");
      if (reduced()) return;
      this.$.root.animate(
        [{ transform: `translate3d(${from.x}px,${from.y}px,0)` }, { transform: `translate3d(${to.x}px,${to.y}px,0)` }],
        { duration: 560, easing: "cubic-bezier(.34,1.45,.64,1)" }
      );
      this._schedule(() => this._anim("land"), 420);
    }

    /* ── efeitos pequenos ── */
    _box() {
      return this.$.fx.getBoundingClientRect();
    }

    _hearts(n, burst) {
      const size = this._size();
      const calm = reduced();
      for (let i = 0; i < n; i++) {
        const h = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        h.setAttribute("viewBox", "0 0 24 24");
        h.setAttribute("class", i % 3 === 2 ? "spark" : "heart");
        h.innerHTML = i % 3 === 2 ? '<path d="M12 1l2.6 8.4L23 12l-8.4 2.6L12 23l-2.6-8.4L1 12l8.4-2.6z"/>' : ICON.pet;
        this.$.fx.appendChild(h);
        // corações saem pelos dois lados da cabeça, para não ficarem atrás do balão
        const side = i % 2 ? 1 : -1;
        const x0 = size * (0.5 + side * (0.18 + Math.random() * 0.26)) - 9;
        const y0 = size * (0.1 + Math.random() * 0.22);
        const dx = side * (8 + Math.random() * size * 0.34) * (burst ? 1.4 : 1);
        const dy = -(size * (0.5 + Math.random() * 0.5)) * (burst ? 1.3 : 1);
        const s = 0.7 + Math.random() * 0.8;
        if (calm) {
          h.style.transform = `translate(${x0}px,${y0}px)`;
          h.animate([{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }], { duration: 900, delay: i * 40 }).onfinish = () => h.remove();
          continue;
        }
        const a = h.animate(
          [
            { transform: `translate(${x0}px,${y0}px) scale(.2) rotate(0deg)`, opacity: 0 },
            { transform: `translate(${x0 + dx * 0.3}px,${y0 + dy * 0.35}px) scale(${s}) rotate(${(Math.random() - 0.5) * 30}deg)`, opacity: 1, offset: 0.25 },
            { transform: `translate(${x0 + dx}px,${y0 + dy}px) scale(${s * 0.9}) rotate(${(Math.random() - 0.5) * 50}deg)`, opacity: 0 },
          ],
          { duration: 1100 + Math.random() * 600, delay: i * 70, easing: "cubic-bezier(.2,.7,.3,1)", fill: "backwards" }
        );
        a.onfinish = () => h.remove();
      }
    }

    _orbs() {
      if (reduced()) return;
      const size = this._size();
      const m = { x: size * 0.5, y: size * 0.58 };
      const flip = this.s.corner[1] === "l" ? -1 : 1;
      for (let i = 0; i < 3; i++) {
        const o = document.createElement("i");
        o.className = "orb";
        this.$.fx.appendChild(o);
        const sx = m.x - flip * size * (0.9 + i * 0.12);
        const sy = m.y - size * (0.9 + i * 0.1);
        const a = o.animate(
          [
            { transform: `translate(${sx}px,${sy}px) scale(.5)`, opacity: 0 },
            { transform: `translate(${sx + (m.x - sx) * 0.3}px,${sy - 14}px) scale(1)`, opacity: 1, offset: 0.3 },
            { transform: `translate(${m.x - 7}px,${m.y - 7}px) scale(.35)`, opacity: 0.2 },
          ],
          { duration: 640, delay: i * 140, easing: "cubic-bezier(.5,0,.8,.4)", fill: "backwards" }
        );
        a.onfinish = () => o.remove();
      }
      this._schedule(() => this.$.root.classList.add("anim-pulse"), 560);
      this._schedule(() => this.$.root.classList.remove("anim-pulse"), 1500);
    }

    _zzz() {
      if (this.mode !== "sleeping") return;
      const size = this._size();
      if (!reduced()) {
        const left = this.s.corner[1] === "l";
        ["z", "Z", "Z"].forEach((ch, i) => {
          const z = document.createElement("span");
          z.className = "zzz";
          z.textContent = ch;
          this.$.fx.appendChild(z);
          const x0 = size * (left ? 0.34 : 0.6) + i * 9 * (left ? -1 : 1) * -1;
          const y0 = size * 0.14;
          const big = 0.9 + i * 0.35;
          const a = z.animate(
            [
              { transform: `translate(${x0}px,${y0}px) scale(${big * 0.5})`, opacity: 0 },
              { transform: `translate(${x0 + 8}px,${y0 - size * 0.16}px) scale(${big})`, opacity: 0.95, offset: 0.35 },
              { transform: `translate(${x0 + 18 + i * 6}px,${y0 - size * (0.38 + i * 0.08)}px) scale(${big * 1.4})`, opacity: 0 },
            ],
            { duration: 2600, delay: i * 650, easing: "ease-out", fill: "backwards" }
          );
          a.onfinish = () => z.remove();
        });
      }
      this._schedule(() => this._zzz(), 3200);
    }

    /* ── Cero ── */
    _chargeOrb(power = 1) {
      const m = this._mouth();
      const size = (this._size() * 0.5 + 18) * power;
      const o = document.createElement("div");
      o.className = "charge";
      this.$.layer.appendChild(o);
      o.style.width = o.style.height = size + "px";
      const a = o.animate(
        [
          { transform: `translate(${m.x - size / 2}px,${m.y - size / 2}px) scale(.05)`, opacity: 0.2 },
          { transform: `translate(${m.x - size / 2}px,${m.y - size / 2}px) scale(1)`, opacity: 1 },
        ],
        { duration: 600, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" }
      );
      this._chargeEl = o;
      this._chargeAnim = a;
      // partículas sugadas para a boca
      if (!reduced()) {
        for (let i = 0; i < 9; i++) {
          const p = document.createElement("i");
          p.className = "orb";
          p.style.cssText = "width:7px;height:7px;background:#ff8aa0;box-shadow:0 0 10px 2px rgba(255,46,85,.8)";
          this.$.layer.appendChild(p);
          const ang = Math.random() * Math.PI * 2;
          const rad = 60 + Math.random() * 50;
          const pa = p.animate(
            [
              { transform: `translate(${m.x + Math.cos(ang) * rad}px,${m.y + Math.sin(ang) * rad}px) scale(1)`, opacity: 0 },
              { opacity: 1, offset: 0.3 },
              { transform: `translate(${m.x}px,${m.y}px) scale(.2)`, opacity: 0 },
            ],
            { duration: 520, delay: i * 55, easing: "ease-in", fill: "backwards" }
          );
          pa.onfinish = () => p.remove();
        }
      }
    }

    _beginCharge() {
      this._setMode("charging");
      this._chargeOrb(1);
      this._ringPulse();
    }

    _ringPulse() {
      if (this.mode !== "charging") return;
      const m = this._mouth();
      const r = document.createElement("div");
      r.className = "ring";
      this.$.layer.appendChild(r);
      const s = 70;
      r.style.width = r.style.height = s + "px";
      const a = r.animate(
        [
          { transform: `translate(${m.x - s / 2}px,${m.y - s / 2}px) scale(2.2)`, opacity: 0 },
          { opacity: 0.9, offset: 0.4 },
          { transform: `translate(${m.x - s / 2}px,${m.y - s / 2}px) scale(.3)`, opacity: 0 },
        ],
        { duration: 520, easing: "ease-in" }
      );
      a.onfinish = () => r.remove();
      this._schedule(() => this._ringPulse(), 380);
    }

    _cancelCharge() {
      this._chargeEl?.remove();
      this._chargeEl = null;
      this._setMode("idle");
    }

    _releaseCharge(held) {
      const power = clamp(0.7 + (held - 420) / 1500, 0.7, 1.35);
      this._chargeEl?.remove();
      this._chargeEl = null;
      this.cero({ power });
    }

    _fire(m, t, power) {
      const L = this.$.layer;
      const W = innerWidth;
      const H = innerHeight;
      const dx = t.x - m.x;
      const dy = t.y - m.y;
      const ang = Math.atan2(dy, dx);
      const len = Math.hypot(W, H) * 1.15;
      const bh = 50 * power;
      this._chargeEl?.remove();
      this._chargeEl = null;
      const rm = reduced();

      // recuo do bichinho
      const away = Math.cos(ang) > 0 ? -1 : 1;
      this.$.root.style.setProperty("--rx", away * 7 + "px");
      this._anim("recoil", 600);

      // clarão na tela
      const f = document.createElement("div");
      f.className = "flash";
      f.style.background = `radial-gradient(circle at ${m.x}px ${m.y}px,rgba(255,226,232,.55),rgba(255,46,85,.22) 38%,rgba(255,46,85,0) 75%)`;
      L.appendChild(f);
      f.animate([{ opacity: 0 }, { opacity: 1, offset: 0.12 }, { opacity: 0 }], { duration: rm ? 260 : 520, easing: "ease-out" }).onfinish = () => f.remove();

      // raio
      const b = document.createElement("div");
      b.className = "beam";
      b.style.cssText = `--bh:${bh}px;width:${len}px;transform:translate(${m.x}px,${m.y}px) rotate(${ang}rad)`;
      b.innerHTML = '<i class="b-glow"></i><i class="b-mid"></i><i class="b-core"></i>';
      L.appendChild(b);
      const base = `translate(${m.x}px,${m.y}px) rotate(${ang}rad)`;
      const grow = rm
        ? [{ transform: `${base} scaleX(1)`, opacity: 0 }, { transform: `${base} scaleX(1)`, opacity: 1, offset: 0.2 }, { transform: `${base} scaleX(1)`, opacity: 0 }]
        : [
            { transform: `${base} scaleX(0) scaleY(.5)`, opacity: 1 },
            { transform: `${base} scaleX(1) scaleY(1.08)`, opacity: 1, offset: 0.1 },
            { transform: `${base} scaleX(1) scaleY(1)`, opacity: 1, offset: 0.55 },
            { transform: `${base} scaleX(1) scaleY(.05)`, opacity: 0 },
          ];
      b.animate(grow, { duration: rm ? 300 : 780, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" }).onfinish = () => b.remove();

      // clarão na boca
      const mf = document.createElement("div");
      mf.className = "charge";
      const ms = 120 * power;
      mf.style.width = mf.style.height = ms + "px";
      L.appendChild(mf);
      mf.animate(
        [
          { transform: `translate(${m.x - ms / 2}px,${m.y - ms / 2}px) scale(.3)`, opacity: 1 },
          { transform: `translate(${m.x - ms / 2}px,${m.y - ms / 2}px) scale(1.5)`, opacity: 0 },
        ],
        { duration: 380, easing: "ease-out" }
      ).onfinish = () => mf.remove();

      // impacto
      if (t.x >= 0 && t.x <= W && t.y >= 0 && t.y <= H) this._impact(t, power, rm);

      // fumaça
      if (!rm) {
        for (let i = 0; i < 5; i++) {
          const p = document.createElement("i");
          p.className = "puff";
          L.appendChild(p);
          const o = (Math.random() - 0.5) * 18;
          p.animate(
            [
              { transform: `translate(${m.x + o}px,${m.y}px) scale(.4)`, opacity: 0.9 },
              { transform: `translate(${m.x + o + Math.cos(ang) * 30 * (i + 1) * 0.5}px,${m.y - 30 - i * 10}px) scale(2.2)`, opacity: 0 },
            ],
            { duration: 900 + i * 90, delay: 120 + i * 60, easing: "ease-out", fill: "backwards" }
          ).onfinish = () => p.remove();
        }
      }

      // tremor opcional no alvo configurado
      const sel = this.getAttribute("shake");
      const el = sel && !rm ? document.querySelector(sel) : null;
      if (el) {
        const amp = 7 * power;
        el.animate(
          [0, 1, 2, 3, 4, 5, 6].map((i) => ({ transform: `translate(${(i % 2 ? 1 : -1) * amp * (1 - i / 7)}px,${(i % 3 ? 1 : -1) * amp * 0.5 * (1 - i / 7)}px)` })).concat({ transform: "translate(0,0)" }),
          { duration: 420, easing: "ease-out" }
        );
      }
    }

    _impact(t, power, rm) {
      const L = this.$.layer;
      const s0 = 110 * power;
      const sc = document.createElement("div");
      sc.className = "scorch";
      sc.style.width = sc.style.height = s0 * 1.7 + "px";
      L.appendChild(sc);
      sc.animate(
        [
          { transform: `translate(${t.x - s0 * 0.85}px,${t.y - s0 * 0.85}px) scale(.2)`, opacity: 1 },
          { transform: `translate(${t.x - s0 * 0.85}px,${t.y - s0 * 0.85}px) scale(1)`, opacity: 0.9, offset: 0.25 },
          { transform: `translate(${t.x - s0 * 0.85}px,${t.y - s0 * 0.85}px) scale(1.15)`, opacity: 0 },
        ],
        { duration: rm ? 400 : 1500, easing: "ease-out" }
      ).onfinish = () => sc.remove();
      if (rm) return;
      const r = document.createElement("div");
      r.className = "ring";
      const rs = 80;
      r.style.width = r.style.height = rs + "px";
      L.appendChild(r);
      r.animate(
        [
          { transform: `translate(${t.x - rs / 2}px,${t.y - rs / 2}px) scale(.2)`, opacity: 1 },
          { transform: `translate(${t.x - rs / 2}px,${t.y - rs / 2}px) scale(${2.8 * power})`, opacity: 0 },
        ],
        { duration: 700, easing: "cubic-bezier(.1,.7,.2,1)" }
      ).onfinish = () => r.remove();
      for (let i = 0; i < 12; i++) {
        const p = document.createElement("i");
        p.className = "orb";
        p.style.cssText = "width:6px;height:6px;background:#ffd1da;box-shadow:0 0 10px 2px rgba(255,46,85,.9)";
        L.appendChild(p);
        const a = (i / 12) * Math.PI * 2 + Math.random() * 0.4;
        const d = (50 + Math.random() * 90) * power;
        p.animate(
          [
            { transform: `translate(${t.x}px,${t.y}px) scale(1)`, opacity: 1 },
            { transform: `translate(${t.x + Math.cos(a) * d}px,${t.y + Math.sin(a) * d + 18}px) scale(.2)`, opacity: 0 },
          ],
          { duration: 600 + Math.random() * 400, easing: "cubic-bezier(.1,.8,.3,1)" }
        ).onfinish = () => p.remove();
      }
    }
  }

  customElements.define("hollow-pet", HollowPet);
  window.HollowPet = HollowPet;
  if (typeof module !== "undefined" && module.exports) module.exports = HollowPet;
})();
