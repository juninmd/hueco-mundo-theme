"use strict";

const crypto = require("crypto");

/** Quantos bichos aparecem de uma vez na visão. O resto vira só a contagem. */
const MAX_VISIBLE = 6;

const hash = (s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 10);
const codeOf = (c) => ((c && typeof c === "object" ? c.value : c) ?? "");

/**
 * Transforma os erros do VS Code em "bugs" com um id que sobrevive a linhas que mudam de lugar: o id vem do arquivo,
 * da fonte, do código e da mensagem do erro (e de quantos iguais vieram antes), nunca da posição. Corrigir um erro
 * faz o id dele sumir; inserir uma linha acima não mexe em nada. Só os ids vão para o webview.
 *
 * `entries`: [{ uri, uriKey, line, character, source, code, message }]. O arquivo ativo vem primeiro.
 */
function buildBugs(entries, activeKey) {
  const sorted = entries.slice().sort((a, b) => {
    const ra = a.uriKey === activeKey ? 0 : 1;
    const rb = b.uriKey === activeKey ? 0 : 1;
    return ra - rb || (a.uriKey < b.uriKey ? -1 : a.uriKey > b.uriKey ? 1 : 0) || a.line - b.line || a.character - b.character;
  });
  const seen = new Map();
  return sorted.map((e) => {
    const key = [e.uriKey, e.source || "", codeOf(e.code), e.message].join("\u0001");
    const n = seen.get(key) || 0;
    seen.set(key, n + 1);
    return { ...e, id: hash(`${key}#${n}`) };
  });
}

/** O próximo bug depois do cursor, no arquivo ativo; senão o primeiro de outro arquivo; senão volta ao começo. */
function pickNext(bugs, activeKey, cursor) {
  if (!bugs.length) return null;
  const here = bugs.filter((b) => b.uriKey === activeKey);
  if (!cursor) return here[0] || bugs[0];
  const after = here.find((b) => b.line > cursor.line || (b.line === cursor.line && b.character > cursor.character));
  if (after) return after;
  const others = bugs.filter((b) => b.uriKey !== activeKey);
  return others[0] || here[0] || bugs[0];
}

module.exports = { MAX_VISIBLE, buildBugs, pickNext, hash };
