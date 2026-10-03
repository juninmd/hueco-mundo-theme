"use strict";

const vscode = require("vscode");

/**
 * Liga o pet ao depurador. Só lê o que o protocolo de depuração (DAP) já anuncia: o motivo da parada (breakpoint,
 * exceção, passo), a retomada, o código de saída e, numa exceção, o arquivo e a linha do topo da pilha. Nunca lê
 * variáveis, valores nem o texto do código.
 *
 * `emit(msg)` manda ao pet; `onException({ uri, line })` avisa onde a exceção parou (para o Cero acertar a linha).
 */
function attachDebug({ subs, cfg, emit, onException }) {
  const sessions = new Set();
  const exits = new Map();
  let state = null; // null (sem sessão), "running" ou "paused": quem abre a visão no meio de uma sessão precisa saber

  const on = () => cfg().reactToDebug;

  subs.push(
    vscode.debug.onDidStartDebugSession((s) => {
      sessions.add(s.id);
      if (sessions.size === 1) state = "running";
      if (on() && sessions.size === 1) emit({ type: "debug", state: "start" });
    }),
    vscode.debug.onDidTerminateDebugSession((s) => {
      sessions.delete(s.id);
      const code = exits.get(s.id);
      exits.delete(s.id);
      if (sessions.size === 0) state = null;
      if (on() && sessions.size === 0) emit({ type: "debug", state: "end", exitCode: typeof code === "number" ? code : null });
    }),
    vscode.debug.onDidChangeBreakpoints((e) => {
      if (on() && e.added.length) emit({ type: "react", kind: "breakpoint" });
    })
  );

  /** O topo da pilha, só arquivo e linha. Falha em silêncio: o adaptador pode não saber responder. */
  async function topFrame(session, threadId) {
    try {
      const r = await session.customRequest("stackTrace", { threadId, startFrame: 0, levels: 1 });
      const f = r && r.stackFrames && r.stackFrames[0];
      if (!f || !f.source || !f.source.path) return null;
      return { uri: vscode.Uri.file(f.source.path), line: Math.max(0, (f.line || 1) - 1) };
    } catch (_) {
      return null;
    }
  }

  async function stopped(session, body) {
    state = "paused";
    if (!on()) return;
    const reason = String(body.reason || "");
    if (reason === "exception") {
      const where = await topFrame(session, body.threadId);
      if (where) onException(where);
      emit({ type: "debug", state: "exception", located: !!where });
    } else if (reason === "step") {
      emit({ type: "debug", state: "step" });
    } else {
      emit({ type: "debug", state: "paused", reason });
    }
  }

  subs.push(
    vscode.debug.registerDebugAdapterTrackerFactory("*", {
      createDebugAdapterTracker(session) {
        return {
          onDidSendMessage(m) {
            if (!m || m.type !== "event") return;
            if (m.event === "stopped") stopped(session, m.body || {});
            else if (m.event === "continued") {
              state = "running";
              if (on()) emit({ type: "debug", state: "continued" });
            }
            else if (m.event === "exited") exits.set(session.id, m.body && m.body.exitCode);
          },
        };
      },
    })
  );

  return {
    get active() {
      return sessions.size > 0;
    },
    get state() {
      return on() ? state : null;
    },
  };
}

module.exports = { attachDebug };
