// Hollowzinho para o VS Code.
// A extensão escuta o editor, o depurador, as tarefas e o Git, e conta ao pet o que aconteceu; quem desenha, fala e se
// mexe é o <hollow-pet> dentro do webview (media/view.js). Nada aqui altera o seu código: o Cero só pisca a linha por
// cima do editor, e os "bugs" da barra lateral são só um desenho que acompanha os erros que o VS Code já mostra.
"use strict";

const vscode = require("vscode");
const { cooldown, debounce, clamp } = require("./lib/util");
const { readConfig } = require("./lib/config");
const { CeroFlash } = require("./lib/flash");
const { PetView, VIEW_ID, DEBUG_VIEW_ID } = require("./lib/petview");
const { MAX_VISIBLE, buildBugs, pickNext } = require("./lib/bugs");
const { attachDebug } = require("./lib/debug");

const REVEALED_KEY = "hollowzinho.revealed";
const HUNTED_KEY = "hollowzinho.hunted";
const DEBUG_REVEALED_KEY = "hollowzinho.debugRevealed";
const BUILD_CMD = /\b(test|tests|jest|vitest|mocha|pytest|tox|rspec|phpunit|build|compile|tsc|webpack|vite|rollup|esbuild|make|cmake|gradle|gradlew|mvn|cargo|go\s+(?:test|build|vet)|dotnet\s+(?:test|build)|lint|eslint|ruff|mypy|ctest|bazel)\b/i;

