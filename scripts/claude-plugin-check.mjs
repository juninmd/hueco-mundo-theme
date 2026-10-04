#!/usr/bin/env node
// Confere o plugin do Claude Code (claude-code/hollowzinho) e o marketplace que o publica (.claude-plugin/marketplace.json).
//
// Sem rede e sem o `claude`, confere que os manifestos batem entre si e com os arquivos: o plugin que o marketplace aponta existe,
// os módulos de hooks e o contrato de tipos que o plugin declara existem, e cada opção do `userConfig` é lida por algum hook.
// Com o `claude` no PATH, também roda `claude plugin validate --strict` (os dois) e `claude plugin test`. Sai com 1 se algo reprovar.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const json = (path) => JSON.parse(readFileSync(path, "utf8"));
const problems = [];

/** Roda uma verificação que devolve a lista de problemas: ✓ se vazia, senão os problemas entram no relatório. */
function step(label, check) {
  const found = check();
  if (found.length === 0) console.log(`  ✓ ${label}`);
  else problems.push(...found.map((f) => `${label}: ${f}`));
}

console.log("Manifestos");
const market = json(join(ROOT, ".claude-plugin/marketplace.json"));
const entry = market.plugins?.find((p) => p.name === "hollowzinho");
const PLUGIN = join(ROOT, entry?.source ?? "claude-code/hollowzinho");
const manifest = existsSync(join(PLUGIN, ".claude-plugin/plugin.json")) ? json(join(PLUGIN, ".claude-plugin/plugin.json")) : null;

step("o marketplace aponta para o plugin", () => {
  if (!entry) return ["marketplace.json não lista o plugin hollowzinho"];
  if (!manifest) return [`${entry.source}: sem .claude-plugin/plugin.json`];
  const found = [];
  if (manifest.name !== entry.name) found.push(`nome: marketplace "${entry.name}" ≠ plugin "${manifest.name}"`);
  if (manifest.version !== entry.version) found.push(`versão: marketplace ${entry.version} ≠ plugin ${manifest.version}`);
  for (const key of ["license", "repository"]) if (manifest[key] !== entry[key]) found.push(`${key}: marketplace "${entry[key]}" ≠ plugin "${manifest[key]}"`);
  return found;
});

if (manifest) {
  step("os módulos de hooks e o contrato de tipos existem", () => {
    const modules = json(join(PLUGIN, "hooks/hooks.json")).modules ?? [];
    const found = modules.length ? [] : ["hooks/hooks.json não declara módulos"];
    for (const m of modules) if (!existsSync(join(PLUGIN, "hooks", m))) found.push(`módulo que não existe: ${m}`);
    if (manifest.types && !existsSync(join(PLUGIN, manifest.types))) found.push(`contrato de tipos que não existe: ${manifest.types}`);
    return found;
  });

  // Cada opção que o manifesto oferece precisa ser lida por algum hook; senão ela promete o que não faz.
  step(`as ${Object.keys(manifest.userConfig ?? {}).length} opções de userConfig são lidas e têm padrão válido`, () => {
    const sources = readdirSync(join(PLUGIN, "hooks"))
      .filter((f) => /\.tsx?$/.test(f))
      .map((f) => readFileSync(join(PLUGIN, "hooks", f), "utf8"))
      .join("\n");
    const found = [];
    for (const [key, spec] of Object.entries(manifest.userConfig ?? {})) {
      if (!new RegExp(`\\b${key}\\b`).test(sources)) found.push(`${key} não é lida por nenhum hook`);
      if (spec.default === undefined) found.push(`${key} sem valor padrão`);
      else if (spec.options && !spec.options.includes(spec.default)) found.push(`${key}: o padrão "${spec.default}" não está nas opções`);
    }
    return found;
  });
}

console.log("Claude Code");
if (spawnSync("claude", ["plugin", "test", "--help"], { encoding: "utf8" }).status !== 0) {
  console.log("  - o `claude` com `plugin test` não está no PATH: validate e test pulados");
} else {
  const run = (label, args) =>
    step(label, () => {
      const r = spawnSync("claude", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
      return r.status === 0 ? [] : [`\n${`${r.stdout || ""}${r.stderr || ""}`.split("\n").slice(-25).join("\n")}`];
    });
  run("claude plugin validate --strict (marketplace)", ["plugin", "validate", "--strict", ROOT]);
  run("claude plugin validate --strict (plugin)", ["plugin", "validate", "--strict", PLUGIN]);
  run("claude plugin test", ["plugin", "test", PLUGIN]);
}

if (problems.length) {
  console.error(`\n✗ ${problems.length} problema(s):\n${problems.map((f) => `  - ${f}`).join("\n")}`);
  process.exit(1);
}
console.log("\nplugin do Claude Code: ok");
