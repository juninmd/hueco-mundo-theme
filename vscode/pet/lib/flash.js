"use strict";

const vscode = require("vscode");

/**
 * O Cero atravessa a barra lateral e chega no editor: a linha acende e esfria em quatro passos. É só decoração
 * (nunca toca no texto) e some sozinha em menos de um segundo. `label` é a palavra que aparece no fim da linha.
 */
class CeroFlash {
  constructor(label) {
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
        after: i < 2 ? { contentText: `  ${label}`, color: core, fontWeight: "700", margin: "0 0 0 1ch" } : undefined,
      })
    );
    this.timers = [];
  }

  /** Acende as linhas dadas (índices de linha) ou, sem `lines`, as linhas dos cursores do editor. */
  fire(editor, { lines, calm = false } = {}) {
    if (!editor) return;
    this.clear(editor);
    const set = new Set(lines && lines.length ? lines : editor.selections.slice(0, 20).map((s) => s.active.line));
    const max = editor.document.lineCount - 1;
    const ranges = [...set].filter((l) => l >= 0 && l <= max).map((l) => new vscode.Range(l, 0, l, 0));
    if (!ranges.length) return;
    const plan = calm ? [[0, 420]] : [[0, 110], [1, 150], [2, 200], [3, 260]];
    let at = 0;
    for (const [step, ms] of plan) {
      this.timers.push(
        setTimeout(() => {
          for (const d of this.steps) editor.setDecorations(d, []);
          editor.setDecorations(this.steps[step], ranges);
        }, at)
      );
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

module.exports = { CeroFlash };
