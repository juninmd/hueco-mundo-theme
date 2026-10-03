/* O Hollowzinho dentro do VS Code: liga o <hollow-pet> ao que a extensão conta do editor, do depurador e do Git. */
(function () {
  "use strict";

  const vscode = acquireVsCodeApi();
  const CORNERS = ["br", "bl", "tl", "tr"];
  const STAGES = { 1: "Hollow", 2: "Adjuchas", 3: "Vasto Lorde" };

  const TEXT = {
    pt: {
      save: ["Salvo!", "Guardadinho.", "Tudo no lugar."],
      bugFound: (n) => (n === 1 ? "Opa… apareceu um bug." : `Opa… apareceram ${n} bugs.`),
      bugKilled: ["Bug abatido!", "Boom, um a menos.", "Esse não volta."],
      bugHit: ["Acertei! Mas ele ainda respira.", "Pegou de raspão. Conserta esse!", "Ainda tá vivo. Bora corrigir?"],
      bugsClean: "Sem bugs! Respirei.",
      bugLabel: "Bug: ir até o erro e acertar um Cero",
      bossLabel: "Bug-chefe: a exceção parada no depurador",
      chip: (n) => (n === 1 ? "1 erro" : `${n} erros`),
      ok: ["Passou!", "Tudo verde!", "Mandou bem!"],
      fail: ["Falhou… vamos de novo?", "Hmm, deu ruim.", "Calma, a gente resolve."],
      commit: ["Commit! Nham.", "Mais um commit pra coleção.", "Esse commit estava gostoso."],
      noErrors: "Nenhum erro por aqui!",
      warn: ["Hmm, um aviso.", "Tem um aviso aí."],
      debugStart: ["Caçada iniciada!", "Modo caçador ligado.", "Vamos ver o que se esconde."],
      debugPaused: ["Parei. Dá uma olhada.", "Pausa! Quem está aí?", "Congelei aqui."],
      debugException: ["BUG em tempo de execução!", "Achei um bicho feio!", "Isso quebrou!"],
      bossDown: "Bug-chefe capturado!",
      debugEnd: ["Caçada encerrada.", "Fim da sessão."],
      debugOk: "Terminou limpinho!",
      debugFail: "Terminou mal…",
      breakpoint: ["Marcado!", "Ponto de parada."],
      welcomeBack: ["Voltou! Senti sua falta.", "Oi de novo!"],
      fileNew: ["Arquivo novo! Nham.", "Ooh, novidade."],
      fileGone: ["Tchau, arquivo…", "Foi-se."],
      push: ["Enviado!", "Lá vai ele!"],
      branch: ["Outra branch! Que passeio.", "Território novo."],
    },
    en: {
      save: ["Saved!", "Tucked away.", "All in place."],
      bugFound: (n) => (n === 1 ? "Uh-oh… a bug." : `Uh-oh… ${n} bugs.`),
      bugKilled: ["Bug down!", "Boom, one less.", "That one's not coming back."],
      bugHit: ["Got it! But it's still breathing.", "Only grazed it. Fix that one!", "Still alive. Shall we fix it?"],
      bugsClean: "No bugs! Phew.",
      bugLabel: "Bug: go to the error and fire a Cero",
      bossLabel: "Boss bug: the exception stopped in the debugger",
      chip: (n) => (n === 1 ? "1 error" : `${n} errors`),
      ok: ["Passed!", "All green!", "Nice one!"],
      fail: ["It failed… again?", "Hmm, that went badly.", "Easy, we'll fix it."],
      commit: ["A commit! Yum.", "One more for the collection.", "That commit was tasty."],
      noErrors: "No errors around here!",
      warn: ["Hmm, a warning.", "There's a warning."],
      debugStart: ["Hunt started!", "Hunter mode on.", "Let's see what's hiding."],
      debugPaused: ["Stopped. Take a look.", "Pause! Who's there?", "Froze right here."],
      debugException: ["A runtime BUG!", "Found an ugly one!", "That broke!"],
      bossDown: "Boss bug captured!",
      debugEnd: ["Hunt over.", "Session ended."],
      debugOk: "Finished clean!",
      debugFail: "Ended badly…",
      breakpoint: ["Marked!", "Stop point."],
      welcomeBack: ["You're back! Missed you.", "Hi again!"],
      fileNew: ["New file! Yum.", "Ooh, something new."],
      fileGone: ["Bye, file…", "Gone."],
      push: ["Sent!", "Off it goes!"],
      branch: ["Another branch! What a walk.", "New territory."],
    },
  };

  const BUG_ICON =
    '<svg viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 13 3 9M8 18H2M9 23l-5 5M23 13l6-4M24 18h6M23 23l5 5"/></g><ellipse cx="16" cy="19" rx="8" ry="10" fill="currentColor"/><circle cx="16" cy="8.5" r="5" fill="currentColor"/></svg>';

  const BUG_SVG =
    '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">' +
    '<g class="legs" fill="none" stroke="#8d8573" stroke-width="1.7" stroke-linecap="round"><path d="M9 13 3 9M8 18H2M9 23l-5 5M23 13l6-4M24 18h6M23 23l5 5"/></g>' +
    '<path d="M13 7C12 4 10 3 8 3M19 7c1-3 3-4 5-4" fill="none" stroke="#b9b2a2" stroke-width="1.3" stroke-linecap="round"/>' +
    '<ellipse class="body" cx="16" cy="19" rx="9" ry="10.5" fill="#1b1b24" stroke="#e11d48" stroke-width="1.6"/>' +
    '<path d="M16 9.500V29" stroke="#e11d48" stroke-opacity=".55" stroke-width="1.2"/>' +
    '<ellipse cx="11.500" cy="17.500" rx="2" ry="3.400" fill="#e11d48" opacity=".4"/><ellipse cx="20.500" cy="17.500" rx="2" ry="3.400" fill="#e11d48" opacity=".4"/>' +
    '<circle class="head" cx="16" cy="9" r="5.200" fill="#15151c" stroke="#e11d48" stroke-width="1.400"/>' +
    '<circle cx="14" cy="8.200" r="1.500" fill="#ff5a78"/><circle cx="18" cy="8.200" r="1.500" fill="#ff5a78"/>' +
    "</svg>";

  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cool = (ms) => {
    let last = 0;
    return () => {
      const now = Date.now();
      if (now - last < ms) return false;
      last = now;
      return true;
    };
  };

  let pet = null;
  let cfg = null;
  const text = () => TEXT[cfg && cfg.lang === "en" ? "en" : "pt"];

  /* ───────────────────────── o bichinho ───────────────────────── */

  function apply() {
    if (!pet || !cfg) return;
    pet.setAttribute("lang", cfg.lang);
    pet.setAttribute("name", cfg.name);
    if (cfg.tint === "cero") pet.removeAttribute("tint");
    else pet.setAttribute("tint", cfg.tint === "ouro" ? "ouro" : "reishi");
    if (cfg.size > 0) pet.setAttribute("size", String(cfg.size));
    else pet.removeAttribute("size");
    pet.setAttribute("chatter", cfg.chatter);
    pet.setAttribute("sleep-after", String(Math.max(0, cfg.sleepAfterMinutes) * 60));
    document.body.dataset.scene = cfg.scene;
    document.documentElement.lang = cfg.lang;
  }

  let pendingShot = null; // para quem é o Cero que está saindo agora (um bug, ou ninguém: um Cero comum)

  function create(state) {
    pet = document.createElement("hollow-pet");
    // Quem guarda o estado é a extensão (globalState): o localStorage do webview some quando a visão fecha.
    pet.setAttribute("no-persist", "");
    pet.setAttribute("margin", "10");
    apply();
    if (state) pet.restore(state);
    pet.addEventListener("hollow-pet:state", (e) => vscode.postMessage({ type: "state", state: e.detail }));
    pet.addEventListener("hollow-pet:cero", () => {
      const shot = pendingShot;
      pendingShot = null;
      if (shot && shot.silent) return; // o bug já foi corrigido: não há linha para acender
      vscode.postMessage({ type: "cero", bugId: shot ? shot.id : undefined, navigate: !!(shot && shot.navigate) });
    });
    pet.addEventListener("hollow-pet:levelup", (e) => vscode.postMessage({ type: "levelup", stage: e.detail.stage, name: STAGES[e.detail.stage] }));
    document.body.appendChild(pet);
  }

  /** Para que lado da visão fica o editor: +1 direita, -1 esquerda. */
  const toward = () => (!cfg || cfg.editorSide !== "left" ? 1 : -1);

  /** O Cero comum sai da boca do pet e atravessa a borda da visão, na direção do editor. */
  function fire() {
    pet.cero({ x: toward() > 0 ? innerWidth + 400 : -400, y: innerHeight * 0.3 });
  }

  /* ───────────────────────── os bugs ───────────────────────── */

  const field = document.createElement("div");
  field.className = "bugs";
  field.setAttribute("role", "group");
  const chip = document.createElement("div");
  chip.className = "bugchip";
  chip.setAttribute("role", "img");
  chip.hidden = true;
  chip.innerHTML = BUG_ICON + '<span class="n"></span>';
  document.body.append(field, chip);

  const bugs = new Map(); // id -> { el, slot }
  const SLOTS = 6;
  const slots = new Array(SLOTS).fill(null);
  let known = new Set(); // todos os ids da última mensagem
  let total = 0;
  let hadBugs = false;
  let gotFirst = false;
  let lastBugsMsg = null;
  let bossId = null;

  const hashOf = (s) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return ((h >>> 0) % 1000) / 1000;
  };

  /** A faixa de largura (0 a 1) em que os bichos podem ficar sem pisar no pet. */
  function xRange() {
    const W = innerWidth || 300;
    const pad = (pet ? pet.bodyRect.width : 72) + 18;
    const right = !pet || pet.stats.corner[1] === "r";
    return right ? [0.04, Math.max(0.22, 1 - pad / W)] : [Math.min(0.78, pad / W), 0.96];
  }

  function placeBug(el, id, slot) {
    const [a, b] = xRange();
    const fx = slot === "boss" ? (a + b) / 2 : a + ((slot + 0.5) / SLOTS) * (b - a) + (hashOf(id) - 0.5) * 0.02;
    el.style.setProperty("--fx", clamp(fx, 0, 1).toFixed(3));
    el.style.setProperty("--fy", (slot === "boss" ? 0.5 : 0.12 + hashOf(id + "y") * 0.8).toFixed(3));
    el.style.setProperty("--d", (5 + hashOf(id + "d") * 4).toFixed(1) + "s");
    el.style.setProperty("--k", (hashOf(id + "k") * 5).toFixed(1));
  }

  function spawn(id, { calm = false, boss = false } = {}) {
    if (!cfg || !cfg.bugs || bugs.has(id)) return null;
    const slot = boss ? "boss" : slots.indexOf(null);
    if (!boss && slot < 0) return null;
    if (!boss) slots[slot] = id;
    const el = document.createElement("button");
    el.type = "button";
    el.className = "bug" + (boss ? " boss" : "") + (calm ? " calm" : "");
    el.dataset.id = id;
    el.setAttribute("aria-label", boss ? text().bossLabel : text().bugLabel);
    el.innerHTML = BUG_SVG;
    placeBug(el, id, slot);
    el.addEventListener("click", () => clickBug(id));
    field.appendChild(el);
    bugs.set(id, { el, slot });
    return el;
  }

  function removeBug(id, how) {
    const b = bugs.get(id);
    if (!b) return;
    bugs.delete(id);
    if (typeof b.slot === "number") slots[b.slot] = null;
    b.el.classList.add(how === "pop" ? "dead" : "vanish");
    b.el.disabled = true;
    setTimeout(() => b.el.remove(), 420);
  }

  const centerOf = (id) => {
    const b = bugs.get(id);
    if (!b) return null;
    const r = b.el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  function lookAt(p, ms) {
    if (!p || !pet) return;
    const r = pet.bodyRect;
    const dx = p.x - (r.left + r.width / 2);
    const dy = p.y - (r.top + r.height * 0.42);
    pet.look(clamp(dx / 120, -1, 1), clamp(dy / 70, -1, 1), ms);
  }

  /**
   * Dispara um Cero num bug. `silent`: o bug já foi corrigido (nada a acender no editor). `navigate`: leva o editor
   * até o erro. O Cero dos bugs não gasta reiatsu. Devolve se o pet realmente atirou.
   */
  function shoot(id, { silent = false, navigate = false, power = 0.75 } = {}) {
    if (!pet) return false;
    const spot = centerOf(id) || { x: toward() > 0 ? innerWidth + 400 : -400, y: innerHeight * 0.3 };
    if (pet.stats.hidden) {
      if (!silent) vscode.postMessage({ type: "cero", bugId: id, navigate });
      return false;
    }
    pendingShot = { id, silent, navigate };
    pet.cero({ x: spot.x, y: spot.y, power: id === "boss" ? 1 : power, free: true, text: "" });
    const fired = pendingShot === null;
    pendingShot = null; // se o pet não atirou (já estava disparando), ninguém herda este alvo
    return fired;
  }

  /** Como shoot(), mas se o pet ainda está disparando espera a vez (até duas vezes), em vez de perder o tiro. */
  async function shootSoon(id, opts) {
    for (let i = 0; i < 3; i++) {
      if (shoot(id, opts)) return true;
      if (!pet || pet.stats.hidden || pet.mode !== "firing") return false;
      await sleep(1100);
    }
    return false;
  }

  const hitBug = (id) => {
    const b = bugs.get(id);
    if (!b) return;
    b.el.classList.remove("hit");
    void b.el.offsetWidth;
    b.el.classList.add("hit");
    setTimeout(() => b.el.classList.remove("hit"), 480);
  };

  const hitTalk = cool(5000);
  function clickBug(id) {
    shootSoon(id, { navigate: true });
    setTimeout(() => hitBug(id), 120);
    if (hitTalk() && pet) setTimeout(() => pet.say(pick(text().bugHit), 2600), 650);
  }

  // Corrigir um bug é acertá-lo: o pet atira e o bicho explode. Os tiros saem em fila, um depois do outro.
  let queue = Promise.resolve();
  const enqueue = (fn) => (queue = queue.then(fn).catch(() => {}));
  const killTalk = cool(2600);

  function killBug(id, { last = false } = {}) {
    return enqueue(async () => {
      if (!bugs.has(id)) return;
      lookAt(centerOf(id), 600);
      const fired = await shootSoon(id, { silent: true });
      await sleep(fired ? 190 : 0);
      removeBug(id, "pop");
      if (last) pet && pet.mood("happy", text().bugsClean);
      else if (killTalk() && pet) pet.say(pick(text().bugKilled), 1800);
      await sleep(fired ? 900 : 120);
    });
  }

  const worryCool = cool(12000);
  function onBugs(m, { replay = false } = {}) {
    lastBugsMsg = m;
    if (!cfg) return;
    const t = text();
    const all = new Set(m.all || m.ids);
    total = m.total || 0;
    chip.hidden = !cfg.bugs || total === 0;
    chip.querySelector(".n").textContent = String(total);
    chip.setAttribute("aria-label", t.chip(total));
    document.body.dataset.alarm = cfg.bugs && total >= 5 ? "1" : "";

    const quiet = !!m.quiet || !gotFirst || replay;
    gotFirst = true;
    const before = known;
    known = all;
    const fresh = [...all].filter((id) => !before.has(id));
    const fixed = [...before].filter((id) => !all.has(id));
    const visible = new Set(m.ids);

    if (!cfg.bugs) {
      [...bugs.keys()].filter((id) => id !== bossId).forEach((id) => removeBug(id, "vanish"));
      return;
    }
    // trocar de arquivo reordena: quem saiu da lista sem ter sido corrigido some quieto
    [...bugs.keys()].filter((id) => id !== bossId && !visible.has(id) && !fixed.includes(id)).forEach((id) => removeBug(id, "vanish"));
    m.ids.forEach((id) => spawn(id, { calm: quiet || !fresh.includes(id) }));
    if (quiet) return;

    if (fresh.length) {
      hadBugs = true;
      const first = m.ids.find((id) => fresh.includes(id));
      if (first) lookAt(centerOf(first), 1800);
      if (worryCool() && pet) pet.mood("worried", t.bugFound(fresh.length));
      if (cfg.autoCero === "newErrors") fresh.filter((id) => visible.has(id)).slice(0, 2).forEach((id) => enqueue(async () => (await shootSoon(id), await sleep(1100))));
    }
    if (fixed.length) {
      vscode.postMessage({ type: "hunt", n: fixed.length });
      const mine = fixed.filter((id) => bugs.has(id));
      const lastIsClean = all.size === 0 && hadBugs;
      mine.slice(0, 3).forEach((id, i, arr) => killBug(id, { last: lastIsClean && i === arr.length - 1 }));
      mine.slice(3).forEach((id) => removeBug(id, "pop"));
      if (lastIsClean) hadBugs = false;
      if (lastIsClean && !mine.length && pet) pet.mood("happy", t.bugsClean);
    }
  }

  /* ───────────────────────── depurador ───────────────────────── */

  let debugging = false;
  const pauseTalk = cool(3500);

  function spawnBoss() {
    if (bossId) return bossId;
    bossId = "boss";
    const el = spawn("boss", { boss: true });
    if (!el) bossId = null;
    return bossId;
  }

  function debug(m) {
    if (!pet || !cfg) return;
    const t = text();
    if (m.state === "start") {
      debugging = true;
      document.body.dataset.debug = "1";
      pet.pose("scan", { text: pick(t.debugStart) });
    } else if (m.state === "paused") {
      pet.pose("paused");
      pet.look(toward() * 0.9, 0, 3200);
      if (pauseTalk()) pet.say(pick(t.debugPaused), 2200);
    } else if (m.state === "continued") {
      pet.pose(debugging ? "scan" : null);
    } else if (m.state === "step") {
      pet.pose("paused"); // o passo termina parado na linha seguinte
      pet.look(toward() * 0.9, clamp(Math.random() * 1.2 - 0.6, -1, 1), 1400);
    } else if (m.state === "exception") {
      pet.pose("paused");
      pet.pose("alert", { ms: 2000, text: pick(t.debugException) });
      if (cfg.bugs && m.located !== false) {
        spawnBoss();
        if (cfg.autoCero !== "off") enqueue(async () => (await sleep(650), bossId && (await shootSoon("boss")), hitBug("boss"), await sleep(900)));
      } else if (cfg.autoCero !== "off" && m.located !== false) {
        enqueue(async () => (await sleep(650), await shootSoon("boss")));
      }
    } else if (m.state === "end") {
      debugging = false;
      delete document.body.dataset.debug;
      pet.pose(null);
      if (bossId) {
        const id = bossId;
        bossId = null;
        enqueue(async () => {
          if (bugs.has(id)) {
            lookAt(centerOf(id), 500);
            const fired = await shootSoon(id, { silent: true });
            await sleep(fired ? 190 : 0);
            removeBug(id, "pop");
          }
          pet.celebrate(t.bossDown);
          vscode.postMessage({ type: "hunt", n: 1 });
        });
      } else if (m.exitCode === 0) pet.celebrate(t.debugOk);
      else if (typeof m.exitCode === "number") pet.mood("sad", t.debugFail);
      else pet.mood("calm", pick(t.debugEnd));
    }
    if (m.state === "continued" && bossId) {
      const id = bossId;
      bossId = null;
      removeBug(id, "pop");
    }
  }

  /* ───────────────────────── reações do editor ───────────────────────── */

  function react(m) {
    if (!pet) return;
    const t = text();
    switch (m.kind) {
      case "typing":
        pet.nibble(Math.min(0.8, m.n * 0.015));
        break;
      case "look":
        pet.look(m.x, m.y, 2600);
        break;
      case "save":
        pet.mood("happy", Math.random() < 0.35 ? pick(t.save) : "");
        break;
      case "taskOk":
      case "cmdOk":
        pet.celebrate(pick(t.ok));
        break;
      case "taskFail":
      case "cmdFail":
        pet.mood("sad", pick(t.fail));
        break;
      case "commit":
        pet.feed();
        setTimeout(() => pet && pet.say(pick(t.commit), 2400), 700);
        break;
      case "noErrors":
        pet.mood("happy", t.noErrors);
        break;
      case "warn":
        pet.mood("calm", pick(t.warn));
        break;
      case "breakpoint":
        pet.mood("excited", Math.random() < 0.5 ? pick(t.breakpoint) : "");
        break;
      case "welcomeBack":
        pet.wake(true);
        pet.mood("excited", pick(t.welcomeBack));
        break;
      case "fileNew":
        pet.mood("excited", Math.random() < 0.6 ? pick(t.fileNew) : "");
        break;
      case "fileGone":
        pet.mood("sad", Math.random() < 0.6 ? pick(t.fileGone) : "");
        break;
      case "push":
        pet.celebrate(pick(t.push));
        break;
      case "branch":
        pet.mood("excited", pick(t.branch));
        break;
    }
  }

  /* ───────────────────────── comandos do usuário ───────────────────────── */

  function command(m) {
    if (!pet) return;
    const name = m.name;
    if (name === "pet") {
      pet.show();
      pet.pet();
    } else if (name === "feed") {
      pet.show();
      pet.feed();
    } else if (name === "cero") {
      pet.show();
      fire();
    } else if (name === "ceroBug") {
      pet.show();
      shootSoon(m.id, { navigate: m.navigate !== false });
      setTimeout(() => hitBug(m.id), 120);
      if (hitTalk()) setTimeout(() => pet.say(pick(text().bugHit), 2600), 650);
    } else if (name === "sleep") {
      if (pet.mode === "sleeping") pet.wake();
      else pet.sleep();
    } else if (name === "dock") {
      const at = CORNERS.indexOf(pet.stats.corner);
      pet.dock(CORNERS[(at + 1) % CORNERS.length]);
    } else if (name === "show") {
      pet.show();
    } else if (name === "reset") {
      pet.show();
      pet.reset();
    }
  }

  /* ───────────────────────── mensagens da extensão ───────────────────────── */

  window.addEventListener("message", (e) => {
    const m = e.data;
    if (!m || typeof m !== "object") return;
    if (m.type === "init") {
      cfg = m.config;
      if (pet) {
        apply();
        if (m.state) pet.restore(m.state);
      } else create(m.state);
      if (m.bugs) onBugs(m.bugs, { replay: true });
      if (m.debug) {
        // a visão abriu no meio de uma sessão de depuração
        debugging = true;
        document.body.dataset.debug = "1";
        pet.pose(m.debug === "paused" ? "paused" : "scan");
      }
    } else if (m.type === "sync") {
      if (pet && m.state) pet.restore(m.state); // o mesmo bichinho aberto em outra visão mexeu: acompanha
    } else if (m.type === "config") {
      const bugsWas = cfg && cfg.bugs;
      cfg = m.config;
      apply();
      if (cfg.bugs && !bugsWas && lastBugsMsg) onBugs(lastBugsMsg, { replay: true });
      else if (!cfg.bugs) onBugs(lastBugsMsg || { ids: [], all: [], total: 0, quiet: true }, { replay: true });
    } else if (m.type === "cmd") command(m);
    else if (m.type === "react") react(m);
    else if (m.type === "bugs") onBugs(m);
    else if (m.type === "debug") debug(m);
  });

  window.addEventListener("resize", () => bugs.forEach((b, id) => placeBug(b.el, id, b.slot)));

  vscode.postMessage({ type: "ready" });
})();
