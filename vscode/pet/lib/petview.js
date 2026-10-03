"use strict";

const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { readConfig } = require("./config");

const VIEW_ID = "hollowzinho.view"; // no Explorer
const DEBUG_VIEW_ID = "hollowzinho.debugView"; // em "Executar e Depurar", que o VS Code abre sozinho ao depurar
const STATE_KEY = "hollowzinho.state";

/**
 * A visão do pet. Ela mora em dois lugares, o Explorer e o "Executar e Depurar" (o VS Code troca a barra lateral para
 * lá quando uma depuração começa, e o Explorer sumiria junto): são dois webviews do mesmo bichinho, que recebem as
 * mesmas mensagens e dividem o mesmo estado. A extensão e o webview conversam por mensagens:
 *   extensão → visão: init, sync, config, bugs, debug, cmd, react
 *   visão → extensão: ready, state, cero, hunt, levelup
 * O estado do bichinho mora no globalState: o webview some quando a visão fecha, a extensão não.
 */
class PetView {
  constructor(context) {
    this.context = context;
    this.media = vscode.Uri.joinPath(context.extensionUri, "media");
    this.config = readConfig();
    this.entries = new Set(); // uma por visão resolvida: { view, ready }
    this.queue = [];
    this.state = context.globalState.get(STATE_KEY) || null;
    this.initExtra = () => ({}); // o que mais vai junto no "init" (bugs, debug...)
    this.on = { state: () => {}, cero: () => {}, hunt: () => {} };
  }

  /** O provedor que o VS Code chama quando uma das visões abre. */
  provider() {
    return { resolveWebviewView: (view) => this.attach(view) };
  }

  attach(view) {
    const entry = { view, ready: false };
    this.entries.add(entry);
    view.webview.options = { enableScripts: true, localResourceRoots: [this.media] };
    view.webview.html = this.html(view.webview);
    view.webview.onDidReceiveMessage((m) => this.receive(m, entry));
    view.onDidDispose(() => this.entries.delete(entry));
    view.onDidChangeVisibility(() => {
      if (!view.visible) entry.ready = false;
    });
  }

  /** As visões que estão à vista e prontas. */
  get live() {
    return [...this.entries].filter((e) => e.ready && e.view.visible);
  }

  get visible() {
    return this.live.length > 0;
  }

  /** Reação do editor: só chega se o pet está à vista (o bicho só vive onde você o vê). */
  post(msg) {
    const live = this.live;
    for (const e of live) e.view.webview.postMessage(msg);
    return live.length > 0;
  }

  /** Pedido do usuário (comando, atalho): se o pet ainda não abriu, espera por ele alguns segundos. */
  command(msg) {
    if (this.post(msg)) return;
    this.queue = [...this.queue.slice(-4), { msg, at: Date.now() }];
  }

  receive(m, entry) {
    if (!m || typeof m !== "object") return;
    if (m.type === "ready") {
      entry.ready = true;
      entry.view.webview.postMessage({ type: "init", state: this.state, config: this.config, ...this.initExtra() });
      const pending = this.queue.filter((q) => Date.now() - q.at < 5000);
      this.queue = [];
      for (const q of pending) entry.view.webview.postMessage(q.msg);
    } else if (m.type === "state" && m.state && m.state.v === 1) {
      this.state = m.state;
      this.context.globalState.update(STATE_KEY, m.state);
      for (const e of this.live) if (e !== entry) e.view.webview.postMessage({ type: "sync", state: m.state });
      this.on.state(m.state);
    } else if (m.type === "cero") {
      this.on.cero(m);
    } else if (m.type === "hunt") {
      this.on.hunt(Math.max(0, Math.min(50, m.n | 0)));
    } else if (m.type === "levelup") {
      vscode.window.setStatusBarMessage(`$(flame) ${this.config.name}: ${m.name}`, 5000);
    }
  }

  /** Abre uma visão sem deixar o teclado preso nela: quem estava digitando no editor continua digitando. */
  async reveal(id = VIEW_ID) {
    const editing = !!vscode.window.activeTextEditor;
    await vscode.commands.executeCommand(`${id}.focus`);
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

module.exports = { PetView, VIEW_ID, DEBUG_VIEW_ID, STATE_KEY };
