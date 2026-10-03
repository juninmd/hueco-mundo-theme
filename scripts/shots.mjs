#!/usr/bin/env node
// Gera os prints de docs/shots/ a partir da página de demonstração, num Chromium de verdade.
//   node scripts/shots.mjs            todos
//   node scripts/shots.mjs hero cero  só os que contêm esses nomes
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { launchChromium, serve } from "./lib/static-server.mjs";

const OUT = join(fileURLToPath(new URL("..", import.meta.url)), "docs/shots");
const only = process.argv.slice(2);
const want = (name) => !only.length || only.some((o) => name.includes(o));
await mkdir(OUT, { recursive: true });

const { url, close } = await serve();
const browser = await launchChromium();
const PET = "hollow-pet:not([inline])";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function open({ w = 1600, h = 900, scale = 1, path = "/index.html?still", mobile = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: scale, hasTouch: mobile, isMobile: mobile, locale: "pt-BR", colorScheme: "dark" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.error("pageerror:", e.message));
  await page.goto(url + path, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  return { page, ctx };
}

const petBox = (page) => page.locator(`${PET} .pet`).boundingBox();
const petClip = async (page, up = 300, left = 300) => {
  const b = await petBox(page);
  const vp = page.viewportSize();
  const x = Math.max(0, b.x - left);
  const y = Math.max(0, b.y - up);
  return { x, y, width: Math.min(vp.width, b.x + b.width + 24) - x, height: Math.min(vp.height, b.y + b.height + 24) - y };
};
const call = (page, fn, arg) => page.evaluate(([s, f, a]) => document.querySelector(s)[f](a), [PET, fn, arg]);
const save = async (target, name, opts = {}) => {
  console.log("•", name);
  await target.screenshot({ path: join(OUT, name + ".png"), ...opts });
};
/** Congela os efeitos do pet num instante (ms) para o print pegar o pico, não o rastro. O tremor da página termina. */
const freeze = (page, ms) =>
  page.evaluate(
    ([s, t]) => {
      for (const a of document.querySelector(s).shadowRoot.getAnimations()) {
        a.pause();
        a.currentTime = t;
      }
      for (const a of document.getAnimations()) if (a.effect?.target?.tagName === "MAIN") a.finish();
    },
    [PET, ms]
  );
const hideChrome = (page) => page.addStyleTag({ content: `.nav, ${PET} { display: none !important }` });

try {
  if (want("hero")) {
    const { page, ctx } = await open();
    await wait(2300);
    await save(page, "01-hero");
    await ctx.close();
  }

  const sections = [
    ["02-paleta", "#paleta"],
    ["03-componentes", "#componentes"],
    ["04-canto", "#canto"],
    ["05-editor", "#editor"],
    ["06-pet", "#pet"],
  ].filter(([n]) => want(n));
  if (sections.length) {
    const { page, ctx } = await open();
    await hideChrome(page);
    for (const [name, sel] of sections) {
      await page.locator(sel).scrollIntoViewIfNeeded();
      await wait(250);
      await save(page.locator(sel), name);
    }
    await ctx.close();
  }

  if (want("estados")) {
    const { page, ctx } = await open({ w: 1300, h: 900, path: "/site/pet-lab.html" });
    await wait(900);
    await save(page, "07-pet-estados", { fullPage: true });
    await ctx.close();
  }

  const petShots = ["carinho", "bandeja", "cero", "mira", "dormindo"].filter((n) => want(n));
  for (const kind of petShots) {
    const { page, ctx } = await open({ scale: kind === "cero" || kind === "mira" ? 1 : 2 });
    await wait(1200);
    const b = await petBox(page);
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    if (kind === "carinho") {
      await page.mouse.move(cx, cy);
      await page.mouse.click(cx, cy);
      await wait(520);
      await page.mouse.move(cx - 20, cy - 220);
      await freeze(page, 520);
      await save(page, "08-pet-carinho", { clip: await petClip(page, 230, 250) });
    } else if (kind === "bandeja") {
      await call(page, "say", "Cheguei! Tô de olho no seu código.");
      await page.mouse.move(cx, cy);
      await wait(700);
      await save(page, "09-pet-bandeja", { clip: await petClip(page, 360, 270) });
    } else if (kind === "cero") {
      await call(page, "setStats", { reiatsu: 100, bond: 6 });
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await wait(1500);
      await page.mouse.up();
      await wait(60);
      await freeze(page, 150);
      await save(page, "10-pet-cero");
    } else if (kind === "mira") {
      await call(page, "setStats", { reiatsu: 100, bond: 6 });
      await call(page, "aim");
      await page.mouse.move(930, 470);
      await wait(350);
      await save(page, "11-pet-mira");
    } else if (kind === "dormindo") {
      await call(page, "sleep");
      await page.mouse.move(cx - 400, cy - 300);
      await wait(2900);
      await freeze(page, 1250);
      await save(page, "12-pet-dormindo", { clip: await petClip(page, 230, 250) });
    }
    await ctx.close();
  }

  if (want("canto-real")) {
    // prancha com os prints do app real (docs/shots/canto/), que vêm do front-end do canto-widget com dados fictícios
    const { page, ctx } = await open({ w: 1600, h: 700, path: "/site/board.html" });
    await wait(500);
    await save(page.locator("#board"), "14-canto-real");
    await ctx.close();
  }

  if (want("mobile")) {
    const { page, ctx } = await open({ w: 390, h: 844, scale: 2, mobile: true });
    await wait(2200);
    await save(page, "13-mobile");
    await ctx.close();
  }
} finally {
  await browser.close();
  await close();
}
