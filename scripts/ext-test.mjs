#!/usr/bin/env node
// Testes da extensão do VS Code que não precisam do VS Code: a lógica dos bugs (ids estáveis, ordem, próximo erro),
// os utilitários e a coerência do manifesto (comandos, configurações e textos traduzidos). Sai com 1 se algo falhar.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)), "vscode/pet");
const require = createRequire(import.meta.url);
const { buildBugs, pickNext, MAX_VISIBLE } = require(join(root, "lib/bugs.js"));
const { cooldown, debounce, clamp } = require(join(root, "lib/util.js"));

let failed = 0;
const check = (name, ok, extra = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${extra ? `  (${extra})` : ""}`);
};

const e = (uriKey, line, message, character = 0, extra = {}) => ({ uri: uriKey, uriKey, line, character, source: "ts", code: 2322, message, ...extra });

// ── bugs
const base = [e("file:///b.ts", 9, "Tipo errado"), e("file:///a.ts", 4, "Falta ponto"), e("file:///a.ts", 1, "Nome não existe"), e("file:///c.ts", 0, "Outro")];
const bugs = buildBugs(base, "file:///b.ts");
check("o arquivo ativo vem primeiro, depois por arquivo e posição", bugs.map((b) => `${b.uriKey.slice(-4)}:${b.line}`).join(" ") === "b.ts:9 a.ts:1 a.ts:4 c.ts:0", bugs.map((b) => `${b.uriKey.slice(-4)}:${b.line}`).join(" "));
check("cada bug tem um id curto e único", new Set(bugs.map((b) => b.id)).size === bugs.length && bugs.every((b) => /^[0-9a-f]{10}$/.test(b.id)));

const shifted = buildBugs(base.map((x) => ({ ...x, line: x.line + 3 })), "file:///b.ts");
check("o id sobrevive a linhas que mudam de lugar", bugs.map((b) => b.id).sort().join() === shifted.map((b) => b.id).sort().join());

const fixed = buildBugs(base.filter((x) => x.message !== "Falta ponto"), "file:///b.ts");
const gone = bugs.filter((b) => !fixed.some((f) => f.id === b.id));
check("corrigir um erro faz só o id dele sumir", gone.length === 1 && gone[0].message === "Falta ponto", gone.map((g) => g.message).join());

const twins = [e("file:///a.ts", 1, "Igual"), e("file:///a.ts", 5, "Igual"), e("file:///a.ts", 9, "Igual")];
const t3 = buildBugs(twins, "file:///a.ts");
const t2 = buildBugs(twins.slice(1), "file:///a.ts");
check("erros idênticos ganham ids diferentes, e corrigir um tira um id só", new Set(t3.map((b) => b.id)).size === 3 && t3.filter((b) => !t2.some((x) => x.id === b.id)).length === 1);

check("a mensagem faz parte da identidade (mesma linha, outro erro, outro id)", buildBugs([e("file:///a.ts", 1, "A")], "")[0].id !== buildBugs([e("file:///a.ts", 1, "B")], "")[0].id);
check("o código do erro pode ser um objeto { value }", buildBugs([e("file:///a.ts", 1, "A", 0, { code: { value: 2322, target: {} } })], "")[0].id === buildBugs([e("file:///a.ts", 1, "A", 0, { code: 2322 })], "")[0].id);
check("a visão mostra até 6 bichos", MAX_VISIBLE === 6);

// ── próximo erro
const here = buildBugs([e("file:///a.ts", 2, "x"), e("file:///a.ts", 8, "y"), e("file:///z.ts", 0, "z")], "file:///a.ts");
check("próximo erro: o seguinte depois do cursor, no mesmo arquivo", pickNext(here, "file:///a.ts", { line: 2, character: 0 }).line === 8);
check("próximo erro: acabou o arquivo, vai para outro arquivo", pickNext(here, "file:///a.ts", { line: 8, character: 0 }).uriKey === "file:///z.ts");
check("próximo erro: só há erros neste arquivo, dá a volta", pickNext(buildBugs([e("file:///a.ts", 2, "x")], "file:///a.ts"), "file:///a.ts", { line: 5, character: 0 }).line === 2);
check("próximo erro: sem erros não há alvo", pickNext([], "file:///a.ts", { line: 0, character: 0 }) === null);
check("próximo erro: sem cursor, começa pelo primeiro", pickNext(here, "file:///a.ts", null).line === 2);

// ── utilitários
const cd = cooldown(60);
check("cooldown deixa a primeira passar e segura a segunda", cd() === true && cd() === false);
await new Promise((r) => setTimeout(r, 80));
check("cooldown libera de novo depois do prazo", cd() === true);
let hits = 0;
const d = debounce(() => hits++, 40);
d(); d(); d();
await new Promise((r) => setTimeout(r, 90));
check("debounce junta três chamadas numa", hits === 1);
d(); d.cancel();
await new Promise((r) => setTimeout(r, 70));
check("debounce.cancel cancela a chamada pendente", hits === 1);
check("clamp limita nos dois lados", clamp(5, 0, 3) === 3 && clamp(-1, 0, 3) === 0 && clamp(2, 0, 3) === 2);

// ── manifesto
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const nls = { en: JSON.parse(readFileSync(join(root, "package.nls.json"), "utf8")), "pt-br": JSON.parse(readFileSync(join(root, "package.nls.pt-br.json"), "utf8")) };
const ext = readFileSync(join(root, "extension.js"), "utf8");
const cfgSrc = readFileSync(join(root, "lib/config.js"), "utf8");

const refs = new Set([...JSON.stringify(pkg).matchAll(/%([\w.\-]+)%/g)].map((m) => m[1]));
for (const [lang, table] of Object.entries(nls)) {
  const missing = [...refs].filter((k) => !(k in table));
  check(`todo texto %chave% do manifesto existe em package.nls (${lang})`, missing.length === 0, missing.join(", "));
}
check("os dois idiomas têm as mesmas chaves", Object.keys(nls.en).sort().join() === Object.keys(nls["pt-br"]).sort().join());

const cmds = pkg.contributes.commands.map((c) => c.command.replace("hollowzinho.", ""));
const registered = new Set([...ext.matchAll(/reg\("(\w+)"/g)].map((m) => m[1]));
check("todo comando do manifesto está registrado na extensão", cmds.every((c) => registered.has(c)), cmds.filter((c) => !registered.has(c)).join(", "));

const props = Object.keys(pkg.contributes.configuration.properties).map((k) => k.replace("hollowzinho.", ""));
const read = new Set([...cfgSrc.matchAll(/c\.get\("(\w+)"/g)].map((m) => m[1]));
check("toda configuração do manifesto é lida em config.js", props.every((p) => read.has(p)), props.filter((p) => !read.has(p)).join(", "));
check("toda configuração lida em config.js existe no manifesto", [...read].every((p) => props.includes(p)), [...read].filter((p) => !props.includes(p)).join(", "));

console.log(failed ? `\n${failed} verificação(ões) falharam.` : "\nTudo certo.");
process.exit(failed ? 1 : 0);
