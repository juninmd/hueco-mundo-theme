#!/usr/bin/env node
// Gera as prévias do plugin do Claude Code em docs/claude-code/*.png.
//
// A saída vem do próprio plugin, não de um desenho à parte: um teste (rodado por `claude plugin test`) conduz o bicho pelas
// cenas (apresentação, caça, bugs, o Cero em cada quadro, o painel) e imprime as árvores que o plugin desenhou. Este script
// pinta essas árvores num HTML que imita um terminal (o Raster vira meias-células ▀ com a cor de cima e a de baixo) e fotografa
// com o Chromium. Não é um print do Claude Code de verdade: é o que o plugin entrega ao Claude Code, na mesma grade de células.
//
//   node scripts/claude-plugin-preview.mjs            as que o README do plugin usa (a prévia do desktop)
//   node scripts/claude-plugin-preview.mjs --all      todas, uma imagem por cena e por quadro do Cero
//   node scripts/claude-plugin-preview.mjs cero       só as cenas cujo nome contém "cero"
//
// Os prints do terminal no README são do Claude Code de verdade, rodando o plugin dentro do tmux; o desktop não tem como ser
// capturado assim, então a prévia dele sai daqui.
//
// Precisa do `claude` (para o `claude plugin test`) e do Chromium do Playwright.
import { cp, mkdtemp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { launchChromium } from "./lib/static-server.mjs";

const ROOT = join(fileURLToPath(new URL("..", import.meta.url)));
const PLUGIN = join(ROOT, "claude-code/hollowzinho");
const OUT = join(ROOT, "docs/claude-code");
const FONT = pathToFileURL(join(ROOT, "theme/fonts/jetbrains-mono-latin-wght-normal.woff2")).href;
const args = process.argv.slice(2);
const all = args.includes("--all");
const only = args.filter((a) => !a.startsWith("--"));
// As cenas que o README usa e o nome do arquivo de cada uma.
const KEEP = { "d-band-bugs": "desktop-band", "d-cero-4": "desktop-cero", "d-pane": "desktop-pane" };
const want = (name) => (only.length ? only.some((o) => name.includes(o)) : all || name in KEEP);
const fileOf = (name) => (only.length || all ? name : KEEP[name]);

/* ───────────────────────── 1. as cenas, vindas do plugin ───────────────────────── */

const SCENES = `
import { test } from 'claude-code/testing'
import { BAND, PANE, WITH, T0, probe, say, start, world } from './support'

const out = async (name: string, ui: { drawn: () => Promise<unknown> }, extra: Record<string, unknown> = {}) =>
  console.log('PREVIEW ' + JSON.stringify({ name, ...extra, tree: await ui.drawn() }))

const SAVED = JSON.stringify({ v: 1, reiatsu: 74, bond: 18, hunted: 12, hidden: false, seen: true, t: T0 })

for (const surface of ['terminal', 'desktop'] as const) {
  const k = surface === 'terminal' ? 't' : 'd'

  test('faixa: do primeiro oi ao Cero em cada quadro ' + surface, WITH, async ($, on) => {
    const w = world(on)
    await probe($, SAVED)
    await start($)
    const ui = await $.ui.mount({ ...BAND, surface })
    await out(k + '-band-quiet', ui, { surface })
    await $.prompt.submit({ text: 'conserte o parser', wait: false, origin: { kind: 'composer' } } as never)
    await $.turn.start({ text: 'conserte o parser', turnId: 't1' })
    await w.clock.advance(7_000)
    await out(k + '-band-hunt', ui, { surface })
    w.outcomes.set('npm test', 'fail')
    w.outcomes.set('tsc --noEmit', 'fail')
    await $.tool.call({ tool: 'Bash', command: 'npm test' })
    await w.clock.advance(5_000)
    await $.tool.call({ tool: 'Bash', command: 'tsc --noEmit' })
    await out(k + '-band-bugs', ui, { surface })
    w.outcomes.set('npm test', 'ok')
    await $.tool.call({ tool: 'Bash', command: 'npm test -- --run' })
    for (let i = 0; i < 9; i++) {
      await out(k + '-cero-' + i, ui, { surface })
      await w.clock.advance(90)
    }
    await out(k + '-band-killed', ui, { surface })
    await w.clock.advance(6_000)
    await $.turn.complete({ answer: 'pronto', durationMs: 9000, isAborted: false, turnId: 't1', reason: 'answer' } as never)
    await say($, 'sleep')
    await out(k + '-band-sleep', ui, { surface })
  })

  test('painel ' + surface, WITH, async ($, on) => {
    const w = world(on)
    await probe($, SAVED)
    await start($)
    w.outcomes.set('npm test', 'fail')
    w.outcomes.set('cargo build', 'fail')
    await $.tool.call({ tool: 'Bash', command: 'cargo build' })
    await $.tool.call({ tool: 'Bash', command: 'npm test' })
    await $.tool.call({ tool: 'Bash', command: 'npm test' })
    await $.tool.call({ tool: 'Bash', command: 'npm test' })
    const ui = await $.ui.mount({ ...PANE, surface })
    await out(k + '-pane', ui, { surface })
  })
}
`;

function runScenes() {
  // PREVIEW_TMP muda onde a cópia do plugin é feita (o Chromium usa o /tmp do sistema: o caminho do perfil dele não pode ser comprido).
  return mkdtemp(join(process.env.PREVIEW_TMP || tmpdir(), "hollowzinho-preview-")).then(async (tmp) => {
    const copy = join(tmp, "hollowzinho");
    await cp(PLUGIN, copy, { recursive: true, filter: (p) => !/\.claude-plugin[\\/]types|[\\/]docs([\\/]|$)/.test(p) });
    for (const f of await readdir(join(copy, "tests"))) if (/\.test\./.test(f)) await rm(join(copy, "tests", f));
    await writeFile(join(copy, "tests/zz-preview.test.tsx"), SCENES);
    const r = spawnSync("claude", ["plugin", "test", copy], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
    await rm(tmp, { recursive: true, force: true });
    if (r.status !== 0) throw new Error(`claude plugin test falhou (${r.status}):\n${(r.stdout || "").slice(-2000)}${(r.stderr || "").slice(-1000)}`);
    // o console.log do teste sai pelo stderr
    return `${r.stdout || ""}\n${r.stderr || ""}`
      .split("\n")
      .filter((l) => l.startsWith("PREVIEW "))
      .map((l) => JSON.parse(l.slice(8)));
  });
}

/* ───────────────────────── 2. as árvores viram HTML ───────────────────────── */

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const hex = (n) => `#${n.toString(16).padStart(6, "0")}`;

/** Lê as células de um Raster: [glifo, frente, fundo] em u32 little-endian, base64. */
function cellsOf(b64) {
  const buf = Buffer.from(b64, "base64");
  const out = [];
  for (let o = 0; o + 12 <= buf.length; o += 12) out.push([buf.readUInt32LE(o), buf.readUInt32LE(o + 4), buf.readUInt32LE(o + 8)]);
  return out;
}

const DEFAULT = 0x01000000;

function raster(props) {
  const cells = cellsOf(props.cells);
  const bg = (v) => (v === DEFAULT ? "transparent" : hex(v));
  let html = `<div class="raster" style="grid-template-columns:repeat(${props.columns},var(--cw));grid-template-rows:repeat(${props.rows},var(--ch))">`;
  for (const [glyph, fg, back] of cells) {
    let top = "transparent";
    let bottom = "transparent";
    if (glyph === 0x2588) top = bottom = bg(fg);
    else if (glyph === 0x2580) { top = bg(fg); bottom = bg(back); }
    else if (glyph === 0x2584) { bottom = bg(fg); top = bg(back); }
    html += top === bottom ? `<i style="background:${top}"></i>` : `<i style="background:linear-gradient(${top} 50%,${bottom} 50%)"></i>`;
  }
  return html + "</div>";
}

function node(n, surface) {
  if (typeof n === "string") return esc(n);
  if (typeof n === "number") return String(n);
  const p = n.props || {};
  const kids = (n.children || []).map((c) => node(c, surface)).join("");
  switch (n.type) {
    case "Box": {
      const st = [];
      st.push(`flex-direction:${p.flexDirection || "row"}`);
      if (p.gap) st.push(`${p.flexDirection === "column" ? "row-gap" : "column-gap"}:calc(var(${p.flexDirection === "column" ? "--ch" : "--cw"}) * ${p.gap})`);
      if (p.paddingX) st.push(`padding-left:calc(var(--cw) * ${p.paddingX});padding-right:calc(var(--cw) * ${p.paddingX})`);
      if (p.width) st.push(`width:${typeof p.width === "number" ? `calc(var(--cw) * ${p.width})` : p.width}`);
      if (p.height) st.push(`height:${typeof p.height === "number" ? `calc(var(--ch) * ${p.height})` : p.height}`);
      if (p.justifyContent) st.push(`justify-content:${p.justifyContent.replace("flex-", "")}`);
      if (p.alignItems) st.push(`align-items:${p.alignItems.replace("flex-", "")}`);
      if (p.flexGrow) st.push(`flex-grow:${p.flexGrow}`);
      if (p.borderStyle) st.push(`border:1px solid ${p.borderColor || "#888"};border-radius:6px;box-sizing:border-box;min-height:calc(var(--ch) * 3);align-items:center`);
      return `<div class="box" style="${st.join(";")}">${kids}</div>`;
    }
    case "Text": {
      const st = [];
      if (p.color) st.push(`color:${p.color}`);
      if (p.dimColor) st.push("opacity:.55");
      if (p.bold) st.push("font-weight:700");
      const cls = p.wrap === "wrap" ? "text soft" : p.wrap && String(p.wrap).startsWith("truncate") ? "text trunc" : "text";
      return `<span class="${cls}" style="${st.join(";")}">${kids || "&nbsp;"}</span>`;
    }
    case "Raster":
      return raster(p);
    case "Svg":
      return `<div class="svg" style="width:${p.width || 100}px;height:${p.height || 100}px">${p.source}</div>`;
    case "Button":
      return surface === "terminal" ? `<span class="tbtn">[ ${esc(p.label || "")} ]</span>` : `<span class="dbtn">${esc(p.label || "")}</span>`;
    default:
      return kids;
  }
}

const CSS = `
@font-face{font-family:"JBM";src:url("${FONT}");font-weight:100 800}
:root{--cw:8.4px;--ch:18px}
*{box-sizing:border-box}
body{margin:0;background:#0b0c10;font:14px/18px "JBM","DejaVu Sans Mono",monospace;color:#e6e1d6}
.win{width:max-content;background:#111218;border:1px solid #2c2c33;border-radius:10px;overflow:hidden}
.bar{display:flex;gap:6px;align-items:center;padding:8px 12px;background:#0d0e13;border-bottom:1px solid #23232a;color:#8b8b95;font-size:12px}
.bar b{width:10px;height:10px;border-radius:50%;background:#2c2c33;display:inline-block}
.bar span{margin-left:8px}
.body{padding:10px 0 8px}
.line{padding:0 calc(var(--cw) * 1);white-space:pre;color:#9a9aa6}
.prompt{margin:6px calc(var(--cw) * 1);padding:2px calc(var(--cw) * 1);border:1px solid #3a3a46;border-radius:6px;color:#e6e1d6}
.hint{padding:2px calc(var(--cw) * 2);color:#6c6c78;font-size:12px}
.box{display:flex;min-width:0}
.text{white-space:pre}
.soft{white-space:normal}
.trunc{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.raster{display:grid;flex:none}
.raster i{display:block}
.svg{flex:none}.svg svg{width:100%;height:100%;display:block}
.tbtn{color:#e6e1d6;white-space:pre}
.dwin{width:760px;background:#16171d;border:1px solid #2c2c33;border-radius:12px;overflow:hidden;font:14px/1.45 ui-sans-serif,system-ui,"Segoe UI",sans-serif}
.dwin .box{min-width:0}
.dwin .text{white-space:normal}
.dbtn{border:1px solid #3a3a46;border-radius:8px;padding:4px 12px;background:#1d1e26;color:#e6e1d6;font-size:13px}
.dwin .body{padding:12px 4px}
.dwin .prompt{font-family:inherit;margin:10px 14px 6px;padding:10px 14px;border-radius:10px;color:#8b8b95}
`;

const TITLES = {
  "band-quiet": "Faixa acima do prompt, em repouso",
  "band-hunt": "Um turno rodando: modo caçador",
  "band-bugs": "Dois comandos falharam: dois bugs",
  "band-killed": "O bug morreu",
  "band-sleep": "Parado, ele dorme",
  pane: "/hollowzinho: o painel",
};

function page(scene) {
  const t = scene.surface === "terminal";
  const frame = scene.name.match(/cero-(\d+)$/);
  const label = frame ? `O Cero, quadro ${Number(frame[1]) + 1} de 9` : TITLES[scene.name.replace(/^[td]-/, "")] || scene.name;
  const inner = node(scene.tree, scene.surface);
  if (t) {
    const cols = scene.name.endsWith("pane") ? 84 : 112;
    const body = scene.name.endsWith("pane")
      ? `<div class="line">  ● Claude Code</div>${inner}<div class="hint">1 carinho · 2 alimentar · 3 cero · 4 dormir · 5 esconder</div>`
      : `<div class="line">  ● Pronto. Rodei os testes e o tsc.</div><div class="line"> </div>${inner}<div class="prompt">❯ </div><div class="hint">  ? for shortcuts</div>`;
    return `<div class="win" style="width:calc(var(--cw) * ${cols} + 2px)"><div class="bar"><b></b><b></b><b></b><span>claude · ${esc(label)}</span></div><div class="body">${body}</div></div>`;
  }
  const body = scene.name.endsWith("pane") ? inner : `${inner}<div class="prompt">Escreva uma mensagem…</div>`;
  return `<div class="dwin"><div class="body">${body}</div></div>`;
}

/* ───────────────────────── 3. fotografar ───────────────────────── */

const scenes = (await runScenes()).filter((s) => want(s.name));
if (!scenes.length) throw new Error("nenhuma cena (o teste de prévia não imprimiu nada?)");
await mkdir(OUT, { recursive: true });
const browser = await launchChromium();
try {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 600 }, deviceScaleFactor: 2 });
  const tab = await ctx.newPage();
  for (const scene of scenes) {
    await tab.setContent(`<!doctype html><meta charset="utf-8"><style>${CSS}</style><body><div id="shot" style="display:inline-block;padding:14px;background:#0b0c10">${page(scene)}</div></body>`);
    await tab.evaluate(() => document.fonts.ready);
    await tab.waitForTimeout(150);
    await tab.locator("#shot").screenshot({ path: join(OUT, `${fileOf(scene.name)}.png`) });
    console.log("•", scene.name);
  }
} finally {
  await browser.close();
}
