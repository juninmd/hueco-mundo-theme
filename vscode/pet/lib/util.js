"use strict";

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

module.exports = { cooldown, debounce, clamp };
