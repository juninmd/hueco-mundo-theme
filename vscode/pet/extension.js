// Hollowzinho para o VS Code.
// A extensão só escuta o editor e conta ao pet o que aconteceu; quem desenha, fala e se mexe é o <hollow-pet>
// dentro do webview (media/view.js). Nada aqui altera o seu código: o Cero só pisca a linha por cima do editor.
"use strict";

const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const VIEW_ID = "hollowzinho.view";
const STATE_KEY = "hollowzinho.state";
const REVEALED_KEY = "hollowzinho.revealed";
const BUILD_CMD = /\b(test|tests|jest|vitest|mocha|pytest|tox|rspec|phpunit|build|compile|tsc|webpack|vite|rollup|esbuild|make|cmake|gradle|gradlew|mvn|cargo|go\s+(?:test|build|vet)|dotnet\s+(?:test|build)|lint|eslint|ruff|mypy|ctest|bazel)\b/i;

/** Limita a frequência de uma reação (ms) para o bicho não virar metralhadora de balões. */
function cooldown(ms) {
  let last = 0;
  return () => {
    const now = Date.now();
    if (now - last < ms) return false;
    last = now;
    return true;
  };
}

/** Junta chamadas rápidas numa só (a última vence). */
function debounce(fn, ms) {
  let t;
  const run = (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
  run.cancel = () => clearTimeout(t);
  return run;
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ───────────────────────── configuração ───────────────────────── */

function readConfig() {
  const c = vscode.workspace.getConfiguration("hollowzinho");
  const sideBar = vscode.workspace.getConfiguration("workbench").get("sideBar.location", "left");
  const side = c.get("editorSide", "auto");
  const lang = c.get("language", "auto");
  return {
    name: c.get("name", "Hollowzinho") || "Hollowzinho",
    tint: c.get("tint", "cero"),
    lang: lang === "auto" ? (String(vscode.env.language).toLowerCase().startsWith("pt") ? "pt" : "en") : lang,
    size: c.get("size", 0),
    scene: c.get("scene", "hueco-mundo"),
    chatter: c.get("chatter", "low"),
    sleepAfterMinutes: c.get("sleepAfterMinutes", 5),
    // Para que lado fica o editor, visto de dentro da barra lateral: é para lá que o Cero sai e o bicho olha.
    editorSide: side === "auto" ? (sideBar === "right" ? "left" : "right") : side,
    reactToEditing: c.get("reactToEditing", true),
    reactToDiagnostics: c.get("reactToDiagnostics", true),
    reactToTasks: c.get("reactToTasks", true),
    reactToGit: c.get("reactToGit", true),
    editorEffects: c.get("editorEffects", true),
    statusBar: c.get("statusBar", true),
  };
}

/* ───────────────────────── efeito do Cero no editor ───────────────────────── */

/**
 * O Cero atravessa a barra lateral e chega no editor: a linha em que você está acende e esfria em
 * quatro passos. É só decoração (nunca toca no texto) e some sozinha em menos de um segundo.
 */
class CeroFlash {
  constructor() {
    const ladder = [0.34, 0.22, 0.12, 0.05];
    const core = new vscode.ThemeColor("hollowzinho.ceroCore");
    this.steps = ladder.map((alpha, i) =>
      vscode.window.createTextEditorDecorationType({
        isWholeLine: true,
        backgroundColor: `rgba(225, 29, 72, ${alpha})`,
        borderStyle: "solid",
        borderWidth: "0 0 0 3px",
        borderColor: i < 3 ? core : "transparent",
        overviewRulerColor: i < 3 ? core : undefined,
        overviewRulerLane: vscode.OverviewRulerLane.Right,
        after: i < 2 ? { contentText: "  CERO", color: core, fontWeight: "700", margin: "0 0 0 1ch" } : undefined,
      })
    );
    this.timers = [];
  }

  /** Acende as linhas dos cursores do editor ativo. */
  fire(editor, { calm = false } = {}) {
    if (!editor) return;
    this.clear(editor);
    const lines = new Set();
    for (const s of editor.selections.slice(0, 20)) lines.add(s.active.line);
    const ranges = [...lines].map((l) => new vscode.Range(l, 0, l, 0));
    const plan = calm ? [[0, 420]] : [[0, 110], [1, 150], [2, 200], [3, 260]];
    let at = 0;
    for (const [step, ms] of plan) {
      this.timers.push(setTimeout(() => {
        for (const d of this.steps) editor.setDecorations(d, []);
        editor.setDecorations(this.steps[step], ranges);
      }, at));
      at += ms;
    }
    this.timers.push(setTimeout(() => this.clear(editor), at));
  }

  clear(editor) {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    for (const d of this.steps) {
      for (const e of vscode.window.visibleTextEditors) e.setDecorations(d, []);
      if (editor) editor.setDecorations(d, []);
    }
  }

  dispose() {
    this.clear();
    this.steps.forEach((d) => d.dispose());
  }
}

/* ───────────────────────── a visão do pet ───────────────────────── */

class PetView {
  constructor(context) {
    this.context = context;
    this.media = vscode.Uri.joinPath(context.extensionUri, "media");
    this.config = readConfig();
    this.view = null;
    this.ready = false;
    this.queue = [];
    this.state = context.globalState.get(STATE_KEY) || null;
    this.onState = () => {};
    this.onCero = () => {};
  }

  resolveWebviewView(view) {
    this.view = view;
    this.ready = false;
    view.webview.options = { enableScripts: true, localResourceRoots: [this.media] };
    view.webview.html = this.html(view.webview);
    view.webview.onDidReceiveMessage((m) => this.receive(m));
    view.onDidDispose(() => {
      if (this.view === view) {
        this.view = null;
        this.ready = false;
      }
    });
    view.onDidChangeVisibility(() => {
      if (!view.visible) this.ready = false;
    });
  }

  get visible() {
    return !!this.view && this.view.visible && this.ready;
  }

  /** Reação do editor: só chega se o pet está à vista (o bicho só vive onde você o vê). */
  post(msg) {
    if (!this.visible) return false;
    this.view.webview.postMessage(msg);
    return true;
  }

  /** Pedido do usuário (comando, atalho): se o pet ainda não abriu, espera por ele alguns segundos. */
  command(msg) {
    if (this.post(msg)) return;
    this.queue = [...this.queue.slice(-4), { msg, at: Date.now() }];
  }

  receive(m) {
    if (!m || typeof m !== "object") return;
    if (m.type === "ready") {
      this.ready = true;
      this.view.webview.postMessage({ type: "init", state: this.state, config: this.config });
      const pending = this.queue.filter((q) => Date.now() - q.at < 5000);
      this.queue = [];
      for (const q of pending) this.view.webview.postMessage(q.msg);
    } else if (m.type === "state" && m.state && m.state.v === 1) {
      this.state = m.state;
      this.context.globalState.update(STATE_KEY, m.state);
      this.onState(m.state, m.stage);
    } else if (m.type === "cero") {
      this.onCero(m);
    } else if (m.type === "levelup") {
      vscode.window.setStatusBarMessage(`$(flame) ${this.config.name}: ${m.name}`, 5000);
    }
  }

  /** Abre a visão sem deixar o teclado preso nela: quem estava digitando no editor continua digitando. */
  async reveal() {
    const editing = !!vscode.window.activeTextEditor;
    await vscode.commands.executeCommand(`${VIEW_ID}.focus`);
    if (editing) await vscode.commands.executeCommand("workbench.action.focusActiveEditorGroup");
  }

  html(webview) {
    const uri = (f) => webview.asWebviewUri(vscode.Uri.joinPath(this.media, f));
    const nonce = crypto.randomBytes(16).toString("base64");
    const scene = fs.readFileSync(path.join(this.media.fsPath, "scene.html"), "utf8");
    const csp = [
      "default-src 'none'",
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src 'nonce-${nonce}'`,
      `img-src ${webview.cspSource} data:`,
    ].join("; ");
    return `<!doctype html>
<html lang="${this.config.lang}">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="${uri("view.css")}">
<title>Hollowzinho</title>
</head>
<body data-scene="${this.config.scene}">
<div class="scene" aria-hidden="true">${scene}</div>
<script nonce="${nonce}" src="${uri("hollow-pet.js")}"></script>
<script nonce="${nonce}" src="${uri("view.js")}"></script>
</body>
</html>`;
  }
}

/* ───────────────────────── ativação ───────────────────────── */

function activate(context) {
  const view = new PetView(context);
  const flash = new CeroFlash();
  const subs = context.subscriptions;
  subs.push(flash);

  const reduceMotion = () => vscode.workspace.getConfiguration("workbench").get("reduceMotion", "auto") === "on";
  const cfg = () => view.config;

  // O Cero do editor: acende a linha quando o pet dispara (ou direto, se o pet não está à vista).
  const flashLater = (delay = 260) => {
    if (!cfg().editorEffects) return;
    setTimeout(() => flash.fire(vscode.window.activeTextEditor, { calm: reduceMotion() }), delay);
  };
  view.onCero = () => flashLater();

  /* barra de status: o reiatsu do bicho, sempre à mão */
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 20);
  status.command = `${VIEW_ID}.focus`;
  subs.push(status);
  const stageOf = (bond) => (bond >= 40 ? "Vasto Lorde" : bond >= 15 ? "Adjuchas" : "Hollow");
  const paintStatus = (st) => {
    if (!cfg().statusBar || !st) return status.hide();
    const r = Math.round(st.reiatsu);
    const hungry = r < 30;
    const pt = cfg().lang === "pt";
    status.text = `$(${hungry ? "flame" : "heart"}) ${r}`;
    status.name = cfg().name;
    status.tooltip = new vscode.MarkdownString(
      `**${cfg().name}** · ${stageOf(st.bond)}\n\nReiatsu ${r}/100 · ${pt ? "Vínculo" : "Bond"} ${st.bond}\n\n${pt ? "Clique para abrir o pet." : "Click to open the pet."}`
    );
    status.color = hungry ? new vscode.ThemeColor("editorWarning.foreground") : undefined;
    status.show();
  };
  view.onState = paintStatus;
  paintStatus(view.state);

  subs.push(vscode.window.registerWebviewViewProvider(VIEW_ID, view, { webviewOptions: { retainContextWhenHidden: false } }));

  /* configuração viva */
  subs.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration("hollowzinho") && !e.affectsConfiguration("workbench.sideBar.location")) return;
      view.config = readConfig();
      view.post({ type: "config", config: view.config });
      paintStatus(view.state);
    })
  );

  /* ── digitar alimenta e o olhar acompanha o cursor ── */
  let typed = 0;
  const flushTyping = debounce(() => {
    if (typed > 0) view.post({ type: "react", kind: "typing", n: Math.min(typed, 60) });
    typed = 0;
  }, 350);
  subs.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (!cfg().reactToEditing || e.contentChanges.length === 0) return;
      if (e.document !== (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document)) return;
      for (const c of e.contentChanges) typed += c.text.length || 1;
      flushTyping();
    })
  );

  let lastLook = 0;
  subs.push(
    vscode.window.onDidChangeTextEditorSelection((e) => {
      if (!cfg().reactToEditing || e.textEditor !== vscode.window.activeTextEditor) return;
      const now = Date.now();
      if (now - lastLook < 160) return;
      lastLook = now;
      const ed = e.textEditor;
      const pos = ed.selection.active;
      const vr = ed.visibleRanges[0];
      const top = vr ? vr.start.line : 0;
      const span = vr ? Math.max(1, vr.end.line - top) : 40;
      const y = clamp(((pos.line - top) / span) * 2 - 1, -1, 1);
      const toward = clamp(0.3 + (pos.character / 100) * 0.7, 0.3, 1);
      view.post({ type: "react", kind: "look", x: cfg().editorSide === "right" ? toward : -toward, y });
    })
  );

  const happySave = cooldown(5000);
  subs.push(
    vscode.workspace.onDidSaveTextDocument(() => {
      if (cfg().reactToEditing && happySave()) view.post({ type: "react", kind: "save" });
    })
  );

  /* ── erros e avisos: o bicho se preocupa e depois respira ── */
  let errors = 0;
  let hadErrors = false;
  const worry = cooldown(15000);
  const countErrors = () => {
    let n = 0;
    for (const [, list] of vscode.languages.getDiagnostics()) for (const d of list) if (d.severity === vscode.DiagnosticSeverity.Error) n++;
    return n;
  };
  const diag = debounce(() => {
    if (!cfg().reactToDiagnostics) return;
    const now = countErrors();
    const before = errors;
    errors = now;
    if (now > 0 && now > before && worry()) {
      hadErrors = true;
      view.post({ type: "react", kind: "errors", n: now });
    } else if (now === 0 && before > 0 && hadErrors) {
      hadErrors = false;
      view.post({ type: "react", kind: "clean" });
    }
  }, 700);
  subs.push(vscode.languages.onDidChangeDiagnostics(diag), { dispose: () => diag.cancel() });

  /* ── tarefas e comandos de build/teste no terminal ── */
  const outcome = cooldown(3000);
  subs.push(
    vscode.tasks.onDidEndTaskProcess((e) => {
      if (!cfg().reactToTasks || e.exitCode === undefined || !outcome()) return;
      view.post({ type: "react", kind: e.exitCode === 0 ? "taskOk" : "taskFail", what: e.execution.task.name });
    })
  );
  if (typeof vscode.window.onDidEndTerminalShellExecution === "function") {
    subs.push(
      vscode.window.onDidEndTerminalShellExecution((e) => {
        if (!cfg().reactToTasks || e.exitCode === undefined) return;
        const line = (e.execution.commandLine && e.execution.commandLine.value) || "";
        if (!BUILD_CMD.test(line) || !outcome()) return;
        view.post({ type: "react", kind: e.exitCode === 0 ? "cmdOk" : "cmdFail" });
      })
    );
  }

  /* ── git: commit é comida ── */
  // O evento onDidCommit só cobre commits feitos pela própria interface do VS Code; para pegar também os do
  // terminal, observa-se o commit do HEAD: se ele muda e a branch continua a mesma, alguém commitou.
  const hooked = new WeakSet();
  const ate = cooldown(2500);
  const hookRepo = (repo) => {
    if (hooked.has(repo)) return;
    hooked.add(repo);
    let last = repo.state.HEAD && repo.state.HEAD.commit;
    let branch = repo.state.HEAD && repo.state.HEAD.name;
    subs.push(
      repo.state.onDidChange(() => {
        const head = repo.state.HEAD;
        if (head && last && head.name === branch && head.commit && head.commit !== last && cfg().reactToGit && ate()) {
          view.post({ type: "react", kind: "commit" });
        }
        last = head && head.commit;
        branch = head && head.name;
      })
    );
  };
  const gitExt = vscode.extensions.getExtension("vscode.git");
  if (gitExt) {
    Promise.resolve(gitExt.isActive ? gitExt.exports : gitExt.activate())
      .then((git) => {
        if (!git) return;
        const attach = () => {
          try {
            const api = git.getAPI(1);
            api.repositories.forEach(hookRepo);
            subs.push(api.onDidOpenRepository(hookRepo));
          } catch (_) {}
        };
        if (git.enabled) attach();
        else subs.push(git.onDidChangeEnablement((on) => on && attach()));
      })
      .catch(() => {});
  }

  // Visões novas nascem fechadas no Explorer: na primeira vez, abre uma só vez para o bicho ser visto.
  if (!context.globalState.get(REVEALED_KEY)) {
    context.globalState.update(REVEALED_KEY, true);
    setTimeout(() => view.reveal().then(undefined, () => {}), 1500);
  }

  /* ── comandos ── */
  const send = async (name) => {
    if (!view.visible) await view.reveal();
    view.command({ type: "cmd", name });
  };
  const nextError = () => {
    const editor = vscode.window.activeTextEditor;
    const here = editor ? editor.selection.active : new vscode.Position(0, 0);
    const hereUri = editor && editor.document.uri.toString();
    const all = [];
    for (const [uri, list] of vscode.languages.getDiagnostics()) {
      for (const d of list) if (d.severity === vscode.DiagnosticSeverity.Error) all.push({ uri, range: d.range });
    }
    if (!all.length) return null;
    const key = (x) => [x.uri.toString() === hereUri ? 0 : 1, x.uri.toString(), x.range.start.line, x.range.start.character];
    const cmp = (a, b) => {
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
      return 0;
    };
    const after = all.filter((x) => x.uri.toString() === hereUri && x.range.start.isAfter(here));
    return (after.length ? after.sort((a, b) => cmp(key(a), key(b))) : all.sort((a, b) => cmp(key(a), key(b))))[0];
  };

  const reg = (id, fn) => subs.push(vscode.commands.registerCommand(`hollowzinho.${id}`, fn));
  reg("pet", () => send("pet"));
  reg("feed", () => send("feed"));
  reg("sleep", () => send("sleep"));
  reg("dock", () => send("dock"));
  reg("show", () => send("show"));
  reg("reset", () => send("reset"));
  reg("cero", () => {
    // Com o pet à vista, é ele quem dispara (e avisa de volta para a linha acender); sem ele, só a linha acende.
    if (view.visible) view.command({ type: "cmd", name: "cero" });
    else flashLater(0);
  });
  reg("ceroError", async () => {
    const hit = nextError();
    if (!hit) {
      if (!view.visible) await view.reveal();
      view.command({ type: "react", kind: "noErrors" });
      return;
    }
    const doc = await vscode.workspace.openTextDocument(hit.uri);
    const editor = await vscode.window.showTextDocument(doc, { preserveFocus: false });
    editor.selection = new vscode.Selection(hit.range.start, hit.range.start);
    editor.revealRange(hit.range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    if (view.visible) view.post({ type: "cmd", name: "cero" });
    else flashLater(0);
  });

}

function deactivate() {}

module.exports = { activate, deactivate };
