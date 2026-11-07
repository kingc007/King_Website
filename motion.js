// Interaction motion layer: cursor, click bursts, letter choreography, magnetic
// buttons, pointer parallax and card tilt. Loaded after script.js and only
// observes it (class changes, DOM it already built) — it never calls into it.
(() => {
  const root = document.documentElement;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const menu = document.getElementById('menu');
  const panelWrap = document.getElementById('panel-wrap');

  // Damped spring (semi-implicit Euler). k = stiffness, c = damping.
  function spring(k, c) {
    return {
      x: 0, v: 0, t: 0,
      step(dt) {
        this.v += (-k * (this.x - this.t) - c * this.v) * dt;
        this.x += this.v * dt;
      },
      settled() { return Math.abs(this.v) < 0.02 && Math.abs(this.x - this.t) < 0.02; },
      snap(to) { this.x = this.t = to; this.v = 0; },
    };
  }

  const pointer = { x: innerWidth / 2, y: innerHeight / 2, seen: false };

  // ---------- Menu letters: indices for the CSS slam-in, hop on activation ----------

  document.querySelectorAll('#menu > .menu-item').forEach((item, ri) => {
    item.querySelectorAll('.ch').forEach((ch, ci) => {
      ch.style.setProperty('--ri', ri);
      ch.style.setProperty('--ci', ci);
      ch.style.setProperty('--cs', Math.random() < 0.5 ? -1 : 1);
    });
  });

  let revealedAt = 0;
  new MutationObserver(() => {
    if (menu.classList.contains('revealed')) revealedAt = performance.now();
  }).observe(menu, { attributes: true, attributeFilter: ['class'] });

  function hop(item) {
    item.querySelectorAll('.ch').forEach((ch, i) => {
      ch.animate([
        { translate: '0 0', rotate: '0deg', easing: 'cubic-bezier(0.2, 0.8, 0.4, 1)' },
        { translate: '0 -0.2em', rotate: `${i % 2 ? 6 : -6}deg`, offset: 0.4, easing: 'cubic-bezier(0.5, 0, 0.6, 1.6)' },
        { translate: '0 0', rotate: '0deg' },
      ], { duration: 340, delay: i * 20 });
    });
  }

  const hopItems = document.querySelectorAll('#menu .menu-item, #interests-menu .menu-item');
  const wasActive = new WeakMap();
  hopItems.forEach((it) => wasActive.set(it, it.classList.contains('is-active')));
  const hopWatch = new MutationObserver((records) => {
    records.forEach(({ target }) => {
      const on = target.classList.contains('is-active');
      if (on && !wasActive.get(target)) {
        const inMenu = target.parentElement === menu;
        const settling = performance.now() - revealedAt < 1000;
        if (!inMenu || (menu.classList.contains('revealed') && !settling)) hop(target);
      }
      wasActive.set(target, on);
    });
  });
  hopItems.forEach((it) => hopWatch.observe(it, { attributes: true, attributeFilter: ['class'] }));

  // ---------- Parallax depth per doodle ----------

  const depth = new WeakMap();
  const giveDepth = (el) => {
    if (!depth.has(el)) depth.set(el, 4 + Math.random() * 14);
  };
  // Every doodle on the page. Each one's offset is written straight to its own
  // translate and rotate, so nothing else restyles as the mouse moves, and a
  // doodle changing class (shown, hidden) wakes the frame loop.
  const doodles = new Set();
  const doodleWatch = new MutationObserver(() => wake());
  const addDoodle = (el) => {
    if (doodles.has(el)) return;
    giveDepth(el);
    doodles.add(el);
    doodleWatch.observe(el, { attributes: true, attributeFilter: ['class'] });
  };
  document.querySelectorAll('.menu-doodle, .web-doodle').forEach(addDoodle);

  const placed = new WeakMap();
  function placeDoodle(el, px, py, s) {
    const d = depth.get(el) || 8;
    const rx = s ? s.x.x : 0, ry = s ? s.y.x : 0;
    const t = `${(px * d + rx).toFixed(1)}px ${(py * d + ry).toFixed(1)}px`;
    const r = `${(rx * 0.5).toFixed(1)}deg`;
    const prev = placed.get(el);
    if (prev && prev.t === t && prev.r === r) return;
    el.style.translate = t;
    el.style.rotate = r;
    placed.set(el, { t, r });
  }

  const par = { x: spring(55, 13), y: spring(55, 13) };

  // ---------- Doodles scatter away from the cursor, spring back after ----------

  const REPEL_R = 130;
  const REPEL_PUSH = 70;
  const repel = new Map();

  function updateRepel(el, dt, r) {
    let s = repel.get(el);
    const visible = !!r;
    if (!s) {
      if (!visible || !pointer.seen) return;
      s = { x: spring(150, 11), y: spring(150, 11), wrote: false };
      repel.set(el, s);
    }
    s.x.t = 0; s.y.t = 0;
    if (visible && pointer.seen) {
      const dx = r.left + r.width / 2 - s.x.x - pointer.x;
      const dy = r.top + r.height / 2 - s.y.x - pointer.y;
      const d = Math.hypot(dx, dy);
      const reach = REPEL_R + r.width / 2;
      if (d < reach) {
        const f = 1 - d / reach;
        const ux = d > 0.5 ? dx / d : 1, uy = d > 0.5 ? dy / d : 0;
        s.x.t = ux * REPEL_PUSH * f * (2 - f);
        s.y.t = uy * REPEL_PUSH * f * (2 - f);
      }
    }
    s.x.step(dt); s.y.step(dt);
    // `wrote` here means the doodle is still moving away from or back to its spot.
    if (s.x.settled() && s.y.settled() && s.x.t === 0 && s.y.t === 0) {
      s.x.snap(0); s.y.snap(0);
      s.wrote = false;
      return;
    }
    s.wrote = true;
  }

  // ---------- Per-card rhythm: stagger order and out-of-phase idle sway ----------

  document.querySelectorAll('.web-board[data-web="music"] .web-pc:not(.web-center)').forEach((pc, i) => {
    pc.style.setProperty('--fx-i', i);
  });
  document.querySelectorAll('.web-board[data-web="music"] .web-pc, .confidant-card .cf-frame').forEach((el) => {
    el.style.setProperty('--fx-sway-dur', (3.8 + Math.random() * 2.4).toFixed(2) + 's');
    el.style.setProperty('--fx-sway-delay', (-Math.random() * 4).toFixed(2) + 's');
    el.style.setProperty('--fx-sway', (1 + Math.random() * 1.4).toFixed(2) + 'deg');
  });

  // ---------- Card tilt ----------

  const TILT_SEL = '.confidant-card';

  document.querySelectorAll('.confidant-card .cf-frame').forEach((f) => {
    const g = document.createElement('span');
    g.className = 'fx-glare';
    f.appendChild(g);
  });

  function tilt(card, x, y) {
    const r = card.getBoundingClientRect();
    if (!r.width) return;
    const px = Math.max(0, Math.min(1, (x - r.left) / r.width));
    const py = Math.max(0, Math.min(1, (y - r.top) / r.height));
    card.classList.add('fx-tilting');
    card.style.setProperty('--fx-ry', ((px - 0.5) * 22).toFixed(2) + 'deg');
    card.style.setProperty('--fx-rx', ((0.5 - py) * 16).toFixed(2) + 'deg');
    card.style.setProperty('--fx-gx', (px * 100).toFixed(1) + '%');
    card.style.setProperty('--fx-gy', (py * 100).toFixed(1) + '%');
  }

  function untilt(card) {
    card.classList.remove('fx-tilting');
    card.style.setProperty('--fx-ry', '0deg');
    card.style.setProperty('--fx-rx', '0deg');
  }

  let tiltCard = null;

  // ---------- Magnetic buttons ----------

  const MAGNET_SEL = ['.panel-close', '.take-heart', '.movie-close'];
  const magnets = MAGNET_SEL
    .map((s) => document.querySelector(s))
    .filter(Boolean)
    .map((el) => ({ el, x: spring(210, 12), y: spring(210, 12), wrote: false }));

  function updateMagnet(m) {
    const rects = m.el.getClientRects();
    if (!rects.length) { m.x.snap(0); m.y.snap(0); return; }
    const r = rects[0];
    // The rect already includes our own offset — take it back out.
    const cx = r.left + r.width / 2 - m.x.x;
    const cy = r.top + r.height / 2 - m.y.x;
    const dx = pointer.x - cx;
    const dy = pointer.y - cy;
    const reach = Math.max(r.width, r.height) / 2 + 70;
    const inside = pointer.seen && Math.hypot(dx, dy) < reach;
    const clamp = (v) => Math.max(-16, Math.min(16, v));
    m.x.t = inside ? clamp(dx * 0.32) : 0;
    m.y.t = inside ? clamp(dy * 0.32) : 0;
  }

  // ---------- Custom cursor ----------

  const ARROW = 'M2 2 L27 12.5 L16.5 15.6 L21.4 26.2 L16.8 28.3 L12 17.8 L4.6 25.4 Z';
  const cursor = document.createElement('div');
  cursor.className = 'fx-cursor is-hidden';
  cursor.setAttribute('aria-hidden', 'true');
  const layer = (cls) => `<div class="fx-cur ${cls}"><svg viewBox="0 0 30 30"><path d="${ARROW}"/></svg></div>`;
  cursor.innerHTML = layer('fx-cur--cyan') + layer('fx-cur--red') + layer('fx-cur--main');
  document.body.appendChild(cursor);
  const [curCyan, curRed, curMain] = cursor.querySelectorAll('.fx-cur');
  const trail = {
    red: { x: spring(520, 30), y: spring(520, 30) },
    cyan: { x: spring(240, 22), y: spring(240, 22) },
  };

  const LINK_SEL = 'a, button, [role="button"], .menu-item, .mm-station, .metro-prog, .reel-frame, .confidant-card, .bj-shoe, #start-gate';

  function classify(target) {
    if (!(target instanceof Element)) return;
    const link = target.closest(LINK_SEL);
    cursor.classList.toggle('is-link', !!link);
  }

  // ---------- Click impact burst ----------

  function starPath(points, rOut, rIn) {
    const a0 = Math.random() * Math.PI;
    let d = '';
    for (let i = 0; i < points * 2; i++) {
      const out = i % 2 === 0;
      const r = out ? rOut * (0.72 + Math.random() * 0.38) : rIn;
      const a = a0 + (i / (points * 2)) * Math.PI * 2;
      d += `${i ? 'L' : 'M'}${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)} `;
    }
    return d + 'Z';
  }

  let liveBursts = 0;
  function burst(x, y) {
    if (liveBursts > 6) return;
    liveBursts++;
    const b = document.createElement('div');
    b.className = 'fx-burst';
    b.style.left = x + 'px';
    b.style.top = y + 'px';
    b.innerHTML = `<svg viewBox="-46 -46 92 92">
      <path d="${starPath(9, 44, 15)}" fill="#0b0b0d"/>
      <path d="${starPath(9, 34, 12)}" fill="#e0233a" stroke="#f5f3ee" stroke-width="2" stroke-linejoin="miter"/>
      <path d="${starPath(6, 14, 6)}" fill="#f5f3ee"/></svg>`;
    const svg = b.firstElementChild;
    const spin = Math.random() * 40 - 20;
    // Easing lives on the keyframes: a pop that overshoots, then a slow fade.
    const anims = [svg.animate([
      { transform: `scale(0.15) rotate(${spin}deg)`, opacity: 1, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1.4)' },
      { transform: `scale(1) rotate(${spin + 10}deg)`, opacity: 1, offset: 0.35, easing: 'cubic-bezier(0.5, 0, 0.75, 0)' },
      { transform: `scale(1.18) rotate(${spin + 16}deg)`, opacity: 0 },
    ], { duration: 480 })];

    const n = 5;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'fx-shard' + (i % 2 ? ' fx-shard--red' : '');
      b.appendChild(s);
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.6;
      const dist = 46 + Math.random() * 34;
      const deg = (a * 180) / Math.PI + 90;
      anims.push(s.animate([
        { transform: `rotate(${deg}deg) translateY(-10px) scaleY(0.4)`, opacity: 1, easing: 'cubic-bezier(0.15, 0.85, 0.3, 1)' },
        { transform: `rotate(${deg}deg) translateY(${-dist}px) scaleY(1)`, opacity: 1, offset: 0.55, easing: 'ease-in' },
        { transform: `rotate(${deg}deg) translateY(${-dist - 12}px) scaleY(0.2)`, opacity: 0 },
      ], { duration: 480 }));
    }

    document.body.appendChild(b);
    Promise.all(anims.map((an) => an.finished)).finally(() => { b.remove(); liveBursts--; });
  }

  // ---------- Pointer wiring ----------

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    moved = true;
    wake();
    if (!pointer.seen) {
      pointer.seen = true;
      Object.values(trail).forEach((t) => { t.x.snap(e.clientX); t.y.snap(e.clientY); });
      root.classList.add('fx-has-cursor');
    }
    cursor.classList.remove('is-hidden');

    const card = e.target instanceof Element ? e.target.closest(TILT_SEL) : null;
    if (tiltCard && tiltCard !== card) untilt(tiltCard);
    tiltCard = card;
    if (card) tilt(card, e.clientX, e.clientY);
  }, { passive: true });

  document.addEventListener('pointerover', (e) => classify(e.target));
  document.documentElement.addEventListener('pointerleave', () => {
    cursor.classList.add('is-hidden');
    if (tiltCard) { untilt(tiltCard); tiltCard = null; }
  });

  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    cursor.classList.add('is-down');
    burst(e.clientX, e.clientY);
  });
  ['pointerup', 'pointercancel'].forEach((t) =>
    window.addEventListener(t, () => cursor.classList.remove('is-down')));
  window.addEventListener('blur', () => cursor.classList.remove('is-down'));

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || panelWrap.hidden) return;
    const key = document.querySelector('.panel-close .key');
    if (key) {
      key.animate([
        { transform: 'translate(0, 0) scale(1)', boxShadow: '4px 4px 0 var(--p5-red)' },
        { transform: 'translate(3px, 3px) scale(0.9)', boxShadow: '0 0 0 var(--p5-red)', offset: 0.35 },
        { transform: 'translate(0, 0) scale(1)', boxShadow: '4px 4px 0 var(--p5-red)' },
      ], { duration: 260 });
    }
  });

  // ---------- One frame loop for every spring ----------

  const place = (el, x, y) => { el.style.transform = `translate3d(${x}px, ${y}px, 0)`; };
  const menus = document.querySelectorAll('.menu');
  let parX = NaN, parY = NaN;
  let last = performance.now();
  let moved = false;
  let running = false;

  // The loop sleeps once every spring has settled and the mouse is still,
  // and wakes on the next move.
  function wake() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }
  const still = (sp) => sp.x.settled() && sp.y.settled();

  function frame(now) {
    const dt = Math.min(0.032, (now - last) / 1000);
    last = now;

    // Reads first: every layout measurement this frame happens before any write.
    const live = [];
    doodles.forEach((el) => {
      if (!el.isConnected) { doodles.delete(el); repel.delete(el); return; }
      if (el.classList.contains('shown') || repel.has(el)) live.push(el);
    });
    const rects = live.map((el) => (el.classList.contains('shown') && el.offsetParent !== null
      ? el.getBoundingClientRect() : null));
    magnets.forEach(updateMagnet);

    if (pointer.seen) {
      place(curMain, pointer.x, pointer.y);
      Object.values(trail).forEach((t) => { t.x.t = pointer.x; t.y.t = pointer.y; t.x.step(dt); t.y.step(dt); });
      place(curRed, trail.red.x.x, trail.red.y.x);
      place(curCyan, trail.cyan.x.x, trail.cyan.y.x);
    }

    par.x.t = pointer.seen ? (pointer.x / innerWidth - 0.5) * 2 : 0;
    par.y.t = pointer.seen ? (pointer.y / innerHeight - 0.5) * 2 : 0;
    par.x.step(dt);
    par.y.step(dt);
    const px = Math.round(par.x.x * 1000) / 1000;
    const py = Math.round(par.y.x * 1000) / 1000;
    if ((px !== parX || py !== parY) && panelWrap.hidden) {
      menus.forEach((el) => { el.style.translate = `${(px * -7).toFixed(1)}px ${(py * -5).toFixed(1)}px`; });
    }
    parX = px; parY = py;

    live.forEach((el, i) => {
      updateRepel(el, dt, rects[i]);
      placeDoodle(el, px, py, repel.get(el));
    });

    magnets.forEach((m) => {
      m.x.step(dt);
      m.y.step(dt);
      if (m.x.settled() && m.y.settled() && m.x.t === 0 && m.y.t === 0) {
        if (m.wrote) { m.el.style.translate = ''; m.wrote = false; }
        m.x.snap(0); m.y.snap(0);
        return;
      }
      m.el.style.translate = `${m.x.x.toFixed(2)}px ${m.y.x.toFixed(2)}px`;
      m.wrote = true;
    });

    const busy = moved || !still(par) || !still(trail.red) || !still(trail.cyan)
      || [...repel.values()].some((r) => r.wrote && !still(r))
      || magnets.some((m) => m.wrote && !still(m));
    moved = false;
    if (busy) requestAnimationFrame(frame);
    else running = false;
  }
  wake();

  // Doodles scattered later (or re-rendered) still get a depth.
  new MutationObserver((records) => {
    records.forEach((r) => r.addedNodes.forEach((n) => {
      if (n instanceof Element && n.matches('.web-doodle, .menu-doodle')) addDoodle(n);
    }));
  }).observe(document.body, { subtree: true, childList: true });
})();
