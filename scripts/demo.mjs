#!/usr/bin/env node
// Grava uma animação curta das interações do Hollowzinho: docs/shots/pet-demo.webp (WebP animado, precisa do ffmpeg).
// DEMO_FORMAT=gif gera um GIF no lugar (bem maior).
// O Playwright não grava o cursor, então a página ganha um anel que segue o ponteiro só durante a gravação.
import { mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { launchChromium, serve } from "./lib/static-server.mjs";

const ROOT = join(fileURLToPath(new URL("..", import.meta.url)));
const FORMAT = process.env.DEMO_FORMAT === "gif" ? "gif" : "webp";
const OUT = join(ROOT, `docs/shots/pet-demo.${FORMAT}`);
const WIDTH = Number(process.env.DEMO_WIDTH) || 960;
const FPS = Number(process.env.DEMO_FPS) || (FORMAT === "gif" ? 12 : 15);
if (spawnSync("ffmpeg", ["-version"]).status !== 0) throw new Error("ffmpeg não encontrado");

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const dir = join(tmpdir(), `hm-demo-${process.pid}`);
await mkdir(dir, { recursive: true });
await mkdir(join(ROOT, "docs/shots"), { recursive: true });

const { url, close } = await serve();
const browser = await launchChromium();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir, size: { width: 1280, height: 720 } }, locale: "pt-BR", colorScheme: "dark" });
await ctx.addInitScript(() => {
  addEventListener("DOMContentLoaded", () => {
    const c = document.createElement("div");
    c.style.cssText = "position:fixed;left:0;top:0;width:26px;height:26px;margin:-13px 0 0 -13px;border:2px solid #ede9e0;border-radius:50%;box-shadow:0 0 0 1px #0008,0 0 14px #e11d48aa;pointer-events:none;z-index:2147483647;transition:transform .08s,background .08s;transform:translate(-100px,-100px)";
    document.body.appendChild(c);
    let x = -100;
    let y = -100;
    const put = (s = 1) => (c.style.transform = `translate(${x}px,${y}px) scale(${s})`);
    addEventListener("pointermove", (e) => ((x = e.clientX), (y = e.clientY), put(c.dataset.down ? 0.7 : 1)), true);
    addEventListener("pointerdown", () => ((c.dataset.down = "1"), (c.style.background = "#e11d4866"), put(0.7)), true);
    addEventListener("pointerup", () => (delete c.dataset.down, (c.style.background = ""), put(1)), true);
  });
});
const page = await ctx.newPage();
page.on("pageerror", (e) => console.error("pageerror:", e.message));
await page.goto(url + "/index.html?still", { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);

const PET = "hollow-pet:not([inline])";
const box = () => page.locator(`${PET} .pet`).boundingBox();
const center = async () => {
  const b = await box();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};
const call = (fn, arg) => page.evaluate(([s, f, a]) => document.querySelector(s)[f](a), [PET, fn, arg]);
const act = (name) => page.evaluate(([s, n]) => document.querySelector(s).shadowRoot.querySelector(`[data-act="${n}"]`).click(), [PET, name]);
const glide = (x, y, ms = 500) => page.mouse.move(x, y, { steps: Math.max(6, Math.round(ms / 35)) });

try {
  await call("setStats", { reiatsu: 100, bond: 6 });
  await wait(1500); // balão de boas-vindas

  // 1. os olhos seguem o cursor
  await glide(180, 160, 600);
  await wait(350);
  await glide(1000, 120, 700);
  await wait(200);

  // 2. passa o mouse: bandeja; clique: carinho
  let c = await center();
  await glide(c.x, c.y, 500);
  await wait(550);
  await page.mouse.click(c.x, c.y);
  await wait(1200);

  // 3. alimentar pela bandeja
  await call("setStats", { reiatsu: 35 });
  const feed = await page.locator(`${PET} [data-act="feed"]`).boundingBox();
  await glide(feed.x + feed.width / 2, feed.y + feed.height / 2, 350);
  await page.mouse.click(feed.x + feed.width / 2, feed.y + feed.height / 2);
  await wait(1500);

  // 4. segurar e soltar: Cero
  c = await center();
  await glide(c.x, c.y, 350);
  await page.mouse.down();
  await wait(1150);
  await page.mouse.up();
  await wait(1200);

  // 5. mirar num ponto da tela
  await call("setStats", { reiatsu: 100 });
  const aim = await page.locator(`${PET} [data-act="cero"]`).boundingBox();
  c = await center();
  await glide(c.x, c.y, 250);
  await wait(300);
  await glide(aim.x + aim.width / 2, aim.y + aim.height / 2, 250);
  await page.mouse.click(aim.x + aim.width / 2, aim.y + aim.height / 2);
  await wait(350);
  await glide(430, 330, 600);
  await wait(200);
  await page.mouse.click(430, 330);
  await wait(1500);

  // 6. arrastar para outro canto
  c = await center();
  await glide(c.x, c.y, 350);
  await page.mouse.down();
  await glide(c.x - 380, c.y - 260, 500);
  await glide(130, 110, 500);
  await page.mouse.up();
  await wait(1000);

  // 7. dormir
  await call("sleep");
  await glide(700, 500, 400);
  await wait(2400);
} finally {
  await ctx.close();
  await browser.close();
  await close();
}

const webm = join(dir, (await readdir(dir)).find((f) => f.endsWith(".webm")));
const gif = `fps=${FPS},scale=${WIDTH}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=160:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`;
const SKIP = ["-ss", "1.1"]; // a gravação começa antes da primeira pintura da página
const args = FORMAT === "gif"
  ? ["-vf", gif, "-loop", "0"]
  : ["-vf", `fps=${FPS},scale=${WIDTH}:-1:flags=lanczos`, "-c:v", "libwebp_anim", "-quality", "62", "-compression_level", "6", "-loop", "0"];
const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", ...SKIP, "-i", webm, ...args, OUT], { stdio: "inherit" });
await rm(dir, { recursive: true, force: true });
if (r.status !== 0) throw new Error("ffmpeg falhou");
console.log("•", OUT);
