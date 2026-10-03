#!/usr/bin/env node
// Junta a página de demonstração num arquivo só (CSS, JS e fontes embutidos): dist/hueco-mundo.html.
//   node scripts/bundle.mjs            usa o título do index.html
//   TITLE="Hueco Mundo" node scripts/bundle.mjs
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const MIME = { ".woff2": "font/woff2", ".png": "image/png", ".svg": "image/svg+xml" };

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

let html = await readFile(join(ROOT, "index.html"), "utf8");

for (const m of [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">\s*/g)]) {
  html = html.replace(m[0], `<style>\n${await css(join(ROOT, m[1]))}\n</style>\n`);
}
for (const m of [...html.matchAll(/<script src="([^"]+)"><\/script>/g)]) {
  const js = (await readFile(join(ROOT, m[1]), "utf8")).replace(/<\/script/gi, "<\\/script");
  html = html.replace(m[0], () => `<script>\n${js}\n</script>`);
}
if (process.env.TITLE) html = html.replace(/<title>.*?<\/title>/, `<title>${process.env.TITLE}</title>`);

await mkdir(join(ROOT, "dist"), { recursive: true });
const out = join(ROOT, "dist/hueco-mundo.html");
await writeFile(out, html);
console.log(`${out}  (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB)`);
