#!/usr/bin/env node
// Teste de fumaça do Hollowzinho num navegador de verdade: carinho, Cero, mira, arrastar, dormir, teclado,
// persistência, reduced-motion e ausência de erros no console. Sai com 1 se algo falhar.
import { launchChromium, serve } from "./lib/static-server.mjs";

const { url, close } = await serve();
const browser = await launchChromium();
const results = [];
const check = (name, ok, extra = "") => {
  results.push(ok);
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${extra ? `  (${extra})` : ""}`);
};
const errors = [];

async function open(context, path = "/index.html?still") {
  const page = await context.newPage();
  page.on("console", (m) => ["error", "warning"].includes(m.type()) && errors.push(`${m.type()}: ${m.text()}`));
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto(url + path, { waitUntil: "networkidle" });
  return page;
}

const PET = "hollow-pet:not([inline])";
const stats = (page) => page.evaluate((s) => document.querySelector(s).stats, PET);
const sh = (page, fn, arg) => page.evaluate(([s, f, a]) => new Function("el", "arg", `return (${f})(el, arg)`)(document.querySelector(s), a), [PET, fn.toString(), arg]);
const center = async (page) => {
  const b = await page.locator(`${PET} .pet`).boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2, b };
};
const waitMode = (page, mode, ms = 4000) =>
  page.waitForFunction(([s, m]) => document.querySelector(s).mode === m, [PET, mode], { timeout: ms }).then(() => true, () => false);

try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  let page = await open(ctx);

  check("custom element registrado, com shadow root", await sh(page, (el) => !!customElements.get("hollow-pet") && !!el.shadowRoot));
  check("o balão de boas-vindas aparece", await page.waitForFunction((s) => document.querySelector(s).shadowRoot.querySelector(".bubble.on"), PET, { timeout: 3000 }).then(() => true, () => false));

  let c = await center(page);
  await page.mouse.move(40, 40);
  await page.waitForTimeout(350);
  const gx = await sh(page, (el) => parseFloat(el.shadowRoot.querySelector(".root").style.getPropertyValue("--gx")));
  check("os olhos seguem o cursor", gx < -1, `--gx=${gx}`);

  await page.mouse.move(c.x, c.y);
  await page.waitForTimeout(450);
  check("passar o mouse abre a bandeja", (await sh(page, (el) => getComputedStyle(el.shadowRoot.querySelector(".tray")).opacity)) === "1");

  await page.mouse.click(c.x, c.y);
  await page.waitForTimeout(250);
  let s = await stats(page);
  check("clique faz carinho: vínculo +1 e estado feliz", s.bond === 1 && s.mode === "happy", `bond=${s.bond} mode=${s.mode}`);
  check("o carinho solta corações", (await sh(page, (el) => el.shadowRoot.querySelectorAll(".heart").length)) > 0);

  // evolução por vínculo
  const lv = await sh(page, (el) => new Promise((ok) => {
    el.addEventListener("hollow-pet:levelup", (e) => ok(e.detail.stage), { once: true });
    el.s.bond = 14;
    el._lastPet = 0;
    el.pet();
    setTimeout(() => ok(-1), 1500);
  }));
  check("vínculo 15 evolui para Adjuchas (estágio 2)", lv === 2 && (await sh(page, (el) => el.shadowRoot.querySelector(".root").dataset.stage)) === "2", `stage=${lv}`);

  // Cero por segurar
  await sh(page, (el) => { el.s.reiatsu = 80; el._meters(); });
  await page.waitForTimeout(1700);
  c = await center(page);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.waitForTimeout(1200);
  check("segurar carrega o Cero", (await stats(page)).mode === "charging");
  await page.mouse.up();
  await page.waitForTimeout(140);
  check("soltar dispara o raio e gasta 12 de reiatsu", (await sh(page, (el) => el.shadowRoot.querySelectorAll(".beam").length)) > 0 && (await stats(page)).reiatsu === 68);
  check("depois do disparo volta ao normal", await waitMode(page, "idle", 3000));

  // sem reiatsu o Cero é recusado
  await sh(page, (el) => { el.s.reiatsu = 5; el._meters(); });
  await sh(page, (el) => el.aim());
  s = await stats(page);
  check("sem reiatsu o Cero é recusado", s.mode === "idle" && s.reiatsu === 5 && !(await sh(page, (el) => el.shadowRoot.querySelector(".aimcap"))));

  // alimentar
  await sh(page, (el) => { el.s.reiatsu = 40; el._meters(); });
  const bondBefore = (await stats(page)).bond;
  await sh(page, (el) => el.feed());
  await page.waitForTimeout(150);
  s = await stats(page);
  check("alimentar dá +26 de reiatsu e +2 de vínculo", s.reiatsu === 66 && s.bond === bondBefore + 2, `r=${s.reiatsu} b=${s.bond}`);
  check("alimentar solta orbes de reishi", (await sh(page, (el) => el.shadowRoot.querySelectorAll(".orb").length)) > 0);
  await waitMode(page, "idle", 3000);

  // mira: escolher o alvo
  await sh(page, (el) => { el.s.reiatsu = 90; el._meters(); });
  await sh(page, (el) => el.aim());
  check("mirar abre a camada de alvo", await sh(page, (el) => !!el.shadowRoot.querySelector(".aimcap")));
  await page.mouse.move(400, 300);
  await page.mouse.click(400, 300);
  await page.waitForTimeout(1000);
  check("clicar no alvo dispara o Cero", (await stats(page)).reiatsu === 78 && !(await sh(page, (el) => el.shadowRoot.querySelector(".aimcap"))));
  await waitMode(page, "idle", 3000);
  await sh(page, (el) => el.aim());
  await page.keyboard.press("Escape");
  check("Esc cancela a mira", (await stats(page)).mode === "idle");

  // arrastar para outro canto
  c = await center(page);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x - 300, c.y - 250, { steps: 8 });
  check("arrastar levanta o bichinho", (await stats(page)).mode === "dragging");
  await page.mouse.move(90, 80, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(700);
  s = await stats(page);
  const flipped = await sh(page, (el) => el.shadowRoot.querySelector(".root").classList.contains("flipped"));
  check("soltar encaixa no canto mais próximo (alto à esquerda) e espelha a arte", s.corner === "tl" && flipped, `corner=${s.corner}`);
  const box = (await center(page)).b;
  check("o pet fica dentro da janela", box.x >= 0 && box.y >= 0 && box.x + box.width <= 1280 && box.y + box.height <= 720);
  await sh(page, (el) => el.dock("br", false));

  // dormir e acordar
  await sh(page, (el) => el.sleep());
  check("dormir fecha os olhos", (await stats(page)).mode === "sleeping" && (await sh(page, (el) => el.shadowRoot.querySelector(".root").dataset.eyes)) === "sleep");
  c = await center(page);
  await page.mouse.click(c.x, c.y);
  await page.waitForTimeout(200);
  check("clicar acorda", (await stats(page)).mode !== "sleeping");
  await waitMode(page, "idle", 3000);

  // teclado
  await sh(page, (el) => { el.s.reiatsu = 50; el._meters(); });
  await page.locator(`${PET} .pet`).focus();
  await page.keyboard.press("f");
  await page.waitForTimeout(150);
  check("tecla F alimenta", (await stats(page)).reiatsu === 76);
  await waitMode(page, "idle", 3000);
  await page.keyboard.press("c");
  check("tecla C mira", (await stats(page)).mode === "aiming");
  await page.keyboard.press("Escape");
  await page.keyboard.press("s");
  check("tecla S dorme", (await stats(page)).mode === "sleeping");
  await page.keyboard.press("s");
  check("tecla S de novo acorda", (await stats(page)).mode !== "sleeping");
  await waitMode(page, "idle", 3000);

  // esconder e chamar de volta
  await sh(page, (el) => el._act("hide"));
  check("esconder some com o pet e mostra o botão de chamar", await sh(page, (el) => el.shadowRoot.querySelector(".wrap").classList.contains("hidden-pet") && getComputedStyle(el.shadowRoot.querySelector(".peek")).display !== "none"));
  await sh(page, (el) => el.shadowRoot.querySelector(".peek").click());
  check("o botão traz o pet de volta", await sh(page, (el) => !el.shadowRoot.querySelector(".wrap").classList.contains("hidden-pet")));

  // persistência
  const before = await stats(page);
  await sh(page, (el) => el._save());
  await page.reload({ waitUntil: "networkidle" });
  const after = await stats(page);
  check("vínculo e canto persistem depois de recarregar", after.bond === before.bond && after.corner === before.corner, `bond ${before.bond}→${after.bond}`);

  // Ctrl+C não pode virar "mirar"; mudar o elemento de lugar não duplica os gestos
  await sh(page, (el) => { el.wake(true); el._setMode("idle"); });
  await page.locator(`${PET} .pet`).focus();
  await page.keyboard.press("Control+c");
  check("Ctrl+C não é sequestrado pelo atalho C", (await stats(page)).mode !== "aiming");
  const moved = await page.evaluate(async () => {
    const el = document.querySelector("hollow-pet:not([inline])");
    el._lastPet = 0;
    const b0 = el.s.bond;
    document.body.appendChild(el); // sai e volta ao DOM: disconnected/connected
    await new Promise((r) => setTimeout(r, 50));
    el._lastPet = 0;
    el.$.pet.click();
    return el.s.bond - b0;
  });
  check("mudar o pet de lugar no DOM não duplica os ouvintes (um clique, um carinho)", moved === 1, `+${moved}`);

  // corner="" é só o padrão: o canto salvo vale mais
  const corners = await page.evaluate(async () => {
    const make = (c) => { const e = document.createElement("hollow-pet"); e.setAttribute("corner", c); e.setAttribute("static", ""); document.body.appendChild(e); return e; };
    const main = document.querySelector("hollow-pet:not([inline])");
    main.dock("bl", false);
    main.remove();
    const b = make("tr");
    const got = b.stats.corner;
    b.remove();
    localStorage.clear();
    const c = make("tl");
    const fresh = c.stats.corner;
    c.remove();
    return [got, fresh];
  });
  check('corner="tr" não derruba o canto salvo (bl), mas vale sem nada salvo (tl)', corners[0] === "bl" && corners[1] === "tl", corners.join(","));
  await page.reload({ waitUntil: "networkidle" });

  // ilustrações embutidas não atrapalham leitor de tela
  check("pets embutidos e estáticos são decorativos (aria-hidden)", await page.evaluate(() => [...document.querySelectorAll("hollow-pet[inline][static]")].every((e) => e.shadowRoot.querySelector(".root").getAttribute("aria-hidden") === "true")));
  check("o pet fixo é um marco com nome acessível", await sh(page, (el) => { const r = el.shadowRoot.querySelector(".root"); return r.getAttribute("role") === "region" && !!r.getAttribute("aria-label"); }));
  await ctx.close();

  // movimento reduzido
  const rm = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: "reduce" });
  page = await open(rm);
  c = await center(page);
  await page.mouse.click(c.x, c.y);
  await page.waitForTimeout(200);
  check("com movimento reduzido o carinho funciona", (await stats(page)).bond === 1);
  await sh(page, (el) => { el.s.reiatsu = 90; el.cero(); });
  await page.waitForTimeout(150);
  check("com movimento reduzido o Cero dispara sem tremor", (await sh(page, (el) => el.shadowRoot.querySelectorAll(".beam").length)) > 0);
  await rm.close();

  // telefone: o pet cabe e a bandeja não passa da tela
  const ph = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  page = await open(ph);
  const pb = (await center(page)).b;
  check("no celular o pet fica no canto, dentro da tela", pb.x + pb.width <= 390 && pb.y + pb.height <= 844 && pb.width <= 80, `${Math.round(pb.width)}px`);
  await ph.close();

  // pet standalone: a página de demonstração (sem o tema) e a API de integração
  const sa = await browser.newContext({ viewport: { width: 1100, height: 760 } });
  page = await open(sa, "/pet/demo.html");
  const P = "hollow-pet#pet";
  const run = (fn, arg) => page.evaluate(([s, f, a]) => new Function("el", "arg", `return (${f})(el, arg)`)(document.querySelector(s), a), [P, fn.toString(), arg]);
  await page.waitForTimeout(300);

  const st0 = await run((el) => el.getState());
  check("getState() devolve o formato v1 (reiatsu, vínculo, canto, escondido, visto, t)", st0.v === 1 && ["reiatsu", "bond", "corner", "hidden", "seen", "t"].every((k) => k in st0), JSON.stringify(st0));
  check("restore() recusa o que não reconhece", (await run((el) => [el.restore(null), el.restore({ v: 2 }), el.restore("x")])).every((r) => r === false));
  const back = await run((el) => { el.restore({ v: 1, reiatsu: 40, bond: 20, corner: "tl", hidden: false, seen: true, t: Date.now() }); return el.stats; });
  check("restore() devolve vínculo, canto e estágio (Adjuchas com vínculo 20)", back.bond === 20 && back.corner === "tl" && back.stage === 2 && Math.round(back.reiatsu) === 40, `bond=${back.bond} corner=${back.corner} stage=${back.stage}`);
  const away = await run((el) => { el.restore({ v: 1, reiatsu: 80, bond: 0, corner: "br", hidden: false, seen: true, t: Date.now() - 8 * 3600 * 1000 }); return el.stats.reiatsu; });
  check("restore() desconta o reiatsu pelo tempo que o bicho ficou sozinho", away < 80 && away >= 50, `${Math.round(away)}`);

  const evt = await run((el) => new Promise((ok) => { el.addEventListener("hollow-pet:state", (e) => ok(e.detail), { once: true }); el.setStats({ reiatsu: 50 }); }));
  check('o evento "hollow-pet:state" entrega o estado para guardar fora', evt && evt.v === 1 && evt.reiatsu === 50, JSON.stringify(evt));

  await run((el) => el.wake(true));
  await run((el) => el.look(1, 0, 1500));
  await page.waitForTimeout(450);
  const gx1 = await run((el) => parseFloat(el.shadowRoot.querySelector(".root").style.getPropertyValue("--gx")));
  check("look(1, 0) leva o olhar para a direita, sem mexer o mouse", gx1 > 1.5, `--gx=${gx1}`);
  await run((el) => el.look(null));

  await run((el) => el.mood("worried", "Opa…"));
  check("mood('worried') deixa o bicho preocupado e fala", await run((el) => el.shadowRoot.querySelector(".root").dataset.worried === "1" && el.shadowRoot.querySelector(".bubble").textContent === "Opa…"));
  await run((el) => { el.say("", 0); el.mood("happy", ""); });
  check("mood('happy', '') fica calado", await run((el) => !el.shadowRoot.querySelector(".bubble").classList.contains("on")));
  const wor = await run((el) => { el.mood("happy", ""); el.mood("worried", "Opa…"); return { mode: el.mode, eyes: el.shadowRoot.querySelector(".root").dataset.eyes }; });
  check("preocupar o bicho que estava feliz troca os olhos de alegria pelos abertos", wor.mode !== "happy" && wor.eyes === "open", JSON.stringify(wor));

  const cel = await run((el) => { el.setStats({ reiatsu: 60, bond: 0 }); el._setMode("idle"); el.celebrate("Passou!"); return { r: el.stats.reiatsu, b: el.stats.bond, beams: el.shadowRoot.querySelectorAll(".beam").length }; });
  check("celebrate() solta um Cero para cima sem gastar reiatsu e cria vínculo", cel.r === 60 && cel.b === 1 && cel.beams > 0, JSON.stringify(cel));

  const nib = await run((el) => { el.setStats({ reiatsu: 40 }); el.nibble(5); return el.stats.reiatsu; });
  check("nibble(5) alimenta em silêncio", nib === 45, `${nib}`);

  await run((el) => el.hide());
  check("hide() esconde o pet e o estado diz isso", await run((el) => el.shadowRoot.querySelector(".wrap").classList.contains("hidden-pet") && el.getState().hidden === true));
  await run((el) => el.show());
  check("show() traz de volta", await run((el) => !el.shadowRoot.querySelector(".wrap").classList.contains("hidden-pet") && el.getState().hidden === false));

  const nop = await page.evaluate(async () => {
    localStorage.clear();
    const e = document.createElement("hollow-pet");
    e.setAttribute("no-persist", "");
    e.setAttribute("no-hello", "");
    e.setAttribute("storage-key", "hp-test");
    document.body.appendChild(e);
    e.feed();
    await new Promise((r) => setTimeout(r, 100));
    const got = localStorage.getItem("hp-test");
    e.remove();
    return got;
  });
  check("no-persist não escreve no localStorage (quem guarda é o hospedeiro)", nop === null);

  await page.setViewportSize({ width: 300, height: 120 });
  await page.waitForTimeout(250);
  await run((el) => { el.dock("br", false); el.say("Oi! Posso ficar no cantinho? Tô de olho no código.", 0); });
  await page.waitForTimeout(400);
  const low = await run((el) => {
    const r = el.shadowRoot.querySelector(".root");
    const b = el.shadowRoot.querySelector(".bubble").getBoundingClientRect();
    const p = el.shadowRoot.querySelector(".pet").getBoundingClientRect();
    return { side: r.classList.contains("side"), inside: b.left >= 0 && b.top >= 0 && b.right <= innerWidth && b.bottom <= innerHeight, beside: b.right <= p.left + 12 };
  });
  check("em janela baixa o balão passa para o lado do pet e continua dentro da tela", low.side && low.inside && low.beside, JSON.stringify(low));
  await page.setViewportSize({ width: 360, height: 420 });
  await page.waitForTimeout(250);
  check("em janela alta o balão volta para cima", await run((el) => !el.shadowRoot.querySelector(".root").classList.contains("side")));
  await sa.close();

  check("nenhum erro nem aviso no console", errors.length === 0, errors.slice(0, 3).join(" | "));
} catch (e) {
  console.error(e);
  results.push(false);
} finally {
  await browser.close();
  await close();
}

const failed = results.filter((r) => !r).length;
console.log(failed ? `\n${failed} verificação(ões) falharam.` : `\nTudo certo: ${results.length} verificações.`);
process.exit(failed ? 1 : 0);