function activate(context) {
  const view = new PetView(context);
  const cfg = () => view.config;
  const subs = context.subscriptions;
  const flashCero = new CeroFlash("CERO");
  const flashBug = new CeroFlash("BUG");
  subs.push(flashCero, flashBug);
  const reduceMotion = () => vscode.workspace.getConfiguration("workbench").get("reduceMotion", "auto") === "on";
  const pt = () => cfg().lang === "pt";

  /* ───────── onde o Cero acerta no editor ───────── */

  const editorFor = (uri) => vscode.window.visibleTextEditors.find((e) => e.document.uri.toString() === uri.toString());

  /** Cero comum: acende a linha do cursor quando o pet dispara (ou direto, se ele não está à vista). */
  const flashCurrent = (delay = 260) => {
    if (!cfg().editorEffects) return;
    setTimeout(() => flashCero.fire(vscode.window.activeTextEditor, { calm: reduceMotion() }), delay);
  };

  /** Cero num bug: acende a linha do erro (ou da exceção), se o arquivo dele estiver à vista. */
  const lightUp = (target, delay = 260) => {
    if (!cfg().editorEffects) return;
    setTimeout(() => flashBug.fire(editorFor(target.uri), { lines: [target.line], calm: reduceMotion() }), delay);
  };

  /** Leva o editor até o bug: abre o arquivo, põe o cursor no erro e rola até ele. */
  async function reveal(t) {
    const doc = await vscode.workspace.openTextDocument(t.uri);
    const editor = await vscode.window.showTextDocument(doc, { preserveFocus: false });
    const pos = new vscode.Position(t.line, t.character || 0);
    editor.selection = new vscode.Selection(pos, pos);
    editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    return editor;
  }

  /* ───────── os bugs: um por erro que o VS Code mostra ───────── */

  let bugs = []; // erros de agora, em ordem (o arquivo ativo primeiro)
  let warnings = 0;
  let boss = null; // { uri, line } enquanto uma exceção está parada no depurador
  const adhoc = new Map(); // alvos avulsos: o "Cero neste erro" num erro que não está na lista

  const bugById = (id) => (id === "boss" ? boss : bugs.find((b) => b.id === id) || adhoc.get(id) || null);

  function refreshBugs() {
    const entries = [];
    warnings = 0;
    for (const [uri, list] of vscode.languages.getDiagnostics()) {
      for (const d of list) {
        if (d.severity === vscode.DiagnosticSeverity.Warning) warnings++;
        else if (d.severity === vscode.DiagnosticSeverity.Error) {
          entries.push({ uri, uriKey: uri.toString(), line: d.range.start.line, character: d.range.start.character, source: d.source || "", code: d.code, message: d.message });
        }
      }
    }
    const active = vscode.window.activeTextEditor;
    bugs = buildBugs(entries, active ? active.document.uri.toString() : "");
  }

  // Só ids vão para o webview: a mensagem do erro e o caminho do arquivo ficam aqui.
  const bugsMessage = (extra = {}) => ({
    type: "bugs",
    ids: bugs.slice(0, MAX_VISIBLE).map((b) => b.id),
    all: bugs.slice(0, 500).map((b) => b.id),
    total: bugs.length,
    ...extra,
  });

  /* ───────── barra de status ───────── */

  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 20);
  status.command = `${VIEW_ID}.focus`;
  subs.push(status);
  const stageOf = (bond) => (bond >= 40 ? "Vasto Lorde" : bond >= 15 ? "Adjuchas" : "Hollow");
  const paintStatus = (st) => {
    if (!cfg().statusBar || !st) return status.hide();
    const r = Math.round(st.reiatsu);
    const hungry = r < 30;
    const hunted = context.globalState.get(HUNTED_KEY, 0);
    status.text = `$(${hungry ? "flame" : "heart"}) ${r}`;
    status.name = cfg().name;
    status.tooltip = new vscode.MarkdownString(
      `**${cfg().name}** · ${stageOf(st.bond)}\n\nReiatsu ${r}/100 · ${pt() ? "Vínculo" : "Bond"} ${st.bond}\n\n${pt() ? "Bugs abatidos" : "Bugs hunted"}: ${hunted}\n\n${pt() ? "Clique para abrir o pet." : "Click to open the pet."}`
    );
    status.color = hungry ? new vscode.ThemeColor("editorWarning.foreground") : undefined;
    status.show();
  };
  view.on.state = paintStatus;
  paintStatus(view.state);

  /* ───────── a visão e o que o pet escuta dela ───────── */

  let dbg = { active: false, state: null };
  view.initExtra = () => {
    refreshBugs();
    return { bugs: bugsMessage({ quiet: true }), debug: dbg.state, hunted: context.globalState.get(HUNTED_KEY, 0) };
  };
  for (const id of [VIEW_ID, DEBUG_VIEW_ID]) {
    subs.push(vscode.window.registerWebviewViewProvider(id, view.provider(), { webviewOptions: { retainContextWhenHidden: false } }));
  }

  // Todo efeito no editor nasce de um Cero do pet: o comando só pede, e o disparo avisa de volta para acender a linha.
  view.on.cero = async (m) => {
    const target = m.bugId ? bugById(m.bugId) : null;
    if (!target) return flashCurrent();
    if (m.navigate) await reveal(target);
    lightUp(target, m.navigate ? 140 : 260);
  };
  view.on.hunt = (n) => {
    if (!n) return;
    context.globalState.update(HUNTED_KEY, context.globalState.get(HUNTED_KEY, 0) + n);
    paintStatus(view.state);
  };

  subs.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration("hollowzinho") && !e.affectsConfiguration("workbench.sideBar.location")) return;
      view.config = readConfig();
      view.post({ type: "config", config: view.config });
      paintStatus(view.state);
    })
  );

  /* ───────── digitar alimenta e o olhar acompanha o cursor ───────── */

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

  // Só o Ctrl+S (salvar de propósito) alegra o bicho: com salvamento automático ele ficaria em festa o tempo todo.
  let manualSaveAt = 0;
  const happySave = cooldown(5000);
  subs.push(
    vscode.workspace.onWillSaveTextDocument((e) => {
      if (e.reason === vscode.TextDocumentSaveReason.Manual) manualSaveAt = Date.now();
    }),
    vscode.workspace.onDidSaveTextDocument(() => {
      if (cfg().reactToEditing && bugs.length === 0 && Date.now() - manualSaveAt < 3000 && happySave()) view.post({ type: "react", kind: "save" });
    })
  );

  /* ───────── problemas: cada erro vira um bug na visão ───────── */

  const warnCool = cooldown(30000);
  let hadWarnings = false;
  const diag = debounce(() => {
    if (!cfg().reactToDiagnostics) return;
    refreshBugs();
    view.post(bugsMessage());
    if (bugs.length === 0 && warnings > 0 && !hadWarnings && warnCool()) view.post({ type: "react", kind: "warn" });
    hadWarnings = warnings > 0;
  }, 900);
  // Trocar de arquivo muda a ordem dos bugs (o ativo vem primeiro), sem nenhum erro novo ou corrigido.
  const reorder = debounce(() => {
    if (!cfg().reactToDiagnostics) return;
    refreshBugs();
    view.post(bugsMessage({ quiet: true }));
  }, 350);
  subs.push(vscode.languages.onDidChangeDiagnostics(diag), vscode.window.onDidChangeActiveTextEditor(reorder), {
    dispose: () => {
      diag.cancel();
      reorder.cancel();
    },
  });

  /* ───────── tarefas e comandos de build/teste no terminal ───────── */

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

  /* ───────── depurador ───────── */

  dbg = attachDebug({
    subs,
    cfg,
    emit: (m) => {
      if (m.type === "debug" && (m.state === "end" || m.state === "continued")) boss = null;
      // O VS Code troca a barra lateral para "Executar e Depurar" ao depurar, e o Explorer some junto com o pet:
      // na primeira vez, abre a visão do pet lá também (e avisa onde ele fica melhor).
      if (m.type === "debug" && m.state === "start" && !context.globalState.get(DEBUG_REVEALED_KEY)) {
        setTimeout(() => {
          if (view.visible || context.globalState.get(DEBUG_REVEALED_KEY)) return;
          context.globalState.update(DEBUG_REVEALED_KEY, true);
          view.reveal(DEBUG_VIEW_ID).then(undefined, () => {});
        }, 1500);
      }
      // Sem o pet à vista (ele só vive onde você o vê), ao menos uma pista na barra de status.
      if (m.type === "debug" && m.state === "exception" && !view.visible) {
        vscode.window.setStatusBarMessage(`$(bug) ${cfg().name}: ${pt() ? "bug em tempo de execução!" : "a runtime bug!"}`, 6000);
      }
      view.post(m);
    },
    onException: (where) => {
      boss = { id: "boss", uri: where.uri, uriKey: where.uri.toString(), line: where.line, character: 0 };
    },
  });

  /* ───────── git: commit é comida, push é festa, branch nova é passeio ───────── */

  const hooked = new WeakSet();
  const ate = cooldown(2500);
  const gitCool = cooldown(4000);
  const hookRepo = (repo) => {
    if (hooked.has(repo)) return;
    hooked.add(repo);
    // onDidCommit só cobre commits feitos pela própria interface do VS Code; para pegar também os do terminal,
    // observa-se o HEAD: o commit muda na mesma branch (commit), a branch muda (passeio) ou "à frente" zera (push).
    let last = repo.state.HEAD && repo.state.HEAD.commit;
    let branch = repo.state.HEAD && repo.state.HEAD.name;
    let ahead = repo.state.HEAD && repo.state.HEAD.ahead;
    subs.push(
      repo.state.onDidChange(() => {
        const head = repo.state.HEAD;
        if (head && cfg().reactToGit) {
          if (branch && head.name !== branch) {
            if (gitCool()) view.post({ type: "react", kind: "branch" });
          } else if (head.commit && last && head.commit !== last) {
            if (ate()) view.post({ type: "react", kind: "commit" });
          } else if (typeof ahead === "number" && typeof head.ahead === "number" && ahead > 0 && head.ahead === 0 && gitCool()) {
            view.post({ type: "react", kind: "push" });
          }
        }
        last = head && head.commit;
        branch = head && head.name;
        ahead = head && head.ahead;
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

  /* ───────── a janela e os arquivos ───────── */

  let blurAt = 0;
  const fileCool = cooldown(6000);
  subs.push(
    vscode.window.onDidChangeWindowState((s) => {
      if (!s.focused) {
        blurAt = Date.now();
        return;
      }
      if (cfg().reactToWorkspace && blurAt && Date.now() - blurAt > 10 * 60 * 1000) view.post({ type: "react", kind: "welcomeBack" });
      blurAt = 0;
    }),
    vscode.workspace.onDidCreateFiles(() => cfg().reactToWorkspace && fileCool() && view.post({ type: "react", kind: "fileNew" })),
    vscode.workspace.onDidDeleteFiles(() => cfg().reactToWorkspace && fileCool() && view.post({ type: "react", kind: "fileGone" }))
  );

  /* ───────── "Cero neste erro", no menu de correção rápida ───────── */

  subs.push(
    vscode.languages.registerCodeActionsProvider(
      "*",
      {
        provideCodeActions(doc, _range, ctx) {
          if (!cfg().quickFix) return undefined;
          const d = ctx.diagnostics.find((x) => x.severity === vscode.DiagnosticSeverity.Error);
          if (!d) return undefined;
          const title = pt() ? "Hollowzinho: Cero neste erro" : "Hollowzinho: Cero at this error";
          const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
          action.command = { command: "hollowzinho.ceroAt", title, arguments: [doc.uri, d.range] };
          action.diagnostics = [d];
          return [action];
        },
      },
      { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
    )
  );

  // Visões novas nascem fechadas no Explorer: na primeira vez, abre uma só vez para o bicho ser visto.
  if (!context.globalState.get(REVEALED_KEY)) {
    context.globalState.update(REVEALED_KEY, true);
    setTimeout(() => view.reveal().then(undefined, () => {}), 1500);
  }

  /* ───────── comandos ───────── */

  const send = async (name) => {
    if (!view.visible) await view.reveal();
    view.command({ type: "cmd", name });
  };

  /** Pede ao pet que acerte um bug. Com o pet à vista é ele quem dispara e avisa de volta; sem ele, só a linha acende. */
  async function shootBug(t, { navigate }) {
    if (view.visible) return view.command({ type: "cmd", name: "ceroBug", id: t.id, navigate });
    if (navigate) await reveal(t);
    lightUp(t, 0);
  }

  const reg = (id, fn) => subs.push(vscode.commands.registerCommand(`hollowzinho.${id}`, fn));
  reg("pet", () => send("pet"));
  reg("feed", () => send("feed"));
  reg("sleep", () => send("sleep"));
  reg("dock", () => send("dock"));
  reg("show", () => send("show"));
  reg("reset", () => send("reset"));
  reg("cero", () => {
    if (view.visible) view.command({ type: "cmd", name: "cero" });
    else flashCurrent(0);
  });
  reg("ceroError", async () => {
    refreshBugs();
    const ed = vscode.window.activeTextEditor;
    const target = pickNext(bugs, ed ? ed.document.uri.toString() : "", ed ? ed.selection.active : null);
    if (!target) {
      if (!view.visible) await view.reveal();
      view.command({ type: "react", kind: "noErrors" });
      return;
    }
    await shootBug(target, { navigate: true });
  });
  reg("ceroAt", async (uri, range) => {
    refreshBugs();
    const key = uri.toString();
    const at = range.start;
    let t = bugs.find((b) => b.uriKey === key && b.line === at.line && b.character === at.character) || bugs.find((b) => b.uriKey === key && b.line === at.line);
    if (!t) {
      t = { id: "adhoc", uri, uriKey: key, line: at.line, character: at.character };
      adhoc.set("adhoc", t);
    }
    await shootBug(t, { navigate: false });
  });
}

function deactivate() {}

module.exports = { activate, deactivate };
