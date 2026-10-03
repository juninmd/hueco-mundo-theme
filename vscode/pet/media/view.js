/* O Hollowzinho dentro do VS Code: liga o <hollow-pet> ao que a extensão conta do editor. */
(function () {
  "use strict";

  const vscode = acquireVsCodeApi();
  const CORNERS = ["br", "bl", "tl", "tr"];
  const STAGES = { 1: "Hollow", 2: "Adjuchas", 3: "Vasto Lorde" };

  const TEXT = {
    pt: {
      save: ["Salvo!", "Guardadinho.", "Tudo no lugar."],
      errors: (n) => (n === 1 ? "Opa… apareceu um erro." : `Opa… apareceram ${n} erros.`),
      clean: "Sem erros! Respirei.",
      ok: ["Passou!", "Tudo verde!", "Mandou bem!"],
      fail: ["Falhou… vamos de novo?", "Hmm, deu ruim.", "Calma, a gente resolve."],
      commit: ["Commit! Nham.", "Mais um commit pra coleção.", "Esse commit estava gostoso."],
      noErrors: "Nenhum erro por aqui!",
    },
    en: {
      save: ["Saved!", "Tucked away.", "All in place."],
      errors: (n) => (n === 1 ? "Uh-oh… there's an error." : `Uh-oh… ${n} errors.`),
      clean: "No errors! Phew.",
      ok: ["Passed!", "All green!", "Nice one!"],
      fail: ["It failed… again?", "Hmm, that went badly.", "Easy, we'll fix it."],
      commit: ["A commit! Yum.", "One more for the collection.", "That commit was tasty."],
      noErrors: "No errors around here!",
    },
  };

  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  let pet = null;
  let cfg = null;

  const text = () => TEXT[cfg && cfg.lang === "en" ? "en" : "pt"];

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

  function create(state) {
    pet = document.createElement("hollow-pet");
    // Quem guarda o estado é a extensão (globalState): o localStorage do webview some quando a visão fecha.
    pet.setAttribute("no-persist", "");
    pet.setAttribute("margin", "10");
    apply();
    if (state) pet.restore(state);
    pet.addEventListener("hollow-pet:state", (e) => vscode.postMessage({ type: "state", state: e.detail }));
    pet.addEventListener("hollow-pet:cero", () => vscode.postMessage({ type: "cero" }));
    pet.addEventListener("hollow-pet:levelup", (e) => vscode.postMessage({ type: "levelup", stage: e.detail.stage, name: STAGES[e.detail.stage] }));
    document.body.appendChild(pet);
  }

  /** O Cero sai da boca do pet e atravessa a borda da visão, na direção do editor. */
  function fire() {
    const toRight = !cfg || cfg.editorSide !== "left";
    pet.cero({ x: toRight ? innerWidth + 400 : -400, y: innerHeight * 0.3 });
  }

  function command(name) {
    if (!pet) return;
    if (name === "pet") {
      pet.show();
      pet.pet();
    } else if (name === "feed") {
      pet.show();
      pet.feed();
    } else if (name === "cero") {
      pet.show();
      fire();
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
      case "errors":
        pet.mood("worried", t.errors(m.n));
        break;
      case "clean":
        pet.mood("happy", t.clean);
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
    }
  }

  window.addEventListener("message", (e) => {
    const m = e.data;
    if (!m || typeof m !== "object") return;
    if (m.type === "init") {
      cfg = m.config;
      if (pet) {
        apply();
        if (m.state) pet.restore(m.state);
      } else create(m.state);
    } else if (m.type === "config") {
      cfg = m.config;
      apply();
    } else if (m.type === "cmd") command(m.name);
    else if (m.type === "react") react(m);
  });

  vscode.postMessage({ type: "ready" });
})();
