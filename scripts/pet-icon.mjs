#!/usr/bin/env node
// Gera o ícone da extensão do pet (vscode/pet/media/icon.png, 256x256) com o próprio <hollow-pet>.
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { launchChromium, serve } from "./lib/static-server.mjs";

const ROOT = join(fileURLToPath(new URL("..", import.meta.url)));
const { url, close } = await serve();
const browser = await launchChromium();
try {
  const page = await browser.newPage({ viewport: { width: 256, height: 256 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;background:transparent}
    .tile{width:256px;height:256px;border-radius:52px;overflow:hidden;position:relative;
      background:radial-gradient(ellipse 80% 60% at 50% 105%,#8a1636 0%,#3a0b1c 45%,#0e0e11 100%)}
    .tile::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 78% 18%,rgba(244,239,227,.55) 0 3px,transparent 4px),radial-gradient(circle at 22% 26%,rgba(244,239,227,.5) 0 2px,transparent 3px),radial-gradient(circle at 86% 40%,rgba(244,239,227,.4) 0 2px,transparent 3px),radial-gradient(circle at 12% 12%,rgba(244,239,227,.4) 0 1.5px,transparent 2.5px)}
    hollow-pet{position:absolute;left:18px;top:30px}
  </style><div class="tile"><hollow-pet inline static no-persist size="220"></hollow-pet></div>`);
  await page.addScriptTag({ url: `${url}/pet/hollow-pet.js` });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const png = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: 256, height: 256 } });
  await writeFile(join(ROOT, "vscode/pet/media/icon.png"), png);
  console.log("•  vscode/pet/media/icon.png");
} finally {
  await browser.close();
  await close();
}
