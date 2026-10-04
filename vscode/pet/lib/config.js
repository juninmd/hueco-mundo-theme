"use strict";

const vscode = require("vscode");

/** Lê as configurações `hollowzinho.*` (e o lado da barra lateral) num objeto simples, que também vai para o webview. */
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
    reactToDebug: c.get("reactToDebug", true),
    reactToWorkspace: c.get("reactToWorkspace", true),
    bugs: c.get("bugs", true),
    autoCero: c.get("autoCero", "exceptions"),
    quickFix: c.get("quickFix", true),
    editorEffects: c.get("editorEffects", true),
    statusBar: c.get("statusBar", true),
  };
}

module.exports = { readConfig };
