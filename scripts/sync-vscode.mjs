#!/usr/bin/env node
// A extensão do VS Code carrega uma cópia de pet/hollow-pet.js (o .vsix só leva o que está dentro de vscode/pet).
//   node scripts/sync-vscode.mjs           copia pet/hollow-pet.js e a licença para a extensão
//   node scripts/sync-vscode.mjs --check   só confere; sai com 1 se a cópia estiver velha (roda no npm test)
import { copyFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL("..", import.meta.url)));
const PAIRS = [
  ["pet/hollow-pet.js", "vscode/pet/media/hollow-pet.js"],
  ["LICENSE", "vscode/pet/LICENSE"],
  ["LICENSE", "vscode/theme/LICENSE"],
];
const check = process.argv.includes("--check");

let stale = 0;
for (const [from, to] of PAIRS) {
  const a = await readFile(join(ROOT, from));
  const b = await readFile(join(ROOT, to)).catch(() => null);
  const same = b && a.equals(b);
  if (!same) stale++;
  if (check) console.log(`${same ? "ok  " : "FAIL"} ${to}${same ? "" : `  (difere de ${from}; rode npm run sync)`}`);
  else if (!same) {
    await copyFile(join(ROOT, from), join(ROOT, to));
    console.log(`•  ${from} → ${to}`);
  }
}
if (check) process.exit(stale ? 1 : 0);
if (!stale) console.log("Nada a copiar: tudo em dia.");
