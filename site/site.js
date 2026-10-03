/* Comportamento da página de demonstração. Nada aqui é necessário para usar o tema. */
(function () {
  "use strict";
  const root = document.documentElement;
  const params = new URLSearchParams(location.search);
  const still = params.has("still");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches || still;
  root.classList.add("js");
  if (still) root.classList.add("still");

  const $ = (q, el = document) => el.querySelector(q);
  const $$ = (q, el = document) => [...el.querySelectorAll(q)];
  const safe = (fn) => {
    try {
      return fn();
    } catch (_) {}
  };

  /* ───────── cor e contraste ───────── */
  const lum = (hex) => {
    const n = parseInt(hex.slice(1, 7), 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  const tok = (name) => getComputedStyle(document.body).getPropertyValue(name).trim().toLowerCase();

  /* ───────── céu estrelado (determinístico) ───────── */
  (function stars() {
    const g = $("#stars");
    if (!g) return;
    let s = 20260610;
    const rnd = () => {
      s |= 0;
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    let out = "";
    for (let i = 0; i < 190; i++) {
      const x = rnd() * 1600;
      const y = rnd() * rnd() * 560 + rnd() * 40;
      const big = rnd() > 0.93;
      const r = big ? 1.5 + rnd() * 0.8 : 0.4 + rnd() * 0.9;
      const o = (0.25 + rnd() * 0.65) * (1 - y / 760);
      const warm = rnd() > 0.7 ? "#ffe7c2" : rnd() > 0.5 ? "#cfd8ff" : "#ede9e0";
      out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${warm}" opacity="${o.toFixed(2)}"${rnd() > 0.82 && !reduce ? ` class="tw" style="animation-delay:${(rnd() * 4).toFixed(1)}s"` : ""}/>`;
      if (big) out += `<path d="M${(x - 6).toFixed(1)} ${y.toFixed(1)}H${(x + 6).toFixed(1)}M${x.toFixed(1)} ${(y - 6).toFixed(1)}V${(y + 6).toFixed(1)}" stroke="#ede9e0" stroke-width=".6" opacity="${(o * 0.5).toFixed(2)}"/>`;
    }
    g.innerHTML = out;
    if (!reduce) {
      const st = document.createElement("style");
      st.textContent = "@keyframes tw{0%,100%{opacity:.35}50%{opacity:1}}.tw{animation:tw 3.6s ease-in-out infinite}";
      document.head.appendChild(st);
    }
  })();

  /* ───────── cena: em tela estreita recorta o lado da lua e do castelo ───────── */
  (function fitScene() {
    const svg = $("#scene-svg");
    const moon = $("#moon");
    if (!svg) return;
    const apply = () => {
      const narrow = innerWidth < 760;
      svg.setAttribute("viewBox", narrow ? "780 0 820 900" : "0 0 1600 900");
      if (moon) moon.setAttribute("transform", narrow ? "translate(1292 206) scale(.6) translate(-1240 -250)" : "");
    };
    apply();
    addEventListener("resize", apply);
  })();

  /* ───────── paralaxe e partículas de reishi ───────── */
  const scene = $(".scene");
  if (scene) {
    $$(".layer", scene).forEach((l) => l.style.setProperty("--d", l.dataset.depth || "1"));
    if (!reduce) {
      addEventListener(
        "pointermove",
        (e) => {
          scene.style.setProperty("--px", ((e.clientX / innerWidth - 0.5) * -22).toFixed(2));
          scene.style.setProperty("--py", ((e.clientY / innerHeight - 0.5) * -14).toFixed(2));
        },
        { passive: true }
      );
    }
  }

  (function motes() {
    const cv = $("#motes");
    if (!cv) return;
    const ctx = cv.getContext("2d");
    let W = 0;
    let H = 0;
    let dpr = 1;
    let P = [];
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const init = () => {
      dpr = Math.min(2, devicePixelRatio || 1);
      W = cv.clientWidth;
      H = cv.clientHeight;
      cv.width = W * dpr;
      cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = W < 700 ? 34 : 84;
      P = Array.from({ length: n }, () => {
        const k = rnd();
        return { x: rnd() * W, y: rnd() * H * 0.92, r: 0.7 + rnd() * 1.7, vy: -(0.05 + rnd() * 0.22), vx: (rnd() - 0.5) * 0.06, ph: rnd() * 6.28, a: 0.25 + rnd() * 0.6, c: k < 0.13 ? "74,222,128" : k < 0.26 ? "246,80,109" : "237,233,224" };
      });
    };
    const draw = (t) => {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      for (const p of P) {
        if (!reduce) {
          p.y += p.vy;
          p.x += p.vx + Math.sin(t / 1900 + p.ph) * 0.13;
          if (p.y < -8) {
            p.y = H * 0.9;
            p.x = rnd() * W;
          }
        }
        const tw = reduce ? 1 : 0.65 + 0.35 * Math.sin(t / 700 + p.ph);
        const fade = Math.min(1, Math.max(0, (p.y - H * 0.04) / (H * 0.2)));
        ctx.fillStyle = `rgba(${p.c},${(p.a * 0.1 * fade * tw).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 5, 0, 6.283);
        ctx.fill();
        ctx.fillStyle = `rgba(${p.c},${(p.a * fade * tw).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.283);
        ctx.fill();
      }
    };
    init();
    addEventListener("resize", () => {
      init();
      if (reduce) draw(0);
    });
    if (reduce) return draw(0);
    let on = true;
    new IntersectionObserver((e) => (on = e[0].isIntersecting)).observe(cv);
    const loop = (t) => {
      if (on && !document.hidden) draw(t);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  })();

  /* ───────── navegação ───────── */
  const nav = $(".nav");
  const onScroll = () => nav.classList.toggle("scrolled", scrollY > 40);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ───────── toast e cópia ───────── */
  const toast = $("#toast");
  let toastT;
  const say = (msg) => {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(() => toast.classList.remove("show"), 1800);
  };
  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      safe(() => document.execCommand("copy"));
      ta.remove();
    }
    say(label || "Copiado");
  };

  /* ───────── amostras de cor ───────── */
  (function swatches() {
    const panel = tok("--color-panel");
    const fg = tok("--color-fg");
    const onAccent = tok("--color-on-accent");
    const how = {
      "--color-ink": [fg, "texto"],
      "--color-panel": [fg, "texto"],
      "--color-edge": [panel, "borda"],
      "--color-line": [panel, "UI"],
      "--color-accent": [onAccent, "texto"],
    };
    $$(".sw").forEach((b) => {
      const name = b.dataset.token;
      const hex = tok(name);
      if (!/^#[0-9a-f]{6}$/.test(hex)) return;
      const [against, label] = how[name] || [panel, "texto"];
      const isSurface = name === "--color-ink" || name === "--color-panel" || name === "--color-accent";
      const r = isSurface ? ratio(against, hex) : ratio(hex, against);
      const min = label === "UI" || label === "borda" ? 3 : 4.5;
      const ok = r >= min;
      const on = ratio("#ffffff", hex) > ratio("#050506", hex) ? "#ffffff" : "#050506";
      b.style.setProperty("--c", hex);
      b.style.setProperty("--on", on);
      b.innerHTML =
        `<span class="sw-chip"><span class="sw-aa">Aa</span></span>` +
        `<span class="sw-meta"><span class="sw-name">${b.dataset.name}</span><span class="sw-token">${name}</span><span class="sw-use">${b.dataset.use}</span>` +
        `<span class="sw-hex"><span>${hex.toUpperCase()}</span><span class="sw-ratio${ok ? "" : " low"}">${label === "borda" ? "decorativa" : (ok ? (label === "UI" ? "UI " : "AA ") : "") + r.toFixed(1) + ":1"}</span></span></span>`;
      b.setAttribute("aria-label", `${b.dataset.name}, ${hex.toUpperCase()}. Copiar`);
      b.addEventListener("click", () => copy(hex.toUpperCase(), "Copiado " + hex.toUpperCase()));
    });

    const list = $("#contrast-list");
    const pairs = [
      ["Osso sobre vazio", tok("--color-fg"), tok("--color-ink")],
      ["Osso sobre noite", tok("--color-fg"), tok("--color-panel")],
      ["Areia sobre noite", tok("--color-muted"), tok("--color-panel")],
      ["Poeira sobre noite", tok("--color-faint"), tok("--color-panel")],
      ["Cero claro sobre noite", tok("--color-accent-text"), tok("--color-panel")],
      ["Reiatsu sobre noite", tok("--color-ok"), tok("--color-panel")],
      ["Branco sobre Cero", "#ffffff", tok("--color-accent")],
    ];
    if (list)
      list.innerHTML = pairs
        .map(([n, a, b]) => {
          const r = ratio(a, b);
          return `<li><span>${n}</span><b>${r.toFixed(1)}:1</b><span class="bar"><i style="width:${Math.min(100, (r / 17) * 100).toFixed(0)}%"></i></span></li>`;
        })
        .join("");
  })();

  /* ───────── mock do Canto ───────── */
  (function canto() {
    const app = $("#canto-app");
    if (!app) return;
    const tabs = $$('.c-tabs [role="tab"]', app);
    const show = (tab) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        $("#" + t.getAttribute("aria-controls")).hidden = !on;
      });
    };
    tabs.forEach((t, i) => {
      t.tabIndex = i === 0 ? 0 : -1;
      t.addEventListener("click", () => show(t));
      t.addEventListener("keydown", (e) => {
        const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (!k) return;
        const n = tabs[(i + k + tabs.length) % tabs.length];
        n.focus();
        show(n);
        e.preventDefault();
      });
    });

    const boxes = $$(".c-chk", app);
    const update = () => {
      const n = boxes.filter((b) => b.checked).length;
      $("#c-count").textContent = `${n}/${boxes.length} concluídas`;
      $("#c-fill").style.width = (n / boxes.length) * 100 + "%";
      $(".c-bar", app).setAttribute("aria-valuenow", String(n));
      boxes.forEach((b) => b.closest(".task").classList.toggle("done", b.checked));
    };
    boxes.forEach((b) => b.addEventListener("change", update));

    $$(".seg").forEach((seg) => {
      const btns = $$(".seg-btn", seg);
      btns.forEach((b) =>
        b.addEventListener("click", () => {
          btns.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
          if (b.dataset.skin) app.classList.toggle("skin-padrao", b.dataset.skin === "padrao");
        })
      );
    });
  })();

  /* ───────── blocos de código copiáveis ───────── */
  $$(".snip[data-copy]").forEach((pre) => {
    const wrap = document.createElement("div");
    wrap.className = "snip-wrap";
    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(pre);
    const b = document.createElement("button");
    b.type = "button";
    b.className = "copy";
    b.textContent = "copiar";
    b.setAttribute("aria-label", "Copiar o trecho");
    b.addEventListener("click", () => copy(pre.innerText, "Trecho copiado"));
    wrap.appendChild(b);
  });

  /* ───────── controles do pet ───────── */
  (function pet() {
    const main = $("hollow-pet:not([inline])");
    const live = $("#pet-live");
    if (!main) return;
    $$("[data-pet]").forEach((b) =>
      b.addEventListener("click", () => {
        const a = b.dataset.pet;
        if (a === "reset") return main.reset?.();
        main[a]?.();
      })
    );
    const names = { pet: "Carinho", feed: "Alimentou", cero: "Cero", sleep: "Foi dormir", wake: "Acordou", levelup: "Evoluiu" };
    ["pet", "feed", "cero", "sleep", "wake", "levelup"].forEach((ev) =>
      main.addEventListener("hollow-pet:" + ev, (e) => {
        const d = e.detail;
        live.textContent = `${names[ev]} · vínculo ${d.bond} · reiatsu ${d.reiatsu} · estágio ${d.stage}`;
      })
    );
  })();

  /* ───────── revelar ao rolar ───────── */
  if (!reduce && "IntersectionObserver" in window) {
    const els = $$(".sec-head, .hm-card, .sw, .canto-stage, .win, .evo-card");
    els.forEach((el) => el.classList.add("rv"));
    const io = new IntersectionObserver(
      (list) =>
        list.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    els.forEach((el) => io.observe(el));
  }
})();
