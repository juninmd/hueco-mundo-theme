#!/usr/bin/env node
// Junta a página de demonstração num arquivo só (CSS, JS e fontes embutidos).
//   node scripts/bundle.mjs               dist/hueco-mundo.html
//   TITLE="Hueco Mundo" node scripts/bundle.mjs
//   node scripts/bundle.mjs --fragment    dist/hueco-mundo-fragment.html: só <title>, <style> e o conteúdo, sem
//                                         <html>/<head>/<body>, para hospedeiros que já embrulham a página (os tokens
//                                         passam a valer em :root e o corpo ganha o fundo do tema).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const MIME = { ".woff2": "font/woff2", ".png": "image/png", ".svg": "image/svg+xml" };
const fragment = process.argv.includes("--fragment");

async function css(file) {
  let text = await readFile(file, "utf8");
  // @import url("./x.css") vira o conteúdo de x.css, recursivamente
  for (const m of [...text.matchAll(/@import\s+url\(["']?([^"')]+)["']?\)\s*;?/g)]) {
    text = text.replace(m[0], await css(resolve(dirname(file), m[1])));
  }
  // url(./fonts/x.woff2) vira data URI
  for (const m of [...text.matchAll(/url\(["']?(\.[^"')]+\.(?:woff2|png|svg))["']?\)/g)]) {
    const bytes = await readFile(resolve(dirname(file), m[1]));
    text = text.replace(m[0], `url("data:${MIME[extname(m[1])]};base64,${bytes.toString("base64")}")`);
  }
  return text;
}

async function inlineScripts(text) {
  for (const m of [...text.matchAll(/<script src="([^"]+)"><\/script>/g)]) {
    const js = (await readFile(join(ROOT, m[1]), "utf8")).replace(/<\/script/gi, "<\\/script");
    text = text.replace(m[0], () => `<script>\n${js}\n</script>`);
  }
  return text;
}

const source = await readFile(join(ROOT, "index.html"), "utf8");
const title = process.env.TITLE ? `<title>${process.env.TITLE}</title>` : source.match(/<title>.*?<\/title>/)[0];
const links = [...source.matchAll(/<link rel="stylesheet" href="([^"]+)">\s*/g)];

let html;
if (!fragment) {
  html = source.replace(/<title>.*?<\/title>/, title);
  for (const m of links) html = html.replace(m[0], `<style>\n${await css(join(ROOT, m[1]))}\n</style>\n`);
  html = await inlineScripts(html);
} else {
  let styles = "";
  for (const m of links) styles += `<style>\n${await css(join(ROOT, m[1]))}\n</style>\n`;
  // Os tokens passam a valer em :root, já que a página não escolhe os atributos de <html> nem de <body>.
  const wired = styles.replace(':root[data-skin="hueco-mundo"],\n.hueco-mundo {\n  color-scheme: dark;', ':root,\n:root[data-skin="hueco-mundo"],\n.hueco-mundo {\n  color-scheme: dark;');
  if (wired === styles) throw new Error("não achei o bloco de tokens para ligar em :root");
  const body = source.slice(source.indexOf(">", source.indexOf("<body")) + 1, source.lastIndexOf("</body>"));
  const base = "<style>\n:root { color-scheme: dark; }\nbody { margin: 0; background: var(--color-ink); color: var(--color-fg); font: 16px/1.55 var(--hm-font-sans); }\n</style>";
  html = `${title}\n${base}\n${wired}<div class="hueco-mundo">${await inlineScripts(body)}</div>\n`;
}

await mkdir(join(ROOT, "dist"), { recursive: true });
const out = join(ROOT, "dist", fragment ? "hueco-mundo-fragment.html" : "hueco-mundo.html");
await writeFile(out, html);
console.log(`${out}  (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB)`);
