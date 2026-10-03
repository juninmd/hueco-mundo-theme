#!/usr/bin/env node
// Confere o contraste WCAG 2.2 do tema: texto >= 4,5:1 (1.4.3) e bordas/ícones >= 3:1 (1.4.11).
// Lê os tokens de theme/tokens.css e as cores de sintaxe do tema do VS Code. Sai com 1 se algo reprovar.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function luminance(hex) {
  const n = parseInt(hex.slice(1, 7), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const css = readFileSync(join(root, "theme/tokens.css"), "utf8");
const block = css.slice(css.indexOf(".hueco-mundo {"));
const t = Object.fromEntries([...block.matchAll(/--hm-([a-z-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2].toLowerCase()]));

const checks = [];
const text = (name, fg, bg, min = 4.5) => checks.push({ name, fg, bg, min });

for (const bg of ["void", "night"]) {
  for (const fg of ["bone", "ash", "dust", "cero-text", "blood", "reishi", "gold"]) text(`${fg} sobre ${bg}`, t[fg], t[bg]);
}
text("on-cero sobre cero", t["on-cero"], t.cero);
text("on-cero sobre cero (hover)", t["on-cero"], "#c8133b");
text("linha sobre night (borda de controle)", t.line, t.night, 3);
text("cero sobre night (foco, marca)", t.cero, t.night, 3);
text("cero sobre void (foco, marca)", t.cero, t.void, 3);
text("void sobre reishi (botão verde)", t.void, t.reishi);

const themePath = join(root, "vscode/theme/themes/hueco-mundo-color-theme.json");
if (existsSync(themePath)) {
  const theme = JSON.parse(readFileSync(themePath, "utf8").replace(/^\s*\/\/.*$/gm, ""));
  const bg = theme.colors["editor.background"];
  const seen = new Set();
  for (const rule of theme.tokenColors) {
    const fg = rule.settings.foreground;
    if (!fg || seen.has(fg)) continue;
    seen.add(fg);
    const scope = [].concat(rule.scope ?? "base")[0];
    text(`VS Code · ${rule.name ?? scope} ${fg}`, fg.slice(0, 7), bg, rule.name === "Comentários" ? 4.5 : 4.5);
  }
  text("VS Code · editor.foreground", theme.colors["editor.foreground"], bg);
  text("VS Code · statusBar.foreground", theme.colors["statusBar.foreground"], theme.colors["statusBar.background"]);
  text("VS Code · button.foreground", theme.colors["button.foreground"], theme.colors["button.background"]);
  text("VS Code · tab ativa", theme.colors["tab.activeForeground"], theme.colors["tab.activeBackground"]);
  text("VS Code · tab inativa", theme.colors["tab.inactiveForeground"], theme.colors["tab.inactiveBackground"]);
  text("VS Code · sideBar", theme.colors["sideBar.foreground"], theme.colors["sideBar.background"]);
  text("VS Code · número de linha", theme.colors["editorLineNumber.foreground"], bg);
  for (const n of ["Red", "Green", "Yellow", "Blue", "Magenta", "Cyan", "White", "BrightBlack", "BrightRed", "BrightGreen", "BrightYellow", "BrightBlue", "BrightMagenta", "BrightCyan", "BrightWhite"]) {
    text(`VS Code · terminal ${n}`, theme.colors[`terminal.ansi${n}`], theme.colors["terminal.background"]);
  }
  text("VS Code · chip de erro da barra de status", theme.colors["statusBarItem.errorForeground"], theme.colors["statusBarItem.errorBackground"]);
  text("VS Code · chip de aviso da barra de status", theme.colors["statusBarItem.warningForeground"], theme.colors["statusBarItem.warningBackground"]);
  text("VS Code · código em linha do Markdown", theme.colors["textPreformat.foreground"], theme.colors["textPreformat.background"]);
}

let failed = 0;
for (const c of checks) {
  const r = ratio(c.fg, c.bg);
  const ok = r >= c.min;
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${r.toFixed(2).padStart(5)}:1  (min ${c.min})  ${c.name}  ${c.fg} / ${c.bg}`);
}
console.log(failed ? `\n${failed} par(es) abaixo do mínimo.` : `\nTodos os ${checks.length} pares passam.`);
process.exit(failed ? 1 : 0);
