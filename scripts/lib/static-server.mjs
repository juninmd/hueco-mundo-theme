// Servidor estático mínimo, sem dependências: usado pelos scripts e por `npm run serve`.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".md": "text/markdown; charset=utf-8",
};

/** Sobe o servidor na raiz do repositório. `port: 0` escolhe uma porta livre. */
export function serve({ port = 0, root = ROOT } = {}) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      let path = normalize(join(root, decodeURIComponent(url.pathname)));
      if (!path.startsWith(root)) throw Object.assign(new Error("fora da raiz"), { code: 403 });
      if ((await stat(path).catch(() => null))?.isDirectory()) path = join(path, "index.html");
      const body = await readFile(path);
      res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream", "cache-control": "no-store" });
      res.end(body);
    } catch (e) {
      res.writeHead(e.code === 403 ? 403 : 404, { "content-type": "text/plain; charset=utf-8" });
      res.end(e.code === 403 ? "403" : "404");
    }
  });
  return new Promise((ok) => server.listen(port, "127.0.0.1", () => ok({ server, url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((r) => server.close(r)) })));
}

/** Playwright: usa o pacote local, e cai no global se for o caso (PLAYWRIGHT_MODULE sobrepõe). */
export async function loadPlaywright() {
  const specs = [process.env.PLAYWRIGHT_MODULE, "playwright", "/opt/node22/lib/node_modules/playwright/index.mjs"].filter(Boolean);
  for (const s of specs) {
    try {
      return await import(s);
    } catch (_) {}
  }
  throw new Error("Playwright não encontrado. Rode: npm i -D playwright && npx playwright install chromium");
}

export async function launchChromium() {
  const { chromium } = await loadPlaywright();
  const exe = process.env.CHROMIUM_PATH || (await stat("/opt/pw-browsers/chromium").then(() => "/opt/pw-browsers/chromium", () => undefined));
  return chromium.launch(exe ? { executablePath: exe } : {});
}
