(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const smooth = reduce ? "auto" : "smooth";
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ==================================================================
   * Ideas you can pull. Each has lenses; [[key|text]] is pullable.
   * ================================================================== */
  const LENSES = [["meaning", "Meaning"], ["notation", "Notation"], ["mechanism", "Mechanism"], ["derivation", "Derivation"], ["assumptions", "Assumptions"]];
  const IDEAS = {
    base: {
      term: "base rate", src: ["src", "From your book"], quote: "Suppose 1 person in 100 has a certain condition.",
      meaning: "How common something is before you look at any [[evidence|evidence]]. Here, 1 person in 100 has the condition, so before the test, anyone has a 1% chance.",
      mechanism: "Rare means healthy people vastly outnumber sick ones. Even a small false-alarm rate, applied to that huge healthy crowd, produces more [[falsepos|false positives]] than the small sick group can produce true ones.",
      assumptions: "The 1% only holds if people are tested at random. If you were tested because of symptoms, your starting point is higher and the answer changes. This sentence quietly depends on who gets tested.",
      figure: true,
    },
    evidence: {
      term: "evidence", src: ["gen", "General explanation"],
      meaning: "Anything that should change how likely you think something is. A test result is evidence: it moves you up or down from the [[base|base rate]]. It doesn’t replace it.",
      mechanism: "Evidence works by comparison. How much more often would you see this result if the thing were true than if it were false? Here, 90% against 5%. That ratio is the strength of the evidence, and it still has to act on a starting point.",
    },
    falsepos: {
      term: "false positives", src: ["gen", "General explanation"],
      meaning: "Positive results for people who don’t have the condition: 5 of every 100 healthy people. A small rate on a big crowd. 5% of 990 is 49.5 people, and that crowd ends up in the [[denom|denominator]].",
      figure: true,
    },
    cond: {
      term: "P(condition | positive)", src: ["gen", "General explanation"],
      meaning: "Read the [[bar|vertical bar]] as “among.” Among everyone who tests positive, what fraction actually has the condition? It’s the number a patient wants, and here it’s only about 15%.",
      notation: "P( A | B ). A is what you’re asking about. B, right of the [[bar|bar]], is the crowd you’ve restricted to. Swap them and you’re asking a different question about a different crowd.",
      mechanism: "Gather everyone who tested positive: 9 true positives and 49.5 [[falsepos|false positives]]. Only the 9 have the condition. 9 ÷ 58.5 ≈ 15.4%.",
      figure: true,
    },
    inv: {
      term: "P(positive | condition)", src: ["gen", "General explanation"],
      meaning: "Among everyone who has the condition, the fraction who test positive: 90%. Doctors call it [[sens|sensitivity]]. It’s a fact about the test, not about you.",
      mechanism: "Gather the 10 people who have it. 9 test positive. 9 ÷ 10 = 90%. The same nine people as before, over a different [[denom|denominator]].",
      figure: true,
    },
    bar: {
      term: "the vertical bar", src: ["gen", "General explanation"],
      meaning: "“Given,” or “among those where…”. Everything on its right defines the crowd you count inside. It works by [[restrict|restricting attention]].",
      notation: "Books write P(A | B), P(A given B), sometimes P_B(A). They all say the same thing: B is the room you’re standing in.",
    },
    restrict: {
      term: "restricting attention", src: ["gen", "General explanation"],
      meaning: "Conditioning means setting aside every case outside the crowd, then counting again with what’s left. The bottom of the fraction, the [[denom|denominator]], shrinks to that crowd.",
      mechanism: "Before: 9 out of 1,000. After restricting to positives: 9 out of 58.5. The nine didn’t change. The room did.",
    },
    denom: {
      term: "denominator", src: ["gen", "General explanation"], floor: true,
      meaning: "The bottom of a fraction: the crowd you’re counting within. A surprising number of probability mistakes are really denominator mistakes, with the right number on top and the wrong crowd underneath.",
      figure: true,
    },
    sens: {
      term: "sensitivity", src: ["gen", "General explanation"],
      meaning: "How good a test is at catching the thing when it’s really there. A 90% sensitive test misses 1 in 10 true cases. On its own, it says nothing about what your positive result means.",
      assumptions: "Sensitivity is measured on some study population. It can be lower early in a disease, or in people unlike the ones studied.",
    },
    bayes: {
      term: "Bayes’ theorem", src: ["gen", "General explanation"],
      meaning: "A rule for flipping a conditional probability around. It needs exactly what intuition forgets: the [[base|base rate]].",
      notation: "P(A | B) = P(B | A) · P(A) ÷ [[pb|P(B)]]. Here: 0.9 × 0.01 ÷ 0.0585 ≈ 0.154.",
      derivation: "Count the overlap two ways. P(A and B) = P(A | B) · P(B), and it also equals P(B | A) · P(A). Set them equal and divide by P(B). That’s the whole theorem.",
      figure: true,
    },
    pb: {
      term: "P(B)", src: ["gen", "General explanation"], floor: true,
      meaning: "Here, the overall chance of a positive test across everyone: true positives plus [[falsepos|false positives]]. 9 + 49.5 = 58.5 out of 1,000, or 5.85%.",
    },
  };
  const linkify = (s) => esc(s).replace(/\[\[(\w+)\|([^\]]+)\]\]/g, (_, k, t) => `<button class="pull" data-k="${k}">${t}</button>`);

  /* ==================================================================
   * Seams: the page opens beneath the sentence.
   * ================================================================== */
  const page = $("#page"), pageBody = $("#pageBody"), depthLabel = $("#pageDepth");
  const chain = [];   // [{key, text, aim, note, noteOpen, el, btn}]
  let anchorSent = null, anchorBtn = null;
  const DEPTH_NAMES = ["surface", "one layer down", "two layers down", "three layers down", "four layers down", "five layers down", "six layers down"];

  function status() {
    const d = chain.length;
    depthLabel.textContent = `depth ${d} · ${DEPTH_NAMES[Math.min(d, 6)]}`;
    page.classList.toggle("diving", d > 0);
    $$(".sent.held", pageBody).forEach((s) => s.classList.remove("held"));
    if (d && anchorSent) anchorSent.classList.add("held");
    tilt(d ? Math.min(d * 5, 22) : 0);
  }

  function seamHTML(entry, level) {
    const idea = IDEAS[entry.key];
    const dots = Array.from({ length: Math.max(level, 3) }, (_, i) => `<i class="${i < level ? "on" : ""}"></i>`).join("");
    if (!idea) {
      return `<div class="seam-top"><span class="tag tag-gen">Preview limit</span><span class="seam-depth">${dots} depth ${level}</span></div>
        <h4>“${esc(entry.text.length > 64 ? entry.text.slice(0, 62) + "…" : entry.text)}”</h4>
        <p class="seam-text">In Medes, anything you select can be pulled, in your own books, at any depth. This preview only knows a few ideas, and it would rather tell you that than make something up. Try an underlined phrase.</p>
        <div class="seam-actions"><button class="surf" data-surf>↑ Surface</button></div><div class="seam-child"></div>`;
    }
    const lenses = LENSES.filter(([a]) => idea[a]);
    const lensbar = lenses.length > 1
      ? `<div class="lensbar" role="group" aria-label="Aim this explanation"><span class="lens-ink"></span>${lenses.map(([a, n]) =>
          `<button data-lens="${a}" aria-pressed="${a === entry.aim}">${n}</button>`).join("")}</div>` : "";
    return `<div class="seam-top"><span class="tag tag-${idea.src[0]}">${idea.src[1]}</span><span class="seam-depth">${dots} depth ${level}</span></div>
      <h4>${esc(idea.term)}</h4>
      ${lensbar}
      <div class="seam-main">${mainHTML(idea, entry.aim)}</div>
      <div class="seam-actions">
        <button class="surf" data-surf>↑ Surface</button>
        ${idea.figure ? '<button class="goex" data-fig>See it as a living figure ↓</button>' : ""}
        <button class="notebtn" data-note>${entry.noteOpen ? "Hide note" : "Keep a note"}</button>
      </div>
      ${entry.noteOpen ? `<textarea class="note" rows="2" placeholder="Stays with this layer while you explore">${esc(entry.note)}</textarea>` : ""}
      <div class="seam-child"></div>`;
  }
  const mainHTML = (idea, aim) =>
    `${idea.quote && aim === "meaning" ? `<p class="quote">“${esc(idea.quote)}”</p>` : ""}<p class="seam-text">${linkify(idea[aim])}</p>${idea.floor ? '<p class="floorline">Solid ground. This one doesn’t go deeper.</p>' : ""}`;

  function placeInk(seamEl, animate) {
    const bar = $(".lensbar", seamEl); if (!bar) return;
    const on = $("button[aria-pressed=true]", bar), ink = $(".lens-ink", bar);
    if (!animate) ink.style.transition = "none";
    ink.style.left = on.offsetLeft + "px"; ink.style.width = on.offsetWidth + "px"; ink.style.top = on.offsetTop + "px";
    if (!animate) { void ink.offsetWidth; ink.style.transition = ""; }
  }

  function openSeam({ level, key, text, btn, place }) {
    closeFrom(level, true);
    const entry = { key, text, aim: "meaning", note: "", noteOpen: false, btn };
    const el = document.createElement("div");
    el.className = "seam"; el.dataset.level = level;
    el.innerHTML = `<div class="seam-clip"><div class="seam-body">${seamHTML(entry, level)}</div></div>`;
    entry.el = el;
    place(el);
    chain[level - 1] = entry; chain.length = level;
    if (btn) btn.classList.add("open");
    placeInk(el, false);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("open")));
    status();
    // keep the new layer in view without moving the sentence you came from
    setTimeout(() => {
      const r = el.getBoundingClientRect();
      if (r.bottom > innerHeight - 20) scrollBy({ top: Math.min(r.bottom - innerHeight + 40, r.top - 90), behavior: smooth });
    }, 260);
  }

  function closeFrom(level, instant) {
    if (chain.length < level) return;
    const removed = chain.splice(level - 1);
    removed.forEach((e) => e.btn && e.btn.classList.remove("open"));
    const top = removed[0].el;
    if (instant && level > 1) { top.remove(); }
    else { top.classList.remove("open"); setTimeout(() => top.remove(), reduce ? 0 : 480); }
    status();
  }

  function surface() {
    if (!chain.length) return;
    closeFrom(1);
    const b = anchorBtn || (anchorSent && anchorSent);
    if (!b) return;
    const r = b.getBoundingClientRect();
    if (r.top < 80 || r.bottom > innerHeight) b.scrollIntoView({ behavior: smooth, block: "center" });
    if (anchorBtn) { anchorBtn.classList.remove("flash"); void anchorBtn.offsetWidth; anchorBtn.classList.add("flash"); anchorBtn.focus({ preventScroll: true }); }
  }

  function pullFrom(btn, key, text) {
    const parentSeam = btn ? btn.closest(".seam") : null;
    if (!parentSeam) {
      // surface pull: open beneath the sentence
      const sent = (btn || anchorSent).closest(".sent");
      if (btn && chain[0] && chain[0].btn === btn) { surface(); return; }
      if (chain.length) closeFrom(1, true);
      anchorSent = sent; anchorBtn = btn;
      openSeam({ level: 1, key, text, btn, place: (el) => sent.after(el) });
    } else {
      const level = +parentSeam.dataset.level + 1;
      if (chain[level - 1] && chain[level - 1].btn === btn) { closeFrom(level); return; }
      openSeam({ level, key, text, btn, place: (el) => $(".seam-child", parentSeam).appendChild(el) });
    }
  }

  page.addEventListener("click", (e) => {
    const p = e.target.closest(".pull");
    if (p && p.dataset.k) { pullFrom(p, p.dataset.k); return; }
    const seam = e.target.closest(".seam");
    if (!seam) return;
    const level = +seam.dataset.level, entry = chain[level - 1];
    if (e.target.closest("[data-surf]")) { surface(); return; }
    if (e.target.closest("[data-fig]")) { $("#figure").scrollIntoView({ behavior: smooth }); return; }
    if (e.target.closest("[data-note]")) {
      entry.noteOpen = !entry.noteOpen;
      const body = $(".seam-body", seam);
      const child = $(".seam-child", body); // preserve deeper layers
      const kids = [...child.childNodes];
      body.innerHTML = seamHTML(entry, level);
      $(".seam-child", body).append(...kids);
      placeInk(seam, false);
      if (entry.noteOpen) $(".note", body).focus();
      return;
    }
    const lens = e.target.closest("[data-lens]");
    if (lens && entry && lens.dataset.lens !== entry.aim) {
      entry.aim = lens.dataset.lens;
      closeFrom(level + 1);
      $$("[data-lens]", lens.parentElement).forEach((b) => b.setAttribute("aria-pressed", String(b === lens)));
      placeInk(seam, true);
      const main = $(".seam-main", seam);
      main.innerHTML = mainHTML(IDEAS[entry.key], entry.aim);
      $(".seam-text", main).classList.add("swap");
    }
  });
  page.addEventListener("input", (e) => {
    if (!e.target.matches(".note")) return;
    const seam = e.target.closest(".seam"); chain[+seam.dataset.level - 1].note = e.target.value;
  });
  addEventListener("resize", () => chain.forEach((c) => placeInk(c.el, false)));

  // Any selection can be pulled; the preview is honest about what it knows.
  const floatBtn = $("#pullFloat");
  let sel = null;
  document.addEventListener("selectionchange", () => {
    const s = getSelection(), t = s && s.toString().trim();
    if (!t || t.length < 2 || !page.contains(s.anchorNode) || !s.rangeCount) { floatBtn.hidden = true; return; }
    const host = s.anchorNode.parentElement;
    if (!host.closest(".sent, .seam-text")) { floatBtn.hidden = true; return; }
    const r = s.getRangeAt(0).getBoundingClientRect(), pr = page.getBoundingClientRect();
    floatBtn.style.left = Math.max(8, Math.min(r.left - pr.left + r.width / 2 - 30, pr.width - 90)) + "px";
    floatBtn.style.top = (r.bottom - pr.top + 8) + "px";
    floatBtn.hidden = false;
    sel = { text: t, host };
  });
  floatBtn.addEventListener("mousedown", (e) => e.preventDefault());
  floatBtn.addEventListener("click", () => {
    floatBtn.hidden = true;
    if (!sel) return;
    const known = Object.entries(IDEAS).find(([, v]) => v.term.toLowerCase() === sel.text.toLowerCase());
    const key = known ? known[0] : "__sel";
    const seam = sel.host.closest(".seam");
    if (seam) {
      const level = +seam.dataset.level + 1;
      openSeam({ level, key, text: sel.text, btn: null, place: (el) => $(".seam-child", seam).appendChild(el) });
    } else {
      const sent = sel.host.closest(".sent");
      if (chain.length) closeFrom(1, true);
      anchorSent = sent; anchorBtn = null;
      openSeam({ level: 1, key, text: sel.text, btn: null, place: (el) => sent.after(el) });
    }
    getSelection().removeAllRanges();
  });

  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && chain.length) {
      if (e.target.matches("input, textarea")) e.target.blur();
      chain.length === 1 ? surface() : closeFrom(chain.length);
    }
  });

  /* ==================================================================
   * Living figure: one case, three views.
   * ================================================================== */
  const N = 1000, SENS = 0.9, FPR = 0.05;
  const B = { base: 0.01, view: "crowd", hl: "all" };
  const fig = $("#bayes");
  const cv = (v, el = fig) => getComputedStyle(el).getPropertyValue(v).trim();
  const baseInput = $("#baseRate");
  const toSlider = (b) => (100 * Math.log(b / 0.001)) / Math.log(300);
  const fromSlider = (v) => 0.001 * Math.pow(300, v / 100);
  baseInput.value = toSlider(0.01);
  const fmt = (x) => (Math.round(x * 10) / 10).toLocaleString("en", { maximumFractionDigits: 1 });
  const pct = (x) => { const p = x * 100; return (p < 1 ? +p.toFixed(2) : +p.toFixed(1)) + "%"; };
  const counts = () => { const c = N * B.base, h = N - c; return { c, h, tp: c * SENS, fn: c * (1 - SENS), fp: h * FPR, tn: h * (1 - FPR) }; };
  const inGroup = (g, hl) => hl === "all" || (hl === "cond" ? g === "tp" || g === "fn" : g === "tp" || g === "fp");

  // --- crowd (canvas, spring physics, sleeps when settled)
  const canvas = $("#crowd"), ctx2 = canvas.getContext("2d");
  const dots = Array.from({ length: N }, () => ({ x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, r: 3, tr: 3, a: 1, ta: 1, g: "tn", d: 0 }));
  let W = 0, H = 0, raf = 0, tray = null, trayA = 0;

  function assign(k) {
    const tp = Math.round(k.tp), fn = Math.round(k.fn), fp = Math.round(k.fp);
    dots.forEach((d, i) => (d.g = i < tp ? "tp" : i < tp + fn ? "fn" : i < tp + fn + fp ? "fp" : "tn"));
  }
  function fit(idx, x, y, w, h) {
    const n = idx.length; if (!n) return 0;
    const cols = Math.max(1, Math.ceil(Math.sqrt((n * w) / h))), rows = Math.ceil(n / cols);
    const s = Math.min(w / cols, h / rows), ox = x + (w - cols * s) / 2, oy = y + (h - rows * s) / 2;
    const r = Math.max(1.6, Math.min(s * 0.34, 7));
    idx.forEach((i, k) => { const d = dots[i]; d.tx = ox + (k % cols + 0.5) * s; d.ty = oy + (Math.floor(k / cols) + 0.5) * s; d.tr = r; });
    return s;
  }
  function layout(snap) {
    const k = counts();
    const all = dots.map((_, i) => i);
    const S = all.filter((i) => inGroup(dots[i].g, B.hl) && B.hl !== "all");
    const R = all.filter((i) => !S.includes(i));
    const narrow = W < 560;
    if (B.hl === "all") { fit(all, 4, 4, W - 8, H - 8); tray = null; }
    else if (narrow) {
      fit(R, 4, 4, W - 8, H * 0.56 - 8);
      tray = { x: 4, y: H * 0.58, w: W - 8, h: H * 0.42 - 4 };
      fit(S, tray.x + 10, tray.y + 30, tray.w - 20, tray.h - 58);
    } else {
      fit(R, 4, 4, W * 0.58 - 8, H - 8);
      tray = { x: W * 0.61, y: 4, w: W * 0.39 - 4, h: H - 8 };
      fit(S, tray.x + 14, tray.y + 40, tray.w - 28, tray.h - 84);
    }
    if (tray) {
      const posN = k.tp + k.fp;
      tray.top = B.hl === "pos" ? `Tests positive · ${fmt(posN)}` : `Has it · ${fmt(k.c)}`;
      tray.bot = B.hl === "pos" ? `${fmt(k.tp)} of them have it → ${pct(k.tp / posN)}` : `${fmt(k.tp)} of them test positive → 90%`;
    }
    dots.forEach((d, i) => {
      d.ta = B.hl === "all" || S.includes(i) ? 1 : 0.16;
      d.d = reduce || snap ? 0 : Math.floor(Math.random() * 14) + (S.includes(i) ? 0 : 6);
      if (snap) { d.x = d.tx; d.y = d.ty; d.r = d.tr; d.a = d.ta; d.vx = d.vy = 0; }
    });
    kick(snap);
  }
  function size() {
    const w = canvas.parentElement.clientWidth - (parseFloat(getComputedStyle(canvas.parentElement).paddingLeft) || 0) * 0;
    W = canvas.clientWidth || w; H = Math.round(Math.max(260, Math.min(W * 0.48, 420)));
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.height = H + "px";
    ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function draw() {
    const col = { tp: cv("--pull"), fn: cv("--pull"), fp: cv("--ink"), tn: cv("--muted") };
    ctx2.clearRect(0, 0, W, H);
    if (tray && trayA > 0.01) {
      ctx2.globalAlpha = trayA;
      ctx2.strokeStyle = cv("--pull"); ctx2.setLineDash([4, 5]); ctx2.lineWidth = 1;
      roundRect(tray.x, tray.y, tray.w, tray.h, 14); ctx2.stroke(); ctx2.setLineDash([]);
      ctx2.fillStyle = cv("--ink"); ctx2.font = "500 13px 'Instrument Sans', sans-serif"; ctx2.textBaseline = "top";
      ctx2.fillText(tray.top, tray.x + 14, tray.y + 12);
      ctx2.fillStyle = cv("--pull"); ctx2.font = "italic 18px 'Instrument Serif', serif"; ctx2.textBaseline = "bottom";
      ctx2.fillText(tray.bot, tray.x + 14, tray.y + tray.h - 10);
    }
    for (const d of dots) {
      ctx2.globalAlpha = d.a * (d.g === "tn" ? 0.42 : 1);
      ctx2.beginPath(); ctx2.arc(d.x, d.y, d.r, 0, 6.2832);
      if (d.g === "fn") { ctx2.strokeStyle = col.fn; ctx2.lineWidth = 1.4; ctx2.stroke(); }
      else { ctx2.fillStyle = col[d.g]; ctx2.fill(); }
    }
    ctx2.globalAlpha = 1;
  }
  function roundRect(x, y, w, h, r) { ctx2.beginPath(); ctx2.moveTo(x + r, y); ctx2.arcTo(x + w, y, x + w, y + h, r); ctx2.arcTo(x + w, y + h, x, y + h, r); ctx2.arcTo(x, y + h, x, y, r); ctx2.arcTo(x, y, x + w, y, r); ctx2.closePath(); }
  function step() {
    let moving = false;
    const tgtTray = tray ? 1 : 0; trayA += (tgtTray - trayA) * 0.12; if (Math.abs(tgtTray - trayA) > 0.01) moving = true;
    for (const d of dots) {
      if (d.d > 0) { d.d--; moving = true; continue; }
      d.vx = (d.vx + (d.tx - d.x) * 0.09) * 0.74; d.vy = (d.vy + (d.ty - d.y) * 0.09) * 0.74;
      d.x += d.vx; d.y += d.vy; d.r += (d.tr - d.r) * 0.2; d.a += (d.ta - d.a) * 0.14;
      if (Math.abs(d.tx - d.x) > 0.15 || Math.abs(d.ty - d.y) > 0.15 || Math.abs(d.ta - d.a) > 0.01) moving = true;
    }
    draw();
    raf = moving ? requestAnimationFrame(step) : 0;   // sleeps when still
  }
  function kick(snap) { if (snap) { trayA = tray ? 1 : 0; draw(); return; } if (!raf) raf = requestAnimationFrame(step); }

  // --- paths
  function drawTree(k) {
    const pullC = cv("--pull"), ink = cv("--ink"), mut = cv("--muted"), rule = cv("--rule");
    const hc = B.hl, on = (g) => inGroup(g, hc);
    const node = (x, y, title, val, sub, lit) =>
      `<g opacity="${lit ? 1 : 0.28}" style="transition:opacity .3s"><text x="${x}" y="${y}" font-family="Instrument Sans" font-size="12" fill="${mut}">${title}</text>
       <text x="${x}" y="${y + 25}" font-family="Instrument Serif" font-size="25" fill="${ink}">${val}</text>
       ${sub ? `<text x="${x}" y="${y + 42}" font-family="JetBrains Mono" font-size="10" fill="${mut}">${sub}</text>` : ""}</g>`;
    const line = (x1, y1, x2, y2, lit, hot) =>
      `<path d="M${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}" fill="none" stroke="${hot ? pullC : lit ? ink : rule}" stroke-width="${hot ? 2.4 : 1.2}" opacity="${lit ? 1 : 0.5}"/>`;
    $("#tree").innerHTML =
      line(92, 128, 196, 62, hc !== "pos" || on("tp"), hc === "cond") +
      line(92, 128, 196, 194, hc !== "cond", false) +
      line(300, 62, 400, 28, on("tp"), hc !== "all") +
      line(300, 62, 400, 96, on("fn"), hc === "cond") +
      line(300, 194, 400, 164, on("fp"), hc === "pos") +
      line(300, 194, 400, 230, on("tn"), false) +
      node(8, 112, "Everyone", fmt(N), "", true) +
      node(204, 46, "Has it", fmt(k.c), pct(B.base), true) +
      node(204, 178, "Doesn’t", fmt(k.h), pct(1 - B.base), hc !== "cond") +
      node(408, 12, "Has it · positive", fmt(k.tp), "90% of branch", on("tp")) +
      node(408, 80, "Has it · negative", fmt(k.fn), "10% of branch", on("fn")) +
      node(408, 148, "Doesn’t · positive", fmt(k.fp), "5% of branch", on("fp")) +
      node(408, 214, "Doesn’t · negative", fmt(k.tn), "", on("tn"));
  }
  // --- formula
  function drawFormula(k) {
    const post = k.tp / (k.tp + k.fp);
    $("#formula").innerHTML = `
      <div class="f-row ${B.hl === "pos" ? "on" : ""}"><span class="f-cap">What you want to know: count inside <b>everyone who tests positive</b></span>
        <span class="f-eq">P(has it | positive) = <span class="frac"><span>${fmt(k.tp)}</span><span>${fmt(k.tp)} + ${fmt(k.fp)}</span></span> ≈ <span class="big">${pct(post)}</span></span></div>
      <p class="same">Same ${fmt(k.tp)} people. Different denominators.</p>
      <div class="f-row ${B.hl === "cond" ? "on" : ""}"><span class="f-cap">What the test’s accuracy describes: count inside <b>everyone who has it</b></span>
        <span class="f-eq">P(positive | has it) = <span class="frac"><span>${fmt(k.tp)}</span><span>${fmt(k.c)}</span></span> = <span class="big">90%</span></span></div>
      <div class="f-gloss"><span>|  count inside the crowd on the right</span><span>P( )  a fraction of that crowd</span></div>`;
  }
  function refresh(snap) {
    const k = counts(), post = k.tp / (k.tp + k.fp);
    assign(k); layout(snap); drawTree(k); drawFormula(k);
    $("#baseOut").textContent = pct(B.base);
    const col = { tp: cv("--pull"), fp: cv("--ink"), tn: cv("--muted") };
    $("#legend").innerHTML = [
      [`background:${col.tp}`, "Has it · positive", k.tp], [`border:1.5px solid ${col.tp}`, "Has it · negative", k.fn],
      [`background:${col.fp}`, "Doesn’t · positive", k.fp], [`background:${col.tn};opacity:.45`, "Doesn’t · negative", k.tn],
    ].map(([st, n, v]) => `<li><span class="sw" style="${st}"></span>${n} <b>${fmt(v)}</b></li>`).join("");
    $("#narration").innerHTML = B.hl === "cond"
      ? `Of the <b>${fmt(k.c)}</b> people who have it, ${fmt(k.tp)} test positive. That’s 90%, a fact about the test.`
      : B.hl === "pos"
      ? `Of the <b>${fmt(k.tp + k.fp)}</b> people who test positive, only ${fmt(k.tp)} have it. That’s <b>${pct(post)}</b>, the number that matters to you.`
      : `Out of ${fmt(N)} people, ${fmt(k.tp + k.fp)} test positive. Only ${fmt(k.tp)} of them have the condition: <b>${pct(post)}</b>, not 90%.`;
  }

  $$("#bayes .lenses [data-view]").forEach((b) => b.addEventListener("click", () => {
    B.view = b.dataset.view;
    $$("#bayes .lenses button").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
    $$("#bayes .view").forEach((v) => (v.hidden = v.dataset.view !== B.view));
    if (B.view === "crowd") { size(); layout(true); }
  }));
  const setHL = (hl) => {
    B.hl = hl;
    $$("#hlSeg button").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.hl === hl)));
    refresh(false);
  };
  $$("#hlSeg button").forEach((b) => b.addEventListener("click", () => setHL(b.dataset.hl)));
  baseInput.addEventListener("input", () => { B.base = fromSlider(+baseInput.value); refresh(false); });
  $$("#tryBox .opts button").forEach((b) => b.addEventListener("click", () => {
    $$("#tryBox .opts button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    const k = counts();
    $("#tryFb").textContent = {
      pos: `Yes. Gather the ${fmt(k.tp + k.fp)} positives; ${fmt(k.tp)} of them have it. Watch them move.`,
      cond: `That gives ${fmt(k.tp)} ÷ ${fmt(k.c)} = 90%, which is P(positive | has it), the other direction. It’s the most common slip, and the reason this figure exists.`,
      all: `That gives ${fmt(k.tp)} ÷ 1,000: the chance of being sick and positive. The bar says count inside a crowd, not inside everyone.`,
    }[b.dataset.a];
    setHL(b.dataset.a);
  }));
  new ResizeObserver(() => { if (B.view === "crowd") { size(); layout(true); } }).observe(canvas.parentElement);

  /* ==================================================================
   * Held fixed: two blocks run for the same time.
   * ================================================================== */
  const P = { hold: "v", m: 2 };
  let physRaf = 0;
  function buildPhysics() {
    const s = $("#physics");
    const ink = cv("--ink", s), mut = cv("--muted", s), pullC = cv("--pull", s), rule = cv("--rule", s), deep = cv("--deep", s), sheet = cv("--sheet-solid", s);
    const m = P.m, v = P.hold === "v" ? 1 : 1 / m, ke = P.hold === "v" ? m : 1 / m;
    const row = (id, y, title, mass, speed, energy) => {
      const sz = 24 * Math.sqrt(mass);
      return `<text x="20" y="${y - 36}" font-family="Instrument Sans" font-size="12" fill="${mut}">${title}</text>
        <line x1="20" y1="${y + 20}" x2="330" y2="${y + 20}" stroke="${rule}"/>
        <g id="${id}" data-speed="${speed}">
          <rect x="24" y="${y + 20 - sz}" width="${sz}" height="${sz}" rx="5" fill="${ink}"/>
          <text x="${24 + sz / 2}" y="${y + 20 - sz / 2 + 4}" text-anchor="middle" font-family="JetBrains Mono" font-size="10" fill="${sheet}">${fmt(mass)}m</text>
          <line x1="${30 + sz}" y1="${y + 20 - sz / 2}" x2="${30 + sz + 70 * speed}" y2="${y + 20 - sz / 2}" stroke="${deep}" stroke-width="2.4" stroke-linecap="round"/>
          <path d="M${30 + sz + 70 * speed} ${y + 20 - sz / 2 - 5} l8 5 l-8 5z" fill="${deep}"/>
        </g>
        <text x="20" y="${y + 40}" font-family="JetBrains Mono" font-size="10" fill="${deep}">speed ${fmt(speed)}v</text>
        <text x="380" y="${y - 36}" font-family="Instrument Sans" font-size="12" fill="${mut}">kinetic energy</text>
        <rect x="380" y="${y - 8}" width="${Math.max(4, 44 * energy)}" height="26" rx="4" fill="${pullC}"/>
        <text x="${388 + 44 * energy}" y="${y + 11}" font-family="Instrument Serif" font-size="22" fill="${ink}">×${fmt(energy)}</text>`;
    };
    $("#track").innerHTML = row("blkA", 70, "Before", 1, 1, 1) + `<line x1="20" y1="118" x2="580" y2="118" stroke="${rule}" stroke-dasharray="3 6"/>` + row("blkB", 178, "After", m, v, ke);
    $("#massOut").textContent = "×" + fmt(m);
    $("#physFormula").innerHTML = P.hold === "v" ? `KE = ½ m v²<small>v doesn’t move, so energy follows mass.</small>` : `KE = p² ⁄ 2m<small>p doesn’t move, so energy goes as 1 ⁄ m.</small>`;
    $("#physNarr").innerHTML = P.hold === "v"
      ? `Mass ×${fmt(m)} at the same speed: energy goes <b>×${fmt(ke)}</b>.`
      : `Mass ×${fmt(m)} with the same momentum: speed drops to ${fmt(v)}v, and energy goes <b>×${fmt(ke)}</b>.`;
  }
  function runPhysics() {
    cancelAnimationFrame(physRaf);
    const A = $("#blkA"), Bk = $("#blkB"); if (!A) return;
    const dist = 170, dur = 1300, t0 = performance.now();
    const go = (now) => {
      const t = reduce ? 1 : Math.min(1, (now - t0) / dur);
      A.setAttribute("transform", `translate(${dist * t * +A.dataset.speed} 0)`);
      Bk.setAttribute("transform", `translate(${dist * t * +Bk.dataset.speed} 0)`);
      if (t < 1) physRaf = requestAnimationFrame(go);
    };
    physRaf = requestAnimationFrame(go);
  }
  $$("#holdSeg button").forEach((b) => b.addEventListener("click", () => {
    P.hold = b.dataset.hold;
    $$("#holdSeg button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    buildPhysics(); runPhysics();
  }));
  const massIn = $("#mass");
  massIn.addEventListener("input", () => { P.m = +massIn.value; buildPhysics(); });
  massIn.addEventListener("change", runPhysics);
  new IntersectionObserver((es, o) => es.forEach((e) => { if (e.isIntersecting) { runPhysics(); o.disconnect(); } }), { threshold: 0.5 }).observe($("#track"));

  /* ==================================================================
   * Read in context
   * ================================================================== */
  const ctxCard = $("#ctx");
  $("#ctxBtn").addEventListener("click", () => {
    const open = ctxCard.classList.toggle("open");
    $("#ctxBtn").textContent = open ? "Show only the quoted line" : "Read in context";
    $("#ctxAsk").hidden = !open;
  });
  const REPLIES = {
    qualify: "Many readers land here. If the Courier only repeats Venn, “two independent accounts” is really one account told twice. Your reading is kept beside the passage.",
    speaker: "Worth holding onto. The fire is still Venn’s testimony, even when it appears under the Courier’s name. Your reading is kept beside the passage.",
    scope: "Fair. The fire itself may still be well attested. What narrows is the claim that the accounts are independent. Your reading is kept beside the passage.",
    stands: "Possible, if you have other reasons to trust the second account. Write them below; Medes brings them back if you change your mind.",
  };
  $$("#ctxOpts button").forEach((b) => b.addEventListener("click", () => {
    $$("#ctxOpts button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    $("#ctxReply").textContent = REPLIES[b.dataset.r];
  }));

  /* ==================================================================
   * Depth gauge + nav tone
   * ================================================================== */
  const nav = $(".nav"), gauge = $("#gauge"), strata = $$(".stratum"), descent = $(".descent");
  const links = Object.fromEntries($$("#gauge a").map((a) => [a.dataset.for, a]));
  let ticking = false;
  function onScroll() {
    ticking = false;
    nav.classList.toggle("scrolled", scrollY > 8);
    const mid = innerHeight * 0.5;
    let active = strata[0];
    for (const s of strata) if (s.getBoundingClientRect().top <= mid) active = s;
    Object.values(links).forEach((a) => a.classList.toggle("on", a.dataset.for === active.id));
    const darkAt = (y) => {
      const d = descent.getBoundingClientRect();
      if (y >= d.top && y <= d.bottom) return (y - d.top) / d.height > 0.45;
      return strata.some((s) => { const r = s.getBoundingClientRect(); return s.classList.contains("dark") && y >= r.top && y < r.bottom; }) || $(".foot").getBoundingClientRect().top < y;
    };
    const navDark = darkAt(30), gaugeDark = darkAt(mid);
    nav.classList.toggle("dark", navDark);
    gauge.classList.toggle("dark", gaugeDark);
    $('meta[name="theme-color"]').content = navDark ? "#0E1817" : "#F6F4EF";
  }
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  /* ==================================================================
   * The lever (and, for those who look, Archimedes)
   * ================================================================== */
  const beam = $("#lever .lever-beam");
  const tilt = (deg) => (beam.style.transform = `rotate(${deg}deg)`);
  let taps = 0, tapT, typed = "", eT;
  const eureka = () => {
    const el = $("#eureka"); el.hidden = false; tilt(-24);
    clearTimeout(eT); eT = setTimeout(() => { el.hidden = true; status(); }, 6500);
  };
  $("#lever").addEventListener("click", (e) => {
    e.preventDefault(); taps++; clearTimeout(tapT);
    if (taps >= 3) { taps = 0; eureka(); } else tapT = setTimeout(() => (taps = 0), 650);
  });
  addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea") || e.key.length !== 1) return;
    typed = (typed + e.key.toLowerCase()).slice(-6);
    if (typed === "eureka") eureka();
  });

  /* ------------------------------------------------------------------ */
  const start = () => { size(); refresh(true); buildPhysics(); onScroll(); };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(start);
})();
