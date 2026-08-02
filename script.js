const menu = document.getElementById('menu');
const items = Array.from(menu.querySelectorAll('.menu-item'));
const panelWrap = document.getElementById('panel-wrap');
const panelClose = document.getElementById('panel-close');
const panels = Array.from(panelWrap.querySelectorAll('.panel'));

let current = 0;

function setActive(index) {
  const next = (index + items.length) % items.length;
  if (next !== current) playSwitchSfx();
  current = next;
  items.forEach((item, i) => item.classList.toggle('is-active', i === current));
}

const fadeBlack = document.getElementById('fade-black');

const SECTION_LOOP_START = {
  persona: 0.9,
  experience: 1.0,
  skills: 0.9,
  education: 0.9,
};

function sectionVideo(target) {
  return document.querySelector(`.panel[data-panel="${target}"] .section-video`);
}

function showPanel(target) {
  panels.forEach((p) => p.classList.toggle('is-shown', p.dataset.panel === target));
  panelWrap.hidden = false;
  const shown = panels.find((p) => p.dataset.panel === target);
  if (shown) fadeInScatterDoodles(shown);
}

function fadeInScatterDoodles(panel) {
  revealDoodles(panel.querySelectorAll(':scope > .web-doodle'));
}

function hideDoodlesNow(doodles) {
  doodles.forEach((d) => {
    if (d._revealTimers) d._revealTimers.forEach(clearTimeout);
    d._revealTimers = [];
    d.classList.remove('fx-spin', 'glimmering');
    d.style.transition = 'none';
    d.classList.remove('shown');
    void d.offsetWidth;
    d.style.transition = '';
  });
}

function revealDoodles(doodles) {
  const list = [...doodles];
  if (!list.length) return;
  hideDoodlesNow(list);
  for (let i = list.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [list[i], list[j]] = [list[j], list[i]];
  }
  const GROUP = 3;
  const STEP = 240;
  const FADE = 640;
  list.forEach((d, i) => {
    d.style.setProperty('--gdur', (3.8 + Math.random() * 2).toFixed(2) + 's');
    const delay = 60 + Math.floor(i / GROUP) * STEP;
    d._revealTimers.push(setTimeout(() => d.classList.add('shown'), delay));
    d._revealTimers.push(setTimeout(() => d.classList.add('glimmering'), delay + FADE));
  });
}

function openPanel(target) {

  const to = document.getElementById('transition-out');
  if (to) { to.classList.remove('is-playing'); to.pause(); }
  stopSidecar();
  if (target !== 'education') pauseEduClips();
  if (target in SECTION_LOOP_START) return openMediaPanel(target);
  showPanel(target);
}

const EDU_INTRO_START = 0.09;
const EDU_TAIL_START = 0.4;
function playEduClips() {
  document.querySelectorAll('[data-panel="education"] .edu-clip').forEach((v) => {
    v.loop = false;
    v.muted = false;
    v.volume = 1;
    v.onended = () => {
      v.muted = true;
      try { v.currentTime = EDU_TAIL_START; } catch (e) {}
      v.play().catch(() => {});
    };
    try { v.currentTime = EDU_INTRO_START; } catch (e) {}
    v.play().catch(() => {});
  });
}

function pauseEduClips() {
  document.querySelectorAll('[data-panel="education"] .edu-clip').forEach((v) => {
    v.onended = null;
    try { v.pause(); } catch (e) {}
  });
}

function openMediaPanel(target) {
  fadeBlack.style.transition = 'opacity 0.05s ease';
  fadeBlack.style.opacity = '1';
  setTimeout(() => {
    showPanel(target);
    const v = sectionVideo(target);
    if (v) { v.currentTime = 0; v.play().catch(() => {}); }
    if (target === 'education') playEduClips();
    if (target === 'persona' || target === 'experience') scheduleSectionItems(target, v);
    if (target === 'skills') openSub('music');
    setTimeout(() => {
      fadeBlack.style.transition = 'opacity 0.12s ease';
      fadeBlack.style.opacity = '0';
    }, 30);
  }, 55);
}

const personaTextSfx = new Audio('./assets/edutext_sfx.m4a');
personaTextSfx.preload = 'auto';
personaTextSfx.volume = 1;

const clickSfx = new Audio('./assets/clicksfx.m4a');
clickSfx.preload = 'auto';
clickSfx.volume = 1;
function playClickSfx() {
  try { clickSfx.currentTime = 0; clickSfx.play().catch(() => {}); } catch (e) {}
}

const escSfx = new Audio('./assets/escsfx.m4a');
escSfx.preload = 'auto';
escSfx.volume = 1;
function playEscSfx() {
  try { escSfx.currentTime = 0; escSfx.play().catch(() => {}); } catch (e) {}
}

const switchSfx = new Audio('./assets/switchsfx.m4a');
switchSfx.preload = 'auto';
switchSfx.volume = 1;
function playSwitchSfx() {
  try { switchSfx.currentTime = 0; switchSfx.play().catch(() => {}); } catch (e) {}
}

let sectionItemsTimer = null;
let sectionTickCleanup = null;
function scheduleSectionItems(target, v) {
  if (sectionTickCleanup) sectionTickCleanup();
  clearTimeout(sectionItemsTimer);

  const panel = document.querySelector(`.panel[data-panel="${target}"]`);
  if (panel) panel.classList.remove('items-in', 'cam-shake');
  resetSectionSlide(panel);

  const settleAt = 0.12;
  const onTick = () => { if (v && v.currentTime >= settleAt) fire(); };
  const cleanup = () => {
    if (v) v.removeEventListener('timeupdate', onTick);
    clearTimeout(sectionItemsTimer);
    sectionTickCleanup = null;
  };
  const fire = () => { cleanup(); revealSectionItems(target); };

  sectionTickCleanup = cleanup;
  if (v) v.addEventListener('timeupdate', onTick);

  sectionItemsTimer = setTimeout(fire, settleAt * 1000 + 500);
}

function resetSectionSlide(panel) {
  if (!panel) return;
  panel.querySelectorAll('.persona-text, .socials-card').forEach((el) => el.classList.remove('slide'));
}

function revealSectionItems(target) {
  if (shownPanel() !== target) return;
  const panel = document.querySelector(`.panel[data-panel="${target}"]`);
  if (target === 'persona') playPersonaText();
  else if (target === 'experience') playSocials();
  if (!panel) return;
  panel.classList.add('items-in');
  panel.classList.remove('cam-shake');
  void panel.offsetWidth;
  panel.classList.add('cam-shake');
  const onShakeEnd = (e) => {
    if (e.target !== panel) return;
    panel.classList.remove('cam-shake');
    panel.removeEventListener('animationend', onShakeEnd);
  };
  panel.addEventListener('animationend', onShakeEnd);
}

function playSocials() {
  const el = document.querySelector('[data-panel="experience"] .socials-card');
  if (el) {
    el.classList.remove('slide');
    void el.offsetWidth;
    el.classList.add('slide');
  }
  try { personaTextSfx.currentTime = EDU_INTRO_START; personaTextSfx.play().catch(() => {}); } catch (e) {}
}

function playPersonaText() {
  const el = document.querySelector('[data-panel="persona"] .persona-text');
  if (!el) return;

  el.querySelectorAll('.persona-text-vid').forEach((v) => {
    try { v.currentTime = 1.2; } catch (e) {}
    v.play().then(() => {
      setTimeout(() => { try { v.pause(); } catch (e) {} }, 250);
    }).catch(() => {});
  });
  el.classList.remove('slide');
  void el.offsetWidth;
  el.classList.add('slide');
  try { personaTextSfx.currentTime = EDU_INTRO_START; personaTextSfx.play().catch(() => {}); } catch (e) {}
}

const transitionOut = document.getElementById('transition-out');
let transitioning = false;

const sidecarAudio = new Audio();
sidecarAudio.preload = 'auto';
function stopSidecar() { try { sidecarAudio.pause(); sidecarAudio.currentTime = 0; } catch (e) {} }

const SECTION_TRANSITION_OUT = {

  persona: { clip: './assets/menu1cutout.mp4', swapAt: 1450, replayIntro: true },

  experience: { clip: './assets/menu2cutout.mp4', swapAt: 1500, replayIntro: true, audio: './assets/menu2loud.m4a' },

  skills: { clip: './assets/favoritescutout.mp4', swapAt: 500, replayIntro: false, chroma: true, darkenRed: true },

  education: { clip: './assets/menu4cutout.mp4', swapAt: 900, replayIntro: true, chroma: true, endAtSwap: true },
};

function shownPanel() {
  const p = panels.find((el) => el.classList.contains('is-shown'));
  return p ? p.dataset.panel : null;
}

function finishClose(replayIntro = true) {
  panelWrap.hidden = true;
  pauseEduClips();
  if (document.activeElement) document.activeElement.blur();
  fadeBlack.style.opacity = '0';

  const menuDoodles = document.querySelectorAll('.menu-doodle');
  hideDoodlesNow(menuDoodles);
  setTimeout(() => revealDoodles(menuDoodles), 700);
  if (replayIntro) {
    playIntro();
  } else {
    menu.classList.add('revealed');
  }
}

function closePanel() {
  if (panelWrap.hidden || transitioning) return;
  playEscSfx();

  pauseEduClips();
  const cur = shownPanel();

  const curVid = cur && sectionVideo(cur);
  if (curVid) { try { curVid.pause(); } catch (e) {} }
  const cfg = SECTION_TRANSITION_OUT[cur];

  if (cfg && transitionOut) {
    transitioning = true;
    transitionOut.classList.remove('is-playing');

    if (!transitionOut.currentSrc || !transitionOut.currentSrc.endsWith(cfg.clip.slice(1))) {
      transitionOut.src = cfg.clip;
    }
    transitionOut.classList.toggle('chroma', !!cfg.chroma);
    transitionOut.classList.toggle('darkred', !!cfg.darkenRed);
    transitionOut.currentTime = 0;

    stopSidecar();
    if (cfg.audio) {
      transitionOut.muted = true;
      sidecarAudio.src = cfg.audio;
      sidecarAudio.currentTime = 0;
      sidecarAudio.volume = 1;
      sidecarAudio.play().catch(() => {});
    } else {
      transitionOut.muted = false;
      transitionOut.volume = 1;
    }
    const end = () => {
      transitionOut.removeEventListener('ended', end);
      transitionOut.classList.remove('is-playing');
    };
    transitionOut.addEventListener('ended', end);

    const reveal = () => transitionOut.classList.add('is-playing');
    const onReady = () => {
      if ('requestVideoFrameCallback' in transitionOut) {
        transitionOut.requestVideoFrameCallback(() => reveal());
      } else {
        requestAnimationFrame(reveal);
      }
    };
    const p = transitionOut.play();
    if (p && p.then) p.then(onReady).catch(reveal); else onReady();
    setTimeout(() => {
      finishClose(cfg.replayIntro);

      if (cfg.endAtSwap) {
        transitionOut.classList.remove('is-playing');
      }
      transitioning = false;
    }, cfg.swapAt);
    return;
  }
  finishClose();
}

Object.keys(SECTION_LOOP_START).forEach((target) => {
  const v = sectionVideo(target);
  if (!v) return;
  v.addEventListener('ended', () => {
    v.currentTime = SECTION_LOOP_START[target];
    v.play().catch(() => {});
  });
});

items.forEach((item, i) => {
  item.addEventListener('mouseenter', () => setActive(i));
  item.addEventListener('click', (e) => {
    setActive(i);
    playClickSfx();

    if (!item.dataset.target) return;
    e.preventDefault();
    openPanel(item.dataset.target);
  });
});

panelClose.addEventListener('click', closePanel);

document.addEventListener('keydown', (e) => {
  if (!panelWrap.hidden) {

    if (e.key === 'Escape') {
      if (closeProjection()) { e.preventDefault(); return; }
      closePanel();
      return;
    }

    const movieBoard = document.querySelector('.web-board--movies');
    if (movieBoard && !movieBoard.hidden) {
      if (e.key === 'ArrowLeft' || e.key === 'a') { pageMovie(-1); e.preventDefault(); }
      else if (e.key === 'ArrowRight' || e.key === 'd') { pageMovie(1); e.preventDefault(); }
    }

    const hobbiesBoard = document.querySelector('.web-board[data-web="hobbies"]');
    if (hobbiesBoard && !hobbiesBoard.hidden) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { scrollHobbies(-1); e.preventDefault(); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { scrollHobbies(1); e.preventDefault(); }
      else if (e.key === 'Enter' || e.key === ' ') { revealHobbyCard(); e.preventDefault(); }
    }
    return;
  }
  switch (e.key) {
    case 'ArrowUp':
    case 'w':
      setActive(current - 1);
      e.preventDefault();
      break;
    case 'ArrowDown':
    case 's':
      setActive(current + 1);
      e.preventDefault();
      break;
    case 'Enter':
    case ' ': {
      playClickSfx();
      const it = items[current];

      if (!it.dataset.target) window.open(it.href, '_blank', 'noopener');
      else openPanel(it.dataset.target);
      e.preventDefault();
      break;
    }
  }
});

const LOOP_START = 1.2;
const IMPACT_TIME = 0.45;
const bgVideo = document.querySelector('.bg-video');

function revealMenu() {
  if (bgVideo && bgVideo.currentTime >= IMPACT_TIME) menu.classList.add('revealed');
}

if (bgVideo) {
  bgVideo.removeAttribute('loop');
  bgVideo.addEventListener('ended', () => {
    bgVideo.currentTime = LOOP_START;
    bgVideo.play().catch(() => {});
  });
  bgVideo.addEventListener('timeupdate', revealMenu);
}

const introAudio = new Audio('./assets/introaudio.m4a');
introAudio.preload = 'auto';
let introAudioPlayed = false;
function playIntroAudio() {
  try {
    introAudio.currentTime = 0;
    const p = introAudio.play();
    if (p && p.then) p.then(() => { introAudioPlayed = true; }).catch(() => {});
  } catch (e) {}
}

function playIntro() {
  if (!bgVideo) return;
  menu.classList.remove('revealed');
  bgVideo.currentTime = 0;
  const p = bgVideo.play();
  if (p) p.catch(() => {});
  playIntroAudio();
}

function startIntroAudioSynced() {
  if (introAudioPlayed) return;
  playIntroAudio();
}
if (bgVideo) bgVideo.addEventListener('playing', startIntroAudioSynced, { once: true });
window.addEventListener('load', startIntroAudioSynced);

const RANSOM_FONTS = [
  "'Anton', sans-serif",
  "'Archivo Black', sans-serif",
  "'Passion One', sans-serif",
  "'Bungee', sans-serif",
  "'Rozha One', serif",
];

const RANSOM_COLORS = [
  'var(--p5-cyan)',
  'var(--p5-white)',
  'var(--p5-black)',
  'var(--p5-red)',
  'var(--p5-cyan)',
  'var(--p5-white)',
];

function ransomize(el) {
  const text = el.textContent;
  el.textContent = '';
  for (const char of text) {
    if (char === ' ') {
      el.appendChild(document.createTextNode(' '));
      continue;
    }
    const span = document.createElement('span');
    span.className = 'ch';
    span.textContent = char;
    const rot = (Math.random() * 16 - 8).toFixed(1);
    const dy = (Math.random() * 0.10 - 0.05).toFixed(3);
    const sc = (0.85 + Math.random() * 0.32).toFixed(2);
    span.style.fontFamily = RANSOM_FONTS[Math.floor(Math.random() * RANSOM_FONTS.length)];
    span.style.transform = `translateY(${dy}em) rotate(${rot}deg) scale(${sc})`;
    span.style.setProperty('--chc', RANSOM_COLORS[Math.floor(Math.random() * RANSOM_COLORS.length)]);
    el.appendChild(span);
  }
}

document.querySelectorAll('.menu-label').forEach(ransomize);

document.querySelectorAll('.start-gate-text .ch').forEach((ch) => {
  ch.style.fontSize = (0.92 + Math.random() * 0.28).toFixed(2) + 'em';
});

items.forEach((item) => {
  const jx = (Math.random() * 26 - 8).toFixed(0);
  const jr = (Math.random() * 6 - 3).toFixed(1);
  item.style.setProperty('--jx', `${jx}px`);
  item.style.setProperty('--jr', `${jr}deg`);
});

const subItems = Array.from(document.querySelectorAll('#interests-menu .menu-item'));
function openSub(name) {
  subItems.forEach((s) => s.classList.toggle('is-active', s.dataset.sub === name));
  if (name === 'hobbies') resetHobbies();
  document.querySelectorAll('[data-panel="skills"] .web-board').forEach((b) => {
    if (b.dataset.web === name) {
      b.hidden = false;
      b.classList.remove('drop', 'revealing');
      void b.offsetWidth;
      b.classList.add('drop', 'revealing');

      clearTimeout(b._revealTimer);
      b._revealTimer = setTimeout(() => b.classList.remove('revealing'), 1100);
      revealDoodles(b.querySelectorAll('.web-doodle'));
    } else {
      b.hidden = true;
      b.classList.remove('drop', 'revealing');
    }
  });

  if (name === 'movies') resetMovieReel();
  if (name === 'places') {
    const pb = document.querySelector('.web-board[data-web="places"]');
    const sc = pb && pb.querySelector('.metro-scroll');
    if (sc) sc.scrollLeft = 0;
    if (pb) pb.classList.remove('metro-scrolled');
    syncMetroProgress();
  }
}
subItems.forEach((item, i) => {

  const jx = (Math.random() * 44 - 32).toFixed(0);
  const jr = (Math.random() * 10 - 5).toFixed(1);
  const jsk = (Math.random() * 16 - 8).toFixed(1);
  item.style.setProperty('--jx', `${jx}px`);
  item.style.setProperty('--jr', `${jr}deg`);
  item.style.setProperty('--jsk', `${jsk}deg`);
  item.style.setProperty('--i', i);
  item.addEventListener('mouseenter', () => {
    if (!item.classList.contains('is-active')) playSwitchSfx();
  });
  item.addEventListener('click', (e) => {
    e.preventDefault();
    playClickSfx();
    openSub(item.dataset.sub);
  });
});

const takeHeart = document.getElementById('take-heart');

const startGate = document.getElementById('start-gate');
const startGateVideo = document.getElementById('start-gate-video');
const startGateSting = document.getElementById('start-gate-sting');
const STING_MID = 650;

const bgm = new Audio('./assets/Last%20Surprise%20-%20Lyn.mp3');
bgm.preload = 'auto';
bgm.loop = false;
const BGM_FULL_VOL = 0.55;
const BGM_LOW_VOL = 0.16;
bgm.volume = BGM_FULL_VOL;

let bgmFadeTimer = null;
let bgmFadeRaf = null;
function fadeBgmDown() {
  if (bgmFadeRaf) cancelAnimationFrame(bgmFadeRaf);
  const from = bgm.volume;
  const dur = 2500;
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / dur);
    bgm.volume = from + (BGM_LOW_VOL - from) * t;
    if (t < 1) bgmFadeRaf = requestAnimationFrame(step);
  };
  bgmFadeRaf = requestAnimationFrame(step);
}
function scheduleBgmFade() {
  if (bgmFadeTimer) clearTimeout(bgmFadeTimer);
  bgmFadeTimer = setTimeout(fadeBgmDown, 10000);
}
const maskBgm = new Audio('./assets/beneaththemask.mp3');
maskBgm.preload = 'auto';
maskBgm.loop = true;
maskBgm.volume = 0.5;

bgm.addEventListener('ended', () => {
  try { maskBgm.currentTime = 0; maskBgm.play().catch(() => {}); } catch (e) {}
});
let gateStarting = false;
let menuTransitioned = false;
let gateDismissed = false;

function beginMenuTransition() {
  if (menuTransitioned) return;
  menuTransitioned = true;
  startGate.classList.add('revealing');
  playIntro();
}

function finalizeGate() {
  if (gateDismissed) return;
  gateDismissed = true;
  beginMenuTransition();
  startGate.classList.add('gone');

  setTimeout(() => {
    revealDoodles(document.querySelectorAll('.menu-doodle'));
  }, 650);
  setTimeout(() => {
    startGate.hidden = true;
    if (startGateVideo) startGateVideo.pause();
    if (startGateSting) startGateSting.pause();
  }, 300);
}

const STING_BLACK = 1000;

function startGo() {
  if (gateStarting) return;
  gateStarting = true;
  startGate.classList.add('starting');
  try { bgm.currentTime = 0; bgm.volume = BGM_FULL_VOL; bgm.play().catch(() => {}); scheduleBgmFade(); } catch (e) {}
  if (startGateSting) {
    startGateSting.currentTime = 0;
    startGateSting.muted = false;
    startGateSting.volume = 1;
    startGateSting.play().catch(() => {});
    startGateSting.addEventListener('ended', finalizeGate, { once: true });

    setTimeout(() => {
      startGateSting.style.transition = 'none';
      startGateSting.style.opacity = '0';
    }, STING_BLACK);
  }

  setTimeout(beginMenuTransition, STING_MID);
  setTimeout(finalizeGate, 3000);
}

function warmVideo(v) {
  if (!v) return;
  try {
    v.muted = true;
    const p = v.play();
    if (p && p.then) {
      p.then(() => {
        const settle = () => {
          if (gateStarting) return;
          try { v.pause(); v.currentTime = 0; } catch (e) {}
        };
        if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(settle);
        else setTimeout(settle, 60);
      }).catch(() => {});
    }
  } catch (e) {}
}

if (startGate && startGateVideo) {
  startGateVideo.play().catch(() => {});
  warmVideo(startGateSting);
  startGate.addEventListener('click', startGo);
}

document.querySelectorAll('.section-video').forEach(v => warmVideo(v));

window.addEventListener('load', () => {
  document.querySelectorAll('.web-board img').forEach((img) => {
    if (img.decode) img.decode().catch(() => {});
  });
});

const explosionFx = document.getElementById('explosion-fx');
let explosionBusy = false;
let explosionSafety = null;
function playExplosion() {

  if (!explosionFx || explosionBusy) return;
  explosionBusy = true;
  const wasMask = !maskBgm.paused;
  const wasBgm = !bgm.paused;
  try { maskBgm.pause(); } catch (e) {}
  try { bgm.pause(); } catch (e) {}
  explosionFx.classList.add('show');
  explosionFx.currentTime = 0;
  explosionFx.muted = false;
  explosionFx.volume = 1;
  explosionFx.play().catch(() => {});

  const finish = () => {
    if (!explosionBusy) return;
    explosionFx.removeEventListener('ended', finish);
    explosionFx.removeEventListener('error', finish);
    clearTimeout(explosionSafety);
    explosionFx.classList.remove('show');
    explosionBusy = false;

    if (wasMask) { maskBgm.play().catch(() => {}); }
    else if (wasBgm) { bgm.play().catch(() => {}); }
  };
  explosionFx.addEventListener('ended', finish, { once: true });
  explosionFx.addEventListener('error', finish, { once: true });
  const ms = (Number.isFinite(explosionFx.duration) ? explosionFx.duration * 1000 : 6000) + 1500;
  explosionSafety = setTimeout(finish, ms);
}
if (takeHeart && explosionFx) {
  takeHeart.addEventListener('click', playExplosion);
}

const GLITCH_BURSTS = [4.7, 14.7];
const GLITCH_POOL_SIZE = 6;
const glitchPool = [];
for (let i = 0; i < GLITCH_POOL_SIZE; i++) {
  const v = document.createElement('video');
  v.className = 'glitch-fx';
  v.muted = true; v.playsInline = true; v.preload = 'auto';
  v.src = './assets/glitch.mp4';
  document.body.appendChild(v);
  glitchPool.push(v);
}

function fireGlitch() {
  const v = glitchPool.find((x) => !x.classList.contains('show'));
  if (!v) return;
  const w = innerWidth * (0.1 + Math.random() * 0.22);
  const h = innerHeight * (0.06 + Math.random() * 0.16);
  v.style.left = Math.random() * (innerWidth - w) + 'px';
  v.style.top = Math.random() * (innerHeight - h) + 'px';
  v.style.width = w + 'px';
  v.style.height = h + 'px';
  v.muted = true;
  try { v.currentTime = GLITCH_BURSTS[(Math.random() * GLITCH_BURSTS.length) | 0]; } catch (e) {}
  v.classList.add('show');
  v.play().catch(() => {});
  setTimeout(() => { v.classList.remove('show'); try { v.pause(); } catch (e) {} }, 420 + Math.random() * 260);
}

let glitchTimer = null;
function glitchTick() {
  const open = !panelWrap.hidden && document.querySelector('.panel.is-shown');
  if (open) {
    const n = 1 + ((Math.random() * 3) | 0);
    for (let i = 0; i < n; i++) fireGlitch();
  }
  glitchTimer = setTimeout(glitchTick, 2000 + Math.random() * 3500);
}
glitchTimer = setTimeout(glitchTick, 2000 + Math.random() * 3500);

const DOODLE_SHAPES = {
  sparkle: (fill) => `<path d="M12 0.8 C12.5 8.6 15.4 11.5 23.2 12 C15.4 12.5 12.5 15.4 12 23.2 C11.5 15.4 8.6 12.5 0.8 12 C8.6 11.5 11.5 8.6 12 0.8 Z" fill="${fill}"/>`,
  star: (fill, edge) => `<path d="M12 1.5 L15 9.1 L22.9 9.4 L16.5 14.4 L18.9 22 L12 17.1 L5.1 22 L7.5 14.4 L1.1 9.4 L9 9.1 Z" fill="${fill}" stroke="${edge}" stroke-width="0.9" stroke-linejoin="round"/>`,
  moon: (fill, edge) => `<path d="M21 12.79 A 9 9 0 1 1 11.21 3 A 7 7 0 0 0 21 12.79 Z" fill="${fill}" stroke="${edge}" stroke-width="0.8" stroke-linejoin="round"/>`,
};
const DOODLE_KEYS = Object.keys(DOODLE_SHAPES);

const DOODLE_FILLS = [
  ['#d81f2a', '#f5f3ee'],
  ['#d81f2a', '#f5f3ee'],
  ['#f5f3ee', '#0d0d0d'],
  ['#f5f3ee', '#0d0d0d'],
  ['#0d0d0d', '#f5f3ee'],
];

const SECTION_DOODLES = {

  persona: {
    count: 6,
    zones: [
      [44, 49, 4, 39],
      [44, 49, 4, 39],
      [44, 49, 4, 39],
      [52, 70, 80, 94],
    ],
  },

  experience: {
    count: 12,
    zones: [[1, 13, 8, 90], [14, 44, 66, 94]],
  },

  education: {
    count: 13,
    spread: 7,
    zones: [
      [91, 97, 14, 88],
      [91, 97, 14, 88],
      [66, 84, 22, 32],
      [88, 97, 50, 61],
      [76, 87, 65, 76],
      [46, 57, 53, 57],
    ],
  },
};

function scatterDoodles(panel, cfg) {
  const placed = [];
  for (let n = 0; n < cfg.count; n++) {
    let x, y, tries = 0;
    do {
      const z = cfg.zones[(Math.random() * cfg.zones.length) | 0];
      x = z[0] + Math.random() * (z[1] - z[0]);
      y = z[2] + Math.random() * (z[3] - z[2]);
      tries++;
    } while (tries < 60 && placed.some((p) => Math.hypot(x - p[0], y - p[1]) < (cfg.spread || 5)));
    placed.push([x, y]);
    const key = DOODLE_KEYS[(Math.random() * DOODLE_KEYS.length) | 0];
    const [fill, edge] = DOODLE_FILLS[(Math.random() * DOODLE_FILLS.length) | 0];
    const w = (1.6 + Math.random() * 1.6).toFixed(2);
    const rot = (Math.random() * 50 - 25).toFixed(0);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'web-doodle');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = `left:${x.toFixed(2)}%;top:${y.toFixed(2)}%;width:${w}%;z-index:1;--rot:${rot}deg`;
    svg.innerHTML = DOODLE_SHAPES[key](fill, edge);
    panel.appendChild(svg);
  }
}
document.querySelectorAll('.panel--media').forEach((panel) => {
  const cfg = SECTION_DOODLES[panel.dataset.panel];
  if (!cfg) return;
  scatterDoodles(panel, cfg);
});

let boardFxTimer = null;
function boardFxTick() {
  const panel = !panelWrap.hidden ? document.querySelector('.panel.is-shown') : null;

  const pool = panel
    ? panel.querySelectorAll('.web-doodle')
    : (menu.classList.contains('revealed') ? document.querySelectorAll('.menu-doodle') : []);
  const cands = Array.from(pool).filter((el) => {
    if (el.classList.contains('fx-spin')) return false;
    if (el.offsetParent === null) return false;

    return el.classList.contains('glimmering');
  });
  if (cands.length) {
    const el = cands[(Math.random() * cands.length) | 0];
    el.classList.add('fx-spin');
    el.addEventListener('animationend', () => el.classList.remove('fx-spin'), { once: true });
  }
  boardFxTimer = setTimeout(boardFxTick, 3000 + Math.random() * 3000);
}
boardFxTimer = setTimeout(boardFxTick, 3000 + Math.random() * 3000);

function buildSpiderWeb(board) {
  const svg = board.querySelector('.web-strings');
  if (!svg) return;
  const NS = 'http://www.w3.org/2000/svg';
  const CX = 34, CY = 51;
  const SPOKES = 13;
  const RINGS = 5;
  const YSTRETCH = 1.35;

  const capAtY = (y) => {
    if (y <= 73) return 67;
    if (y >= 82) return 56;
    return 67 - (y - 73) * (11 / 9);
  };
  const rnd = (a, b) => a + Math.random() * (b - a);

  const addPath = (d, cls) => {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    if (cls) p.setAttribute('class', cls);
    svg.appendChild(p);
  };
  const pt = (angle, r) => {
    const y = CY + Math.sin(angle) * r * YSTRETCH;
    return [Math.min(CX + Math.cos(angle) * r, capAtY(y)), y];
  };

  const phase = rnd(0, Math.PI * 2), phase2 = rnd(0, Math.PI * 2);
  const REACH = 40;
  const reachAt = (a) =>
    REACH * (1 + 0.30 * Math.sin(a + phase) + 0.13 * Math.sin(2 * a + phase2)
             + 0.45 * Math.max(0, Math.cos(a)));

  const gaps = Array.from({ length: SPOKES }, () => rnd(0.6, 1.4));
  const gsum = gaps.reduce((s, g) => s + g, 0);
  const angles = [];
  let acc = rnd(0, Math.PI * 2);
  for (let i = 0; i < SPOKES; i++) { angles.push(acc); acc += (gaps[i] / gsum) * Math.PI * 2; }

  const outer = angles.map((a) => reachAt(a) * rnd(0.8, 1.06));
  const baseFrac = [0.17, 0.34, 0.54, 0.75, 0.99];
  const radii = angles.map((_, i) =>
    baseFrac.map((f) => outer[i] * (f + rnd(-0.05, 0.05))));
  const isMain = angles.map((_, i) => i % 3 === 0);

  for (let i = 0; i < SPOKES; i++) {
    const [x, y] = pt(angles[i], outer[i] * 1.06);
    addPath(`M ${CX} ${CY} L ${x.toFixed(2)} ${y.toFixed(2)}`,
      isMain[i] ? 'spoke spoke--main' : 'spoke');
  }

  for (let k = 0; k < RINGS; k++) {
    for (let i = 0; i < SPOKES; i++) {
      const j = (i + 1) % SPOKES;
      const [x1, y1] = pt(angles[i], radii[i][k]);
      const [x2, y2] = pt(angles[j], radii[j][k]);
      const sag = rnd(0.76, 0.92);
      const qx = CX + ((x1 + x2) / 2 - CX) * sag;
      const qy = CY + ((y1 + y2) / 2 - CY) * sag;
      addPath(`M ${x1.toFixed(2)} ${y1.toFixed(2)} Q ${qx.toFixed(2)} ${qy.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`, 'ring');
    }
  }

  board.querySelectorAll('.web-pc').forEach((img) => {
    const x = parseFloat(img.style.left), y = parseFloat(img.style.top);
    const hub = img.dataset.hub &&
      board.querySelector(`.web-pc[data-photo="${img.dataset.hub}"]`);
    const tx = hub ? parseFloat(hub.style.left) : CX;
    const ty = hub ? parseFloat(hub.style.top) : CY;
    const qx = (x + tx) / 2, qy = (y + ty) / 2 + 1.8;
    addPath(`M ${x} ${y} Q ${qx.toFixed(2)} ${qy.toFixed(2)} ${tx} ${ty}`, 'tie');
  });
}
document.querySelectorAll('.web-board[data-web="music"]').forEach(buildSpiderWeb);

const movieBoardEl = document.querySelector('.web-board--movies');
const movieCards = Array.from(document.querySelectorAll('.web-board--movies .movie-card'));
const movieClose = document.querySelector('.movie-close');
const movieProjector = document.querySelector('.movie-projector');
const movieScrim = document.querySelector('.movie-scrim');
const reelFrames = Array.from(document.querySelectorAll('.reel-frame'));
const reelScroll = document.querySelector('.reel-scroll');
let movieIndex = 0;

const REEL_FOCUS = 0.56;
function centreReelOn(i, smooth) {
  const frame = reelFrames[i];
  if (!reelScroll || !frame || !reelScroll.clientWidth) return;
  const off = reelEl ? Math.max(0, -reelEl.offsetLeft) : 0;
  const vis = reelScroll.clientWidth - off;
  const w = frame.offsetWidth;

  const centre = Math.max(off + vis * REEL_FOCUS, off + w / 2);
  const target = frame.offsetLeft + w / 2 - centre;
  const max = reelScroll.scrollWidth - reelScroll.clientWidth;
  reelScroll.scrollTo({
    left: Math.max(0, Math.min(max, target)),
    behavior: smooth ? 'smooth' : 'auto',
  });
}

function showMovie(i, slideFrom, scroll = 'smooth') {
  if (!movieCards.length) return;
  movieIndex = Math.max(0, Math.min(movieCards.length - 1, i));
  movieCards.forEach((img, n) => {
    img.classList.remove('slide-from-left', 'slide-from-right');
    img.classList.toggle('is-current', n === movieIndex);
    if (n === movieIndex && slideFrom) img.classList.add('slide-from-' + slideFrom);
  });
  reelFrames.forEach((f, n) => {
    const on = n === movieIndex;
    f.classList.toggle('is-current', on);
    f.setAttribute('aria-current', on ? 'true' : 'false');
  });
  if (scroll !== 'none') centreReelOn(movieIndex, scroll === 'smooth');
}

function projectMovie(i, slideFrom) {
  if (!movieProjector) return;
  showMovie(i, slideFrom);
  if (movieProjector.hidden) {
    movieProjector.hidden = false;
    movieProjector.classList.remove('is-open');
    void movieProjector.offsetWidth;
    movieProjector.classList.add('is-open');
    if (movieBoardEl) movieBoardEl.classList.add('is-projecting');
    if (movieClose) movieClose.focus({ preventScroll: true });
  }
}

function closeProjection(silent) {
  if (!movieProjector || movieProjector.hidden) return false;
  movieProjector.hidden = true;
  movieProjector.classList.remove('is-open');
  if (movieBoardEl) movieBoardEl.classList.remove('is-projecting');
  if (!silent) {
    playClickSfx();
    const frame = reelFrames[movieIndex];
    if (frame) frame.focus({ preventScroll: true });
  }
  return true;
}

function pageMovie(delta) {
  const target = movieIndex + delta;
  if (target < 0 || target >= movieCards.length) return;
  cancelReelCue();
  playSwitchSfx();
  const from = delta < 0 ? 'left' : 'right';
  if (movieProjector && !movieProjector.hidden) projectMovie(target, from);
  else showMovie(target, from);
}

let reelSettleTimer = null;

let reelRest = 0;
function resetMovieReel() {
  closeProjection(true);
  cancelReelCue();
  if (reelScroll) reelScroll.scrollLeft = 0;
  buildReelTail();
  showMovie(0, null, 'auto');
  reelRest = reelScroll ? reelScroll.scrollLeft : 0;
  if (movieBoardEl) movieBoardEl.classList.remove('reel-scrolled');
  cueReelIn();

  clearTimeout(reelSettleTimer);
  reelSettleTimer = setTimeout(() => {
    if (!movieBoardEl || movieBoardEl.hidden) return;
    buildReelTail();

    if (!movieBoardEl.classList.contains('reel-scrolled')) {
      centreReelOn(movieIndex, false);
      reelRest = reelScroll ? reelScroll.scrollLeft : 0;
    }
  }, 1700);
}

const REEL_CUE_FRAMES = 2.7;
const REEL_CUE_MS = 780;
let reelCueing = false, reelCueRaf = 0, reelCueTimer = 0;
function cancelReelCue() {
  cancelAnimationFrame(reelCueRaf);
  clearTimeout(reelCueTimer);
  reelCueRaf = reelCueTimer = 0;
  reelCueing = false;
}
function cueReelIn() {
  if (!reelScroll || !movieBoardEl || !reelFrames.length) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const max = reelScroll.scrollWidth - reelScroll.clientWidth;

  const stride = reelFrames.length > 1
    ? reelFrames[1].offsetLeft - reelFrames[0].offsetLeft
    : reelFrames[0].offsetWidth;
  const runway = Math.min(REEL_CUE_FRAMES * stride, max - reelRest);
  if (!(runway > 12)) return;
  const from = reelRest + runway;
  reelCueing = true;

  reelCueTimer = setTimeout(() => {
    reelCueTimer = 0;
    if (!reelCueing || movieBoardEl.hidden) return cancelReelCue();
    reelScroll.scrollLeft = from;
    const t0 = performance.now();
    const step = (t) => {
      if (!reelCueing) return;
      if (movieBoardEl.hidden) return cancelReelCue();
      const u = Math.min(1, (t - t0) / REEL_CUE_MS);
      const e = 1 - Math.pow(1 - u, 3);
      reelScroll.scrollLeft = from + (reelRest - from) * e;
      if (u < 1) reelCueRaf = requestAnimationFrame(step);
      else { cancelReelCue(); reelScroll.scrollLeft = reelRest; }
    };
    reelCueRaf = requestAnimationFrame(step);
  }, 200);
}

if (movieClose) movieClose.addEventListener('click', () => closeProjection());
if (movieScrim) movieScrim.addEventListener('click', () => closeProjection());
reelFrames.forEach((frame, n) => {

  frame.addEventListener('click', () => {
    if (reelScroll && reelScroll.dataset.dragged === '1') return;
    cancelReelCue();
    playClickSfx();
    projectMovie(n, n < movieIndex ? 'left' : 'right');
  });
  frame.addEventListener('pointerenter', () => {
    if (n !== movieIndex) playSwitchSfx();
  });
});

(function reelScrollSetup() {
  const scroller = reelScroll;
  if (!scroller || !movieBoardEl) return;
  const hideHint = () => movieBoardEl.classList.add('reel-scrolled');

  const wheelHost = movieBoardEl.closest('.panel') || movieBoardEl;
  wheelHost.addEventListener('wheel', (e) => {
    if (movieBoardEl.hidden) return;
    if (movieProjector && !movieProjector.hidden) return;
    const max = scroller.scrollWidth - scroller.clientWidth;
    if (max <= 1) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    const atStart = scroller.scrollLeft <= 0;
    const atEnd = scroller.scrollLeft >= max - 1;
    if ((delta < 0 && atStart) || (delta > 0 && atEnd)) return;
    e.preventDefault();
    cancelReelCue();
    scroller.scrollLeft += delta;
    hideHint();
  }, { passive: false });
  let down = false, startX = 0, startLeft = 0;
  scroller.addEventListener('pointerdown', (e) => {
    cancelReelCue();
    down = true; startX = e.clientX; startLeft = scroller.scrollLeft;
    scroller.dataset.dragged = '0';
    scroller.setPointerCapture(e.pointerId);
  });
  scroller.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 3) {
      scroller.classList.add('dragging');
      scroller.dataset.dragged = '1';
      hideHint();
    }
    scroller.scrollLeft = startLeft - dx;
  });
  const endDrag = (e) => {
    if (!down) return;
    down = false;
    scroller.classList.remove('dragging');
    try { scroller.releasePointerCapture(e.pointerId); } catch (_) {}

    setTimeout(() => { scroller.dataset.dragged = '0'; }, 0);
  };
  scroller.addEventListener('pointerup', endDrag);
  scroller.addEventListener('pointercancel', endDrag);
  scroller.addEventListener('scroll', () => {

    if (!reelCueing && Math.abs(scroller.scrollLeft - reelRest) > 8) hideHint();
    paintReelTail();
    paintReelDrift();
  }, { passive: true });
})();

const reelTailSvg = document.querySelector('.reel-tail');
const reelEl = document.querySelector('.movie-reel');
const reelFilmEl = document.querySelector('.reel-film');
const reelStageEl = document.querySelector('.movie-stage');
const reelSubMenu = document.querySelector('[data-panel="skills"] .sub-menu');
const reelArtVideo = document.querySelector('[data-panel="skills"] .section-video');
const reelHintEl = document.querySelector('.reel-hint');

const REEL_FIELD_PAD = 46;

const REEL_ART_EDGE = [
  [0.00, 0.790], [0.22, 0.748], [0.37, 0.702], [0.52, 0.718],
  [0.58, 0.700], [0.62, 0.596], [0.74, 0.563], [0.82, 0.560],
  [0.88, 0.600], [1.00, 0.680],
];
const REEL_ART_MARGIN = 0.028;

const REEL_STOP = 0.90;
const REEL_FLOOR = 0.66;

const REEL_MIN_FRAMES = 1.06;

function reelArtEdgeX(stageY, W, H) {
  const ar = reelArtVideo && reelArtVideo.videoHeight
    ? reelArtVideo.videoWidth / reelArtVideo.videoHeight : 16 / 9;
  const coverW = Math.max(W, H * ar);
  const coverH = Math.max(H, W / ar);
  const cy = Math.min(1, Math.max(0, (stageY + (coverH - H) / 2) / coverH));
  const T = REEL_ART_EDGE;
  let e = T[T.length - 1][1];
  for (let i = 1; i < T.length; i++) {
    if (cy <= T[i][0]) {
      const u = (cy - T[i - 1][0]) / (T[i][0] - T[i - 1][0] || 1);
      e = T[i - 1][1] + (T[i][1] - T[i - 1][1]) * u;
      break;
    }
  }
  return W / 2 + coverW * (e - REEL_ART_MARGIN - 0.5);
}

function reelFieldWidth(W, H, bandTop, bandBottom) {
  const labels = reelSubMenu && reelSubMenu.offsetWidth
    ? reelSubMenu.offsetLeft - REEL_FIELD_PAD : W * 0.55;
  let art = Infinity;
  for (let s = 0; s <= 6; s++) {
    art = Math.min(art, reelArtEdgeX(bandTop + ((bandBottom - bandTop) * s) / 6, W, H));
  }
  return Math.max(W * 0.26, Math.min(labels, art));
}

const TAIL_LAP = 0.26;

const TAIL_CURVE_SAFE = 0.86;

const TAIL_SLIVERS = 44;
const TAIL_SLIVER_LAP = 0.9;

const TAIL_EXIT_SCALE = 0.26;

const TAIL_HORIZON_MIN = 1.55;

const TAIL_CLEAR = 0.82;
const TAIL_MIN_SCALE = 0.03;
const TAIL_SAMPLES = 560;

const TAIL_HOLE_MIN = 0.19;

const TAIL_HAZE_IN = 0.38;
const TAIL_INK = [11, 11, 13];
const TAIL_FIELD_FALLBACK = [185, 0, 2];
let reelFieldInkRGB = null;

function reelFieldInk() {
  const v = reelArtVideo;
  if (!v || !v.videoWidth || v.readyState < 2 || v.currentTime < 1.5) {
    return reelFieldInkRGB || TAIL_FIELD_FALLBACK;
  }
  try {
    const c = document.createElement('canvas');
    c.width = 16; c.height = 9;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(v, 0, 0, 16, 9);
    const d = g.getImageData(2, 4, 1, 1).data;
    reelFieldInkRGB = [d[0], d[1], d[2]];
  } catch (e) {}
  return reelFieldInkRGB || TAIL_FIELD_FALLBACK;
}
let reelTail = null;

const reelEase = (u) => u * u * (3 - 2 * u);

function buildReelTail() {
  if (!reelTailSvg || !reelEl || !reelFilmEl || !reelStageEl || !reelScroll) return;
  const W = reelStageEl.clientWidth, H = reelStageEl.clientHeight;
  const filmH = reelFilmEl.offsetHeight;

  if (W < 320 || H < 240 || !filmH) return;

  const tf = getComputedStyle(reelEl).transform;
  const m = tf && tf !== 'none' ? new DOMMatrixReadOnly(tf) : new DOMMatrixReadOnly();
  const ja = Math.atan2(m.b, m.a);
  const js = Math.hypot(m.a, m.b) || 1;
  const half0 = (filmH / 2) * js;

  const bx = -Math.sin(ja), by = Math.cos(ja);

  const winY = reelEl.offsetTop + reelEl.offsetHeight / 2;
  const field = reelFieldWidth(W, H, winY - filmH * 0.75, winY + filmH * 0.75);

  const lap = filmH * TAIL_LAP * js;

  const frameW = reelFrames[0] ? reelFrames[0].offsetWidth : filmH;
  const keep = Math.min(field * REEL_STOP,
    Math.max(field * REEL_FLOOR, frameW * REEL_MIN_FRAMES + reelEl.offsetLeft));

  const walk = (jx, jy, sEnd, n) => {
    const px = new Float64Array(n), py = new Float64Array(n);
    const ds = (sEnd + lap) / (n - 1);
    const cx = Math.cos(ja), cy = Math.sin(ja);
    let x = jx - cx * lap, y = jy - cy * lap;
    for (let i = 0; i < n; i++) {
      px[i] = x; py[i] = y;
      x += cx * ds; y += cy * ds;
    }
    return { px, py, ds, n };
  };

  const placeJoin = (targetJx) => {
    let jx = 0, jy = 0;
    for (let pass = 0; pass < 2; pass++) {
      reelEl.style.right = `${Math.max(0, W - targetJx + (pass ? jx - targetJx : 0)).toFixed(1)}px`;
      const ow = reelEl.offsetWidth, oh = reelEl.offsetHeight;
      const e = m.transformPoint(new DOMPoint(ow / 2, 0));
      jx = reelEl.offsetLeft + ow / 2 + e.x;
      jy = reelEl.offsetTop + oh / 2 + e.y;
      if (Math.abs(jx - targetJx) < 0.5) break;
    }
    return { jx, jy };
  };

  const layout = (jx, jy) => {

    const probe = walk(jx, jy, Math.hypot(W, H) * 2.2, 320);
    let sExit = -lap + (probe.n - 1) * probe.ds;
    for (let i = 0; i < probe.n; i++) {
      const s = -lap + i * probe.ds;
      if (s <= 0) continue;
      if (probe.px[i] < 0 || probe.py[i] < 0 || probe.py[i] > H ||
          probe.px[i] > field) { sExit = s; break; }
    }
    const sEnd = sExit * 1.12;
    const N = TAIL_SAMPLES;
    const P = walk(jx, jy, sEnd, N);
    const { px, py, ds } = P;
    const iExit = Math.min(N - 1, Math.max(1, Math.round((sExit + lap) / ds)));

    const dExit = (px[iExit] - jx) * bx + (py[iExit] - jy) * by;
    const d0 = Math.max(-dExit / (1 - TAIL_EXIT_SCALE), half0 / TAIL_CLEAR,
                        TAIL_HORIZON_MIN * filmH * js);
    const sc = new Float64Array(N), hw = new Float64Array(N), film = new Float64Array(N);
    const abx = new Float64Array(N), aby = new Float64Array(N);
    for (let i = 0, held = 1; i < N; i++) {

      const s = ((px[i] - jx) * bx + (py[i] - jy) * by) / d0 + 1;
      held = Math.max(TAIL_MIN_SCALE, Math.min(held, s));
      sc[i] = held;
      hw[i] = half0 * held;

      abx[i] = bx; aby[i] = by;
    }

    for (let i = 1; i < N; i++) film[i] = film[i - 1] + (ds * 2) / (sc[i] + sc[i - 1]);
    return { N, px, py, sc, hw, abx, aby, film, ds, iExit,
             exX: px[iExit], exY: py[iExit],
             joinF: film[Math.min(N - 1, Math.round(lap / ds))] };
  };

  let lateral = half0 * Math.abs(Math.sin(ja));
  let jx = 0, jy = 0, T = null;
  for (let pass = 0; pass < 2; pass++) {
    const want = field - lateral;
    const capped = Math.min(field * REEL_STOP, want);
    const p = placeJoin(Math.max(keep, capped));
    jx = p.jx; jy = p.jy;
    T = layout(jx, jy);

    let over = 0;
    for (let i = 0; i < T.N; i++) {
      if (T.sc[i] < TAIL_EXIT_SCALE * 1.4) break;
      over = Math.max(over, Math.abs(T.abx[i]) * T.hw[i]);
    }
    if (Math.abs(over - lateral) < 2) break;
    lateral = over;
  }
  const { N, px, py, sc, hw, abx, aby, film, ds } = T;

  reelScroll.style.setProperty('--reel-lap', `${(lap * 0.95).toFixed(1)}px`);

  const perfH = parseFloat(getComputedStyle(reelFilmEl, '::before').height);
  const u1 = perfH > 0 ? perfH / 0.85 : window.innerWidth / 100;
  const shotEl = reelFrames[0] && reelFrames[0].querySelector('.reel-shot');
  const shotTop = reelFrames[0] ? reelFrames[0].offsetTop : 1.95 * u1;
  const shotH = shotEl ? shotEl.offsetHeight : filmH - 2 * shotTop;
  reelTail = {
    N, px, py, sc, hw, abx, aby, film, len: film[N - 1], ds,

    joinF: T.joinF,
    holeW: 0.85 * u1 * js, holePitch: 2.3 * u1 * js, holeH: 0.85 * u1 * js,
    holeEdge: 0.5 * u1 * js,
    shotOuter: (filmH / 2 - shotTop) * js,
    shotInner: (filmH / 2 - shotTop - shotH) * js,
    part: null,
  };

  reelTailSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  reelTailSvg.textContent = '';
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, cls, parent) => {
    const el = document.createElementNS(NS, tag);
    if (cls) el.setAttribute('class', cls);
    parent.appendChild(el);
    return el;
  };

  const defs = mk('defs', null, reelTailSvg);
  const ink = reelFieldInk();

  const gx1 = jx, gy1 = jy, gx2 = T.exX, gy2 = T.exY;
  const stops = 9;
  const grad = (id, paint) => {
    const g = mk('linearGradient', null, defs);
    g.setAttribute('id', id);
    g.setAttribute('gradientUnits', 'userSpaceOnUse');
    g.setAttribute('x1', gx1.toFixed(1)); g.setAttribute('y1', gy1.toFixed(1));
    g.setAttribute('x2', gx2.toFixed(1)); g.setAttribute('y2', gy2.toFixed(1));
    for (let s = 0; s <= stops; s++) {
      const o = s / stops;

      const haze = Math.pow(Math.max(0, (o - TAIL_HAZE_IN) / (1 - TAIL_HAZE_IN)), 1.3);
      const st = mk('stop', null, g);
      st.setAttribute('offset', o.toFixed(3));
      paint(st, haze);
    }
    return `url(#${id})`;
  };
  const stockPaint = grad('reel-haze-stock', (st, h) => {
    st.setAttribute('stop-color', `rgb(${TAIL_INK.map((v, i) => Math.round(v + (ink[i] - v) * h)).join(',')})`);
  });

  const inkPaint = grad('reel-haze-ink', (st, h) => {
    st.setAttribute('stop-color', '#f0ede4');
    st.setAttribute('stop-opacity', Math.pow(Math.max(0, 1 - h / 0.76), 1.2).toFixed(3));
  });

  const shotMaskPaint = grad('reel-haze-shot-g', (st, h) => {
    st.setAttribute('stop-color', '#fff');
    st.setAttribute('stop-opacity', Math.pow(Math.max(0, 1 - h / 0.52), 1.1).toFixed(3));
  });
  const shotMask = mk('mask', null, defs);
  shotMask.setAttribute('id', 'reel-haze-shot');
  shotMask.setAttribute('maskUnits', 'userSpaceOnUse');
  shotMask.setAttribute('x', '0'); shotMask.setAttribute('y', '0');
  shotMask.setAttribute('width', `${W}`); shotMask.setAttribute('height', `${H}`);
  const shotMaskRect = mk('rect', null, shotMask);
  shotMaskRect.setAttribute('x', '0'); shotMaskRect.setAttribute('y', '0');
  shotMaskRect.setAttribute('width', `${W}`); shotMaskRect.setAttribute('height', `${H}`);
  shotMaskRect.style.fill = shotMaskPaint;

  const EDGE_STEP = 6;
  const edgeOf = (i0, i1) => {
    let up = '', down = '';
    for (let i = i0; i <= i1; i += EDGE_STEP) {
      const j = Math.min(i, i1);
      up += `${i === i0 ? 'M' : 'L'}${(px[j] - abx[j] * hw[j]).toFixed(1)} ${(py[j] - aby[j] * hw[j]).toFixed(1)}`;
      down = `L${(px[j] + abx[j] * hw[j]).toFixed(1)} ${(py[j] + aby[j] * hw[j]).toFixed(1)}` + down;
    }
    if ((i1 - i0) % EDGE_STEP) {
      up += `L${(px[i1] - abx[i1] * hw[i1]).toFixed(1)} ${(py[i1] - aby[i1] * hw[i1]).toFixed(1)}`;
      down = `L${(px[i1] + abx[i1] * hw[i1]).toFixed(1)} ${(py[i1] + aby[i1] * hw[i1]).toFixed(1)}` + down;
    }
    return { fill: up + down + 'Z', edges: up + ' M' + down.slice(1) };
  };

  const piece = (i0, i1) => {
    const g = mk('g', null, reelTailSvg);
    const geo = edgeOf(i0, i1);
    const stock = mk('path', 'reel-tail-stock', g);
    stock.setAttribute('d', geo.fill);
    stock.style.fill = stockPaint;

    const shots = mk('g', 'reel-tail-shots', g);
    shots.setAttribute('mask', 'url(#reel-haze-shot)');
    shots.setAttribute('clip-path', 'url(#reel-shot-clip)');
    const clip = mk('clipPath', null, defs);
    clip.setAttribute('id', 'reel-shot-clip');
    clip.setAttribute('clipPathUnits', 'userSpaceOnUse');
    reelTail.shotClip = mk('path', null, clip);
    reelTail.shots = reelFrames.map((frame) => {
      const box = frame.querySelector('.reel-shot');
      const img = box && box.querySelector('img');
      const SW = box ? box.offsetWidth : frame.offsetWidth;
      const SH = box ? box.offsetHeight : 1;
      const parts = [];
      for (let s = 0; s < TAIL_SLIVERS; s++) {
        const sx0 = (SW * s) / TAIL_SLIVERS, sw = SW / TAIL_SLIVERS;
        const cut = sw * (1 + TAIL_SLIVER_LAP);
        const holder = mk('g', null, shots);

        const sub = mk('svg', null, holder);
        sub.setAttribute('x', sx0.toFixed(2)); sub.setAttribute('y', '0');
        sub.setAttribute('width', cut.toFixed(2));
        sub.setAttribute('height', `${SH}`);
        sub.setAttribute('viewBox', `${sx0.toFixed(2)} 0 ${cut.toFixed(2)} ${SH}`);
        sub.setAttribute('preserveAspectRatio', 'none');
        const im = mk('image', null, sub);
        im.setAttribute('x', '0'); im.setAttribute('y', '0');
        im.setAttribute('width', `${SW}`); im.setAttribute('height', `${SH}`);

        im.setAttribute('preserveAspectRatio', 'xMidYMid slice');
        if (img) im.setAttribute('href', img.currentSrc || img.src);
        parts.push({ holder, sx0, sx1: sx0 + sw, shown: true });
      }
      return { frame, SH, parts };
    });
    const frames = mk('path', 'reel-tail-frame', g);
    frames.style.stroke = inkPaint;
    const holes = mk('path', 'reel-tail-hole', g);
    holes.style.fill = inkPaint;
    const rail = mk('path', 'reel-tail-rail', g);
    rail.style.fill = inkPaint;

    const edges = mk('path', 'reel-tail-edge', g);
    edges.setAttribute('d', geo.edges);
    edges.style.stroke = inkPaint;
    return { frames, holes, rail, d: '', h: '' };
  };
  reelTail.part = piece(0, N - 1);

  const railI = (() => { for (let i = 0; i < N; i++) if (sc[i] < TAIL_HOLE_MIN) return i; return -1; })();
  if (railI > 0) {
    const band = (sgn) => {
      const a = [], b = [];
      for (let i = railI; i < N; i += EDGE_STEP) {
        const j = Math.min(i, N - 1);
        const o1 = sgn * (hw[j] - reelTail.holeEdge * sc[j]);
        const o2 = sgn * (hw[j] - (reelTail.holeEdge + reelTail.holeH) * sc[j]);
        a.push(`${(px[j] - abx[j] * o1).toFixed(1)} ${(py[j] - aby[j] * o1).toFixed(1)}`);
        b.unshift(`${(px[j] - abx[j] * o2).toFixed(1)} ${(py[j] - aby[j] * o2).toFixed(1)}`);
      }
      return `M${a.join('L')}L${b.join('L')}Z`;
    };
    reelTail.part.rail.setAttribute('d', band(1) + band(-1));
  }

  if (reelHintEl) {
    const bw = reelHintEl.offsetWidth, bh = reelHintEl.offsetHeight;

    const winTop = (x) => jy + Math.tan(ja) * (x + bx * half0 - jx) - by * half0;

    const clear = (x, top) => {
      for (let i = 0; i < N; i++) {
        const ex = Math.abs(abx[i]) * hw[i], ey = Math.abs(aby[i]) * hw[i];
        if (px[i] + ex < x - 8 || px[i] - ex > x + bw + 8) continue;
        if (py[i] + ey < top - 8 || py[i] - ey > top + bh + 8) continue;
        return false;
      }
      return true;
    };

    const gap = Math.max(18, half0 * 0.34);
    const HINT_LEFT = 12;
    let hx = HINT_LEFT, top = 0;
    for (let x = Math.max(HINT_LEFT, jx * 0.60); x > HINT_LEFT; x -= 18) {
      const t = winTop(x + bw / 2) - bh - gap;
      if (t > 8 && clear(x, t)) { hx = x; top = t; break; }
    }

    if (!top) top = winTop(HINT_LEFT + bw / 2) - bh - gap;
    reelHintEl.style.left = `${hx.toFixed(0)}px`;
    reelHintEl.style.top = `${Math.max(8, top).toFixed(0)}px`;
  }
  buildReelDrift(W, H, ink, filmH, u1, js);
  paintReelTail();
}

const reelDriftSvg = document.querySelector('.reel-drift');

const DRIFT_RUN = 0.62;

const DRIFT_SLIDE = 0.26;

const DRIFT_STRIPS = [

  { x: -0.10, y: 0.905, a: -9, len: 0.84, w: 0.34, roll: 40, twist: 260, haze: 0.52,
    bends: [[0.10, 0.34, 36], [0.52, 0.36, -66], [0.86, 0.14, 34]] },

  { x: 0.235, y: -0.10, a: 112, len: 0.52, w: 0.19, roll: 0, twist: 320, haze: 0.72,
    bends: [[0.08, 0.36, 78], [0.50, 0.42, -104]] },

  { x: -0.07, y: 0.085, a: 16, len: 0.46, w: 0.13, roll: 65, twist: 350, haze: 0.83,
    bends: [[0.14, 0.40, -46], [0.62, 0.32, 66]] },

  { x: 0.50, y: 1.09, a: -76, len: 0.38, w: 0.24, roll: 20, twist: 230, haze: 0.60,
    bends: [[0.12, 0.44, -58], [0.66, 0.30, 44]] },

  { x: -0.07, y: 0.83, a: 29, len: 0.34, w: 0.17, roll: 80, twist: 300, haze: 0.70,
    bends: [[0.16, 0.46, 54], [0.70, 0.28, -70]] },

  { x: -0.12, y: 0.205, a: 4, len: 0.80, w: 0.27, roll: 55, twist: 240, haze: 0.56,
    bends: [[0.14, 0.30, 24], [0.48, 0.32, -46], [0.84, 0.14, 26]] },

  { x: 0.10, y: -0.08, a: 62, len: 0.44, w: 0.16, roll: 25, twist: 300, haze: 0.74,
    bends: [[0.10, 0.34, -54], [0.58, 0.34, 40]] },

  { x: 0.31, y: -0.06, a: 84, len: 0.30, w: 0.11, roll: 70, twist: 380, haze: 0.86,
    bends: [[0.14, 0.38, -96], [0.62, 0.32, 74]] },

  { x: 0.22, y: 1.07, a: -46, len: 0.42, w: 0.20, roll: 10, twist: 250, haze: 0.64,
    bends: [[0.14, 0.40, 44], [0.66, 0.28, -58]] },
];
let reelDrift = [];
function buildReelDrift(W, H, ink, filmH, u1, js) {
  if (!reelDriftSvg) return;
  reelDriftSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  reelDriftSvg.textContent = '';
  reelDrift = [];
  const NS = 'http://www.w3.org/2000/svg';
  const D = Math.hypot(W, H);

  const winY = reelEl.offsetTop + reelEl.offsetHeight / 2;
  const field = reelFieldWidth(W, H, winY - filmH * 0.75, winY + filmH * 0.75);
  const fade = `linear-gradient(90deg, #000 0 ${(field * 0.80).toFixed(0)}px,` +
               ` transparent ${(field * 1.0).toFixed(0)}px)`;
  reelDriftSvg.style.webkitMaskImage = fade;
  reelDriftSvg.style.maskImage = fade;

  const half = filmH / 2;
  const eIn = (0.5 * u1) / half, eH = (0.85 * u1) / half;
  const shotEl = reelFrames[0] && reelFrames[0].querySelector('.reel-shot');
  const shotTop = reelFrames[0] ? reelFrames[0].offsetTop : 1.95 * u1;
  const shotH = shotEl ? shotEl.offsetHeight : filmH - 2 * shotTop;
  const sOut = (half - shotTop) / half, sIn = (half - shotTop - shotH) / half;
  const frameW = reelFrames[0] ? reelFrames[0].offsetWidth : 16 * u1;
  const pitch = reelFrames[1] ? reelFrames[1].offsetLeft - reelFrames[0].offsetLeft : frameW * 1.06;
  const mixc = (a, b, t) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;

  DRIFT_STRIPS.forEach((sp) => {
    const n = 240;
    const len = sp.len * D;
    const ds = len / (n - 1);
    const a0 = (sp.a * Math.PI) / 180;
    const head = (u) => a0 + sp.bends.reduce((t, b) =>
      t + ((b[2] * Math.PI) / 180) * reelEase(Math.min(1, Math.max(0, (u - b[0]) / b[1]))), 0);
    const px = new Float64Array(n), py = new Float64Array(n), th = new Float64Array(n);
    let x = sp.x * W, y = sp.y * H;
    for (let i = 0; i < n; i++) {
      px[i] = x; py[i] = y; th[i] = head(i / (n - 1));
      const hm = head((i + 0.5) / (n - 1));
      x += Math.cos(hm) * ds; y += Math.sin(hm) * ds;
    }
    const hw = new Float64Array(n), ax = new Float64Array(n), ay = new Float64Array(n);
    const h0 = half * sp.w * js;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const roll = ((sp.roll + u * sp.twist) * Math.PI) / 180;

      const end = reelEase(Math.min(1, Math.min(u, 1 - u) / 0.11));
      let w = h0 * (0.3 + 0.7 * Math.abs(Math.cos(roll))) * end;

      const k = Math.abs(th[Math.min(n - 1, i + 1)] - th[Math.max(0, i - 1)]) / (2 * ds);
      if (k > 1e-6) w = Math.min(w, TAIL_CURVE_SAFE / k);
      hw[i] = w;
      ax[i] = -Math.sin(th[i]); ay[i] = Math.cos(th[i]);
    }

    const at = (f) => {
      const t = Math.min(n - 1.001, Math.max(0, f / ds));
      const i = Math.floor(t), u = t - i;
      const l = (a, b) => a + (b - a) * u;
      return { x: l(px[i], px[i + 1]), y: l(py[i], py[i + 1]),
               bx: l(ax[i], ax[i + 1]), by: l(ay[i], ay[i + 1]), hw: l(hw[i], hw[i + 1]) };
    };
    const band = (f0, f1, o1, o2, step) => {
      const a = [], b = [];
      const m = Math.max(1, Math.ceil((f1 - f0) / step));
      for (let s = 0; s <= m; s++) {
        const p = at(f0 + ((f1 - f0) * s) / m);
        a.push(`${(p.x - p.bx * p.hw * o1).toFixed(1)} ${(p.y - p.by * p.hw * o1).toFixed(1)}`);
        b.unshift(`${(p.x - p.bx * p.hw * o2).toFixed(1)} ${(p.y - p.by * p.hw * o2).toFixed(1)}`);
      }
      return `M${a.join('L')}L${b.join('L')}Z`;
    };
    let up = '', down = '';
    for (let i = 0; i < n; i += 3) {
      const j = Math.min(i, n - 1);
      up += `${i ? 'L' : 'M'}${(px[j] - ax[j] * hw[j]).toFixed(1)} ${(py[j] - ay[j] * hw[j]).toFixed(1)}`;
      down = `L${(px[j] + ax[j] * hw[j]).toFixed(1)} ${(py[j] + ay[j] * hw[j]).toFixed(1)}` + down;
    }

    const s = sp.w * js;
    const holeW = 0.85 * u1 * s, holePitch = 2.3 * u1 * s;
    const framePitch = pitch * s, frameLen = frameW * s;
    const strike = (off) => {
      let holes = '', frames = '';

      if (!(holePitch > 0.5) || !(framePitch > 0.5)) return { holes, frames };
      for (let k = Math.ceil(-off / holePitch); ; k++) {
        const f = k * holePitch + off;
        if (f + holeW >= len) break;
        holes += band(f, f + holeW, 1 - eIn, 1 - eIn - eH, 99) +
                 band(f, f + holeW, -(1 - eIn), -(1 - eIn - eH), 99);
      }
      for (let k = Math.ceil((-off - framePitch * 0.4) / framePitch); ; k++) {
        const f = (k + 0.4) * framePitch + off;
        if (f + frameLen >= len) break;
        if (f >= 0) frames += band(f, f + frameLen, sOut, sIn, 9 * s + 4);
      }
      return { holes, frames };
    };
    const g = document.createElementNS(NS, 'g');
    const put = (d, fill, stroke, sw) => {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      p.setAttribute('fill', fill);
      p.setAttribute('stroke', stroke || 'none');
      if (sw) p.setAttribute('stroke-width', sw.toFixed(2));
      g.appendChild(p);
      return p;
    };
    const stockC = mixc(TAIL_INK, ink, sp.haze);
    const inkC = mixc([240, 237, 228], ink, Math.min(0.9, sp.haze * 0.95));
    const first = strike(0);
    put(up + down + 'Z', stockC);
    const holesEl = put(first.holes, inkC);
    const framesEl = put(first.frames, 'none', inkC, Math.max(0.7, 1.5 * sp.w));
    put(up + ' M' + down.slice(1), 'none', inkC, Math.max(0.9, 2 * sp.w));
    reelDriftSvg.appendChild(g);

    reelDrift.push({ g, holesEl, framesEl, strike,
                     rate: DRIFT_RUN * s * (1 - sp.haze * 0.62),
                     head: a0 });
  });
  paintReelDrift();
}

function paintReelDrift() {
  if (!reelDrift.length || !reelScroll) return;
  const s = reelScroll.scrollLeft;
  reelDrift.forEach((d) => {
    const off = -s * d.rate;
    const p = d.strike(off);
    d.holesEl.setAttribute('d', p.holes);
    d.framesEl.setAttribute('d', p.frames);

    const slide = off * DRIFT_SLIDE;
    d.g.setAttribute('transform',
      `translate(${(Math.cos(d.head) * slide).toFixed(1)} ${(Math.sin(d.head) * slide).toFixed(1)})`);
  });
}

function reelTailAt(f) {
  const T = reelTail, film = T.film;
  let lo = 0, hi = T.N - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (film[mid] < f) lo = mid + 1; else hi = mid; }
  const i = Math.max(1, lo);
  const u = (f - film[i - 1]) / (film[i] - film[i - 1] || 1);
  const lerp = (a, b) => a + (b - a) * u;

  const ax = lerp(T.abx[i - 1], T.abx[i]), ay = lerp(T.aby[i - 1], T.aby[i]);
  const an = Math.hypot(ax, ay) || 1;
  return {
    i,
    x: lerp(T.px[i - 1], T.px[i]), y: lerp(T.py[i - 1], T.py[i]),
    hw: lerp(T.hw[i - 1], T.hw[i]), sc: lerp(T.sc[i - 1], T.sc[i]),
    bx: ax / an, by: ay / an,
  };
}

function reelTailBand(f0, f1, offOuter, offInner, step, close = true) {
  const a = [], b = [];
  const n = Math.max(1, Math.ceil((f1 - f0) / step));
  for (let s = 0; s <= n; s++) {
    const p = reelTailAt(f0 + ((f1 - f0) * s) / n);
    const o1 = offOuter(p), o2 = offInner(p);
    a.push(`${(p.x - p.bx * o1).toFixed(1)} ${(p.y - p.by * o1).toFixed(1)}`);
    b.unshift(`${(p.x - p.bx * o2).toFixed(1)} ${(p.y - p.by * o2).toFixed(1)}`);
  }
  return `M${a.join('L')}L${b.join('L')}${close ? 'Z' : ''}`;
}

function paintReelTail() {
  const T = reelTail;
  if (!T || !reelScroll) return;

  const S = reelScroll.scrollLeft + reelScroll.clientWidth - T.joinF;
  const part = T.part;
  let d = '', h = '';

  const inset = (p) => p.hw - T.holeEdge * p.sc;
  const inner = (p) => p.hw - (T.holeEdge + T.holeH) * p.sc;
  for (let k = Math.ceil(S / T.holePitch); ; k++) {
    const f0 = k * T.holePitch - S;
    if (f0 > T.len - T.holeW) break;
    const f1 = f0 + T.holeW;
    const A = reelTailAt(f0), B = reelTailAt(f1);
    if (A.sc < TAIL_HOLE_MIN) break;
    const quad = (sgn) => {
      const a1 = inset(A) * sgn, a2 = inner(A) * sgn, b1 = inset(B) * sgn, b2 = inner(B) * sgn;
      return `M${(A.x - A.bx * a1).toFixed(1)} ${(A.y - A.by * a1).toFixed(1)}` +
             `L${(B.x - B.bx * b1).toFixed(1)} ${(B.y - B.by * b1).toFixed(1)}` +
             `L${(B.x - B.bx * b2).toFixed(1)} ${(B.y - B.by * b2).toFixed(1)}` +
             `L${(A.x - A.bx * a2).toFixed(1)} ${(A.y - A.by * a2).toFixed(1)}Z`;
    };
    h += quad(1) + quad(-1);
  }

  reelFrames.forEach((frame) => {
    const f1 = Math.min(T.len, frame.offsetLeft + frame.offsetWidth - S);
    if (f1 <= 0) return;
    const f0 = Math.max(0, frame.offsetLeft - S);
    if (f1 - f0 < 1) return;

    d += reelTailBand(f0, f1, (p) => T.shotOuter * p.sc,
                      (p) => T.shotInner * p.sc, 14, f0 > 0);
  });

  (T.shots || []).forEach((sh) => {
    const base = sh.frame.offsetLeft - S;
    sh.parts.forEach((p) => {
      const fa = base + p.sx0, fb = base + p.sx1;

      const off = fb < -T.joinF || fa > T.len;
      if (off !== !p.shown) {
        p.shown = !off;
        p.holder.style.display = off ? 'none' : '';
      }
      if (off) return;
      const A = reelTailAt(fa), B = reelTailAt(fb);
      const atx = A.x - A.bx * T.shotOuter * A.sc, aty = A.y - A.by * T.shotOuter * A.sc;
      const btx = B.x - B.bx * T.shotOuter * B.sc, bty = B.y - B.by * T.shotOuter * B.sc;
      const w = p.sx1 - p.sx0;
      const ux = (btx - atx) / w, uy = (bty - aty) / w;

      const span = (T.shotOuter - T.shotInner) / sh.SH;
      const vx = (A.bx * A.sc + B.bx * B.sc) * 0.5 * span;
      const vy = (A.by * A.sc + B.by * B.sc) * 0.5 * span;
      p.holder.setAttribute('transform', `matrix(${ux.toFixed(4)} ${uy.toFixed(4)} ` +
        `${vx.toFixed(4)} ${vy.toFixed(4)} ${(atx - ux * p.sx0).toFixed(2)} ${(aty - uy * p.sx0).toFixed(2)})`);
    });
  });

  part.frames.setAttribute('d', d);
  part.holes.setAttribute('d', h);

  if (T.shotClip) T.shotClip.setAttribute('d', d);
}

if (window.ResizeObserver && reelStageEl && reelFilmEl) {
  let pending = 0;
  const ro = new ResizeObserver(() => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => { if (movieBoardEl && !movieBoardEl.hidden) buildReelTail(); });
  });
  ro.observe(reelStageEl);
  ro.observe(reelFilmEl);
}

const HOBBY_ICONS = {

  chips: '<circle cx="12" cy="12" r="9.4" fill="#e11d2a"/><path fill="none" stroke="#fff" stroke-width="2.7" stroke-linecap="round" d="M12 2.9v2.7M12 18.4v2.7M2.9 12h2.7M18.4 12h2.7M5.4 5.4l1.9 1.9M16.7 16.7l1.9 1.9M18.6 5.4l-1.9 1.9M7.3 16.7l-1.9 1.9"/><circle cx="12" cy="12" r="5.3" fill="#fff"/><path stroke="none" fill="#e11d2a" d="M12 14.6c-1.9-1.2-3.1-2.4-3.1-3.8 0-.94.75-1.55 1.55-1.55.64 0 1.14.35 1.55.85.41-.5.91-.85 1.55-.85.8 0 1.55.61 1.55 1.55 0 1.4-1.2 2.6-3.1 3.8z"/>',

  blackjack: '<rect x="5.6" y="2.9" width="12.8" height="18.2" rx="2" fill="#fff"/><path stroke="none" fill="#191512" d="M12 6.5c-.5 1.9-2.6 3.2-3.9 4.8-1.5 1.8-.9 4.2 1 4.2.85 0 1.5-.4 2-1-.1 1.25-.6 2.1-1.55 2.85h4.9c-.95-.75-1.45-1.6-1.55-2.85.5.6 1.15 1 2 1 1.9 0 2.5-2.4 1-4.2-1.3-1.6-3.4-2.9-3.9-4.8z"/><text x="7.9" y="7.3" font-family="Anton, sans-serif" font-size="3.7" fill="#e11d2a" stroke="none">A</text><text x="16.1" y="18.9" font-family="Anton, sans-serif" font-size="3.7" fill="#e11d2a" stroke="none" transform="rotate(180 16.1 17.6)">A</text>',

  cards: '<g transform="rotate(-23 12 22)"><rect x="7.7" y="6" width="8.6" height="12.2" rx="1.3" fill="#fff"/><path stroke="none" fill="#e11d2a" d="M9.5 12.43C6.84 10.6 6.84 8.45 8.64 8.45 9.29 8.45 9.5 9.31 9.5 9.7 9.5 9.31 9.71 8.45 10.36 8.45 12.16 8.45 12.16 10.6 9.5 12.43Z"/></g><g transform="rotate(23 12 22)"><rect x="7.7" y="6" width="8.6" height="12.2" rx="1.3" fill="#fff"/><path stroke="none" fill="#e11d2a" d="M14.5 8.26 16.84 10.4 14.5 12.55 12.16 10.4Z"/></g><rect x="7.7" y="6" width="8.6" height="12.2" rx="1.3" fill="#fff"/><path stroke="none" fill="#191512" d="M12 8.88C12 11.08 14.73 11.52 14.73 12.71 14.73 13.94 13.09 14.03 12.49 13.06 12.76 14.03 13.36 14.6 13.91 15.08L10.09 15.08C10.64 14.6 11.24 14.03 11.51 13.06 10.91 14.03 9.27 13.94 9.27 12.71 9.27 11.52 12 11.08 12 8.88Z"/>',

  tennis: '<circle cx="12" cy="12" r="9" fill="#c7e03a"/><path fill="none" stroke="#fff" stroke-width="1.7" d="M5.2 6.4a9 9 0 0 1 0 11.2"/><path fill="none" stroke="#fff" stroke-width="1.7" d="M18.8 6.4a9 9 0 0 0 0 11.2"/>',

  badminton: '<path fill="#fff" d="M12 15.6 6.2 5.2 12 6.7 17.8 5.2z"/><path fill="none" stroke="#191512" stroke-width="0.6" d="M12 15.6 7.8 6M12 15.6V6.7M12 15.6 16.2 6"/><path fill="#e11d2a" d="M9 14.4h6l-.72 3.05c-.29 1.22-1.1 1.95-2.28 1.95s-1.99-.73-2.28-1.95z"/>',

  golf: '<path stroke="none" fill="#3fae4a" d="M2.4 19.6c2.9-1.7 5.9-2.4 9.6-2.4s6.7.7 9.6 2.4c-2.9 1.4-5.9 2-9.6 2s-6.7-.6-9.6-2z"/><path fill="none" stroke="#191512" stroke-width="1.4" d="M7.8 18.6V4"/><path stroke="none" fill="#e11d2a" d="M7.8 4l7.2 2.1-7.2 2.1z"/><circle cx="16.2" cy="18" r="2.1" fill="#fff"/>',

  glove: '<path fill="#e11d2a" d="M8.2 5.6h3.2c3.3 0 5.9 2.5 5.9 5.7v1.1c0 2.55-2.05 4.6-4.6 4.6H9c-2.55 0-4.6-2.05-4.6-4.6A2.75 2.75 0 0 1 5.1 7.3a4.6 4.6 0 0 1 3.1-1.7z"/><path stroke="none" fill="#b3121d" d="M5.05 7.35a2.75 2.75 0 0 0 .05 5.3c-.5-1.8-.53-3.55-.1-5.3z"/><path fill="none" stroke="#fff" stroke-width="1.3" d="M7.5 10.7c2.1-.85 5.4-.85 7.8 0"/><rect x="8.5" y="16.2" width="8.4" height="3.9" rx="1.1" fill="#a5101a"/><path fill="none" stroke="#fff" stroke-width="0.9" d="M10.7 16.4v3.5M12.7 16.4v3.5M14.7 16.4v3.5"/>',

  zzz: '<path fill="#ffce4a" d="M19.9 14.1A8.5 8.5 0 1 1 9.7 3.7 6.8 6.8 0 0 0 19.9 14.1z"/><path fill="none" stroke="#2f7ff0" stroke-width="1.6" stroke-linejoin="round" d="M13.4 3.5h3.5l-3.5 3.7h3.5"/><path fill="none" stroke="#4ea1ff" stroke-width="1.3" stroke-linejoin="round" d="M17.9 8.5h2.7l-2.7 2.9h2.7"/>',

  eat: '<circle cx="12" cy="12.4" r="8.4" fill="#fff"/><circle cx="12" cy="12.4" r="5" fill="none" stroke="#2f7ff0" stroke-width="0.9"/><path stroke="#191512" stroke-width="0.6" fill="#b9c1c9" d="M8.6 6.2h.9v3.1h.4V6.2h.9v3.1h.4V6.2h.9v3.5c0 .8-.55 1.45-1.3 1.6v6.4h-1.2v-6.4c-.75-.15-1.3-.8-1.3-1.6z"/><path stroke="#191512" stroke-width="0.6" fill="#b9c1c9" d="M15.4 6.2c-1.05.4-1.75 1.9-1.75 3.7 0 1.45.7 2.35 1.75 2.6v6.3h1.15V6.2z"/>',

  pan: '<circle cx="10.3" cy="12.3" r="7.2" fill="#2b2b2b"/><circle cx="10.3" cy="12.3" r="4.9" fill="#3c3c3c" stroke="none"/><rect x="16.7" y="11.2" width="6.4" height="2.2" rx="1.1" fill="#e11d2a"/><path stroke="none" fill="#fff" d="M8 10.6c1.6-.7 3.4-.5 4.3.6.7.85.4 1.9-.2 2.7-.7.95-2 1.6-3.2 1.3-1.4-.35-2.2-1.6-2-2.9.12-.75.5-1.35 1.1-1.7z"/><circle cx="10.3" cy="12.3" r="1.7" fill="#ffce4a" stroke="none"/>',

  car: '<path fill="#e11d2a" d="M2.7 16.3v-2.1c0-.5.32-.95.8-1.13l2.05-.78 1.5-3.05c.34-.7 1.05-1.14 1.83-1.14h5.1c.62 0 1.22.26 1.64.72l2.35 2.6 1.72.64c.6.22 1 .8 1 1.45v2.62z"/><path fill="#8fdcf0" stroke="#191512" stroke-width="0.7" d="M7.4 9.5c.25-.5.66-.8 1.15-.8h2.35v3H6.4z"/><path fill="#8fdcf0" stroke="#191512" stroke-width="0.7" d="M11.8 8.7h1.9c.45 0 .87.18 1.16.5l1.7 1.9v.6h-4.66z"/><circle cx="7.4" cy="16.4" r="2.4" fill="#191512"/><circle cx="16.6" cy="16.4" r="2.4" fill="#191512"/><circle cx="7.4" cy="16.4" r=".95" fill="#d9d9d9" stroke="none"/><circle cx="16.6" cy="16.4" r=".95" fill="#d9d9d9" stroke="none"/><circle cx="20.8" cy="13.9" r=".85" fill="#ffd23f" stroke="none"/>',

  java: '<rect x="2.6" y="2.6" width="18.8" height="18.8" rx="4.4" fill="#122a3a"/><path fill="none" stroke="#f7a740" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M9.1 8.3 5.7 12l3.4 3.7M14.9 8.3 18.3 12l-3.4 3.7"/><path fill="none" stroke="#e11d2a" stroke-width="1.9" stroke-linecap="round" d="M13.3 7.4 10.7 16.6"/>',

  ps: '<rect x="2.6" y="2.6" width="18.8" height="18.8" rx="4.4" fill="#001d33"/><text x="12" y="16.4" text-anchor="middle" font-family="Anton, Arial, sans-serif" font-size="11" fill="#31a8ff" stroke="none">Ps</text>',
  pr: '<rect x="2.6" y="2.6" width="18.8" height="18.8" rx="4.4" fill="#2a0733"/><text x="12" y="16.4" text-anchor="middle" font-family="Anton, Arial, sans-serif" font-size="11" fill="#ea77ff" stroke="none">Pr</text>',
  resolve: '<rect x="2.6" y="2.6" width="18.8" height="18.8" rx="4.4" fill="#12151b"/><text x="12" y="15.4" text-anchor="middle" font-family="Anton, Arial, sans-serif" font-size="9.4" fill="#f5f3ee" stroke="none">DR</text><rect x="6" y="16.7" width="4" height="1.8" stroke="none" fill="#39c0c8"/><rect x="10" y="16.7" width="4" height="1.8" stroke="none" fill="#f2c94c"/><rect x="14" y="16.7" width="4" height="1.8" stroke="none" fill="#e11d2a"/>',
};

const MASK_KEYS = [
  'joker', 'skull', 'panther', 'mona',
  'queen', 'fox', 'crow', 'noir',
];

function hobMask(key, veil) {
  const k = MASK_KEYS.includes(key) ? key : 'joker';
  return `<img class="hob-mask hob-mask--${k}${veil ? ' hob-mask--veil' : ''}"
               src="./assets/masks/${k}.webp" alt="" draggable="false">`;
}

function lightHobMask(root, delay = 0) {
  if (!root) return;
  const masks = root.querySelectorAll('.hob-mask--veil');
  if (!masks.length) return;
  setTimeout(() => masks.forEach((m) => m.classList.add('is-lit')), delay);
}
function randomMaskKey() { return MASK_KEYS[(Math.random() * MASK_KEYS.length) | 0]; }

const HOBBY_ITEMS = [
  { name: 'Poker',           lv: 3,  icon: 'chips' },
  { name: 'Blackjack',       lv: 5,  icon: 'blackjack' },
  { name: 'Card Flourishing', lv: 6, icon: 'cards' },
  { name: 'Tennis',          lv: 2,  icon: 'tennis' },
  { name: 'Badminton',       lv: 6,  icon: 'badminton' },
  { name: 'Golf',            lv: 7,  icon: 'golf' },
  { name: 'Boxing',          lv: 5,  icon: 'glove' },
  { name: 'Sleeping',        lv: 10, icon: 'zzz',   top: true },
  { name: 'Eating',          lv: 8,  icon: 'eat' },
  { name: 'Cooking',         lv: 5,  icon: 'pan' },
  { name: 'Driving',         lv: 8,  icon: 'car' },
  { name: 'Photoshop',       lv: 4,  icon: 'ps' },
  { name: 'Premiere Pro',    lv: 6,  icon: 'pr' },
  { name: 'DaVinci Resolve', lv: 6,  icon: 'resolve' },
  { name: 'Java',            lv: 4,  icon: 'java' },
];

const HAND_MAX = 3;
const hobbiesFan = document.getElementById('hobbies-fan');
const hobbiesDeck = document.getElementById('hobbies-deck');
const hobbyCards = [];
let hobbyActive = -1;
let hobHand = [];
let hobDeck = [];

function hobIcon(key) {
  return `<svg class="hob-icon" viewBox="0 0 24 24" aria-hidden="true"><g class="hi-k">${HOBBY_ICONS[key] || ''}</g></svg>`;
}

function hobTier(lv) {
  if (lv >= 8) return 'Average';
  if (lv >= 4) return 'Decent';
  return 'Trash';
}

function hobCardHTML(it, maskKey) {
  const pip = `<span class="hob-pip"><span class="hob-rank">${it.lv}</span></span>`;
  let meter = '';
  for (let i = 1; i <= 10; i++) meter += `<i${i <= it.lv ? ' class="on"' : ''}></i>`;
  return `
    <span class="hob-lift">
      <span class="hob-flip">
        <span class="hob-side hob-face">
          ${pip}
          <span class="hob-art">${hobIcon(it.icon)}</span>
          <span class="hob-tag">${hobTier(it.lv)}</span>
          <span class="hob-name">${it.name}</span>
          <span class="hob-meter">${meter}</span>
          ${pip.replace('hob-pip', 'hob-pip hob-pip--br')}
        </span>
        <span class="hob-side hob-rear">
          ${hobMask(maskKey, true)}
          <!-- The invitation lives on the card itself, in faint ink under the
               mask: it can only be read while the card is face down, and turning
               the card is what takes it away. -->
          <span class="hob-cue">Click to reveal</span>
        </span>
      </span>
    </span>`;
}

function shuffleHobbies(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function renderHobHand() {
  if (!hobbiesFan) return;
  hobbiesFan.style.setProperty('--n', Math.max(hobHand.length, 1));
  hobbiesFan.innerHTML = hobHand.map((it, i) => `
    <button type="button" class="hob-card${it.top ? ' hob-card--top' : ''}"
            style="--i:${i}" tabindex="-1" aria-pressed="false"
            aria-label="Face-down card ${i + 1} of ${hobHand.length}. Reveal.">
      ${hobCardHTML(it, randomMaskKey())}
    </button>`).join('');
  hobbyCards.length = 0;
  hobbyCards.push(...hobbiesFan.querySelectorAll('.hob-card'));
  hobbyActive = -1;
}

const HOB_TURN_MS = 620;
const hobbiesBoardEl = document.querySelector('.web-board[data-web="hobbies"]');
function flipHobCard(i, on) {
  const card = hobbyCards[i];
  if (!card) return;
  const next = on === undefined ? !card.classList.contains('is-flipped') : !!on;
  if (next === card.classList.contains('is-flipped')) return;
  const it = hobHand[i];
  card.classList.toggle('is-flipped', next);
  card.setAttribute('aria-pressed', String(next));
  card.setAttribute('aria-label', next && it
    ? `${it.name}, level ${it.lv} of 10, ${hobTier(it.lv)}. Hide.`
    : `Face-down card ${i + 1} of ${hobbyCards.length}. Reveal.`);

  card.classList.remove('is-turning');
  void card.offsetWidth;
  card.classList.add('is-turning');
  clearTimeout(card._turnTimer);
  card._turnTimer = setTimeout(() => card.classList.remove('is-turning'), HOB_TURN_MS + 40);
}

function renderHobDeck() {
  if (!hobbiesDeck) return;
  const shown = Math.min(hobDeck.length, 7);
  let html = '';
  for (let k = 0; k < shown; k++) {
    html += `<span class="hob-back" style="--k:${k}">${hobMask(randomMaskKey())}</span>`;
  }
  html += hobDeck.length
    ? `<span class="hob-deck-tag">Deal</span>`
    : `<span class="hob-deck-tag hob-deck-tag--empty">Empty</span>`;
  hobbiesDeck.innerHTML = html;
  hobbiesDeck.classList.toggle('is-empty', hobDeck.length === 0);
}

function buildHobbies() {
  if (!hobbiesFan) return;
  const shuffled = shuffleHobbies(HOBBY_ITEMS);
  hobHand = shuffled.slice(0, HAND_MAX);
  hobDeck = shuffled.slice(HAND_MAX);
  renderHobDeck();
  renderHobHand();

  hobbyCards.forEach((c, i) => lightHobMask(c, 90 + i * 110));
}

const hobDealSpin = (i, n) => (i - (n - 1) / 2) * 7;
let hobDealing = false;
let hobFlyers = [];
const centreOf = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

function makeHobFlyer(w, h, cx, cy, maskKey, veil) {
  const fly = document.createElement('span');
  fly.className = 'hob-back hob-fly';
  fly.style.cssText = `--k:0;--rk:0deg;width:${w}px;height:${h}px;left:${cx - w / 2}px;top:${cy - h / 2}px;`;
  fly.innerHTML = `${hobMask(maskKey, veil)}`;
  document.body.appendChild(fly);
  hobFlyers.push(fly);
  return fly;
}
function clearHobFlyers() { hobFlyers.forEach((f) => f.remove()); hobFlyers = []; }

const HOB_GATHER_DUR = 240, HOB_GATHER_STEP = 44;
const HOB_DEAL_DUR = 360, HOB_DEAL_STEP = 66;
const HOB_EASE_IN = 'cubic-bezier(0.5, 0, 0.85, 0.4)';
const HOB_EASE_OUT = 'cubic-bezier(0.2, 0.72, 0.28, 1.04)';

let hobTurnDownTimer = null;
function reshuffleHobbies() {
  if (hobDealing || !hobbiesDeck || !hobbyCards.length) return;
  playSwitchSfx();
  const turned = hobbyCards.filter((c) => c.classList.contains('is-flipped')).length;
  if (!turned) { dealFreshHobbies(); return; }
  hobbyCards.forEach((card, i) => {
    if (card.classList.contains('is-flipped')) setTimeout(() => flipHobCard(i, false), i * 60);
  });

  hobDealing = true;
  clearTimeout(hobTurnDownTimer);
  hobTurnDownTimer = setTimeout(() => { hobDealing = false; dealFreshHobbies(); },
    (hobbyCards.length - 1) * 60 + HOB_TURN_MS * 0.6);
}

function dealFreshHobbies() {
  if (hobDealing || !hobbiesDeck || !hobbyCards.length) return;

  if (hobbiesBoardEl && hobbiesBoardEl.hidden) return;
  hobDealing = true;
  setHobbyActive(-1);

  const deck = centreOf(hobbiesDeck.getBoundingClientRect());
  const w = hobbiesDeck.offsetWidth, h = hobbiesDeck.offsetHeight;

  const n = hobbyCards.length;
  hobbyCards.forEach((card, i) => {
    const c = centreOf(card.getBoundingClientRect());
    const fly = makeHobFlyer(w, h, c.x, c.y, randomMaskKey());
    fly.animate([
      { transform: `rotate(0deg) scale(1)`, opacity: 1 },
      { transform: `translate(${deck.x - c.x}px, ${deck.y - c.y}px) rotate(9deg) scale(0.7)`, opacity: 0.1 },
    ], { duration: HOB_GATHER_DUR, delay: (n - 1 - i) * HOB_GATHER_STEP, easing: HOB_EASE_IN, fill: 'forwards' });
  });
  hobbiesFan.style.opacity = '0';

  hobbiesDeck.animate([
    { transform: 'translateY(0) scale(1)' },
    { transform: 'translateY(3%) scale(0.95)', offset: 0.5 },
    { transform: 'translateY(0) scale(1)' },
  ], { duration: 260, delay: (n - 1) * HOB_GATHER_STEP, easing: 'ease-out' });

  const gatherDone = (n - 1) * HOB_GATHER_STEP + HOB_GATHER_DUR;
  setTimeout(() => {
    clearHobFlyers();

    const shuffled = shuffleHobbies(HOBBY_ITEMS);
    hobHand = shuffled.slice(0, HAND_MAX);
    hobDeck = shuffled.slice(HAND_MAX);
    renderHobDeck();
    renderHobHand();
    hobbiesFan.style.opacity = '';
    hobbyCards.forEach((c) => { c.style.visibility = 'hidden'; });

    const m = hobbyCards.length;
    hobbyCards.forEach((card, i) => {
      const t = centreOf(card.getBoundingClientRect());
      const fly = makeHobFlyer(w, h, deck.x, deck.y, randomMaskKey(), true);
      const dx = t.x - deck.x, dy = t.y - deck.y, spin = hobDealSpin(i, m);
      fly.animate([
        { transform: 'translate(0, 0) rotate(-10deg) rotateY(0deg) scale(0.86)' },

        { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 20}px) rotate(${spin}deg) rotateY(-180deg) scale(1.05)`, offset: 0.5 },

        { transform: `translate(${dx}px, ${dy}px) rotate(0deg) rotateY(-360deg) scale(1)` },
      ], { duration: HOB_DEAL_DUR, delay: i * HOB_DEAL_STEP, easing: HOB_EASE_OUT, fill: 'forwards' });

      setTimeout(() => {
        card.style.visibility = '';
        fly.remove();
        lightHobMask(card);
      }, i * HOB_DEAL_STEP + HOB_DEAL_DUR);
    });

    setTimeout(() => {
      hobbyCards.forEach((c) => { c.style.visibility = ''; lightHobMask(c); });
      clearHobFlyers();
      hobDealing = false;
    }, (m - 1) * HOB_DEAL_STEP + HOB_DEAL_DUR + 80);
  }, gatherDone);
}

function setHobbyActive(n) {
  hobbyActive = n;
  hobbyCards.forEach((card, i) => card.classList.toggle('is-active', i === n));
}

if (hobbiesFan) {
  hobbiesFan.addEventListener('pointerover', (e) => {
    const card = e.target.closest('.hob-card');
    if (card && !hobDealing) setHobbyActive(hobbyCards.indexOf(card));
  });
  hobbiesFan.addEventListener('pointerout', (e) => {
    if (!e.relatedTarget || !e.relatedTarget.closest('.hob-card')) setHobbyActive(-1);
  });
  hobbiesFan.addEventListener('click', (e) => {
    const card = e.target.closest('.hob-card');
    if (!card || hobDealing) return;
    playClickSfx();
    flipHobCard(hobbyCards.indexOf(card));
  });
}

function resetHobbies() {
  clearTimeout(hobTurnDownTimer);
  hobDealing = false;
  clearHobFlyers();
  if (hobbiesFan) hobbiesFan.style.opacity = '';
  buildHobbies();
}

function scrollHobbies(delta) {
  if (!hobbyCards.length) return;
  const start = hobbyActive < 0 ? Math.floor(hobbyCards.length / 2) - (delta > 0 ? 0 : 1) : hobbyActive + delta;
  setHobbyActive(Math.max(0, Math.min(hobbyCards.length - 1, start)));
}
function revealHobbyCard() {
  if (hobDealing) return;
  if (hobbyActive < 0) { scrollHobbies(1); return; }
  playClickSfx();
  flipHobCard(hobbyActive);
}
if (hobbiesDeck) {
  hobbiesDeck.addEventListener('click', reshuffleHobbies);
  hobbiesDeck.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); reshuffleHobbies(); }
  });
}

buildHobbies();

const CONFIDANTS = [
  { photo: 'people_07', num: '0',     arcana: 'The Fool',      rank: 10, x: 14, y: 29, rot: -6 },
  { photo: 'people_08', num: 'XVII',  arcana: 'The Star',      rank: 9,  x: 28, y: 25, rot: 4 },
  { photo: 'people_09', num: 'VI',    arcana: 'The Lovers',    rank: 7,  x: 42, y: 29, rot: -4 },
  { photo: 'people_10', num: 'XIX',   arcana: 'The Sun',       rank: 10, x: 9,  y: 52, rot: 6 },
  { photo: 'people_11', num: 'II',    arcana: 'The Priestess', rank: 8,  x: 23, y: 53, rot: -5 },
  { photo: 'people_12', num: 'I',     arcana: 'The Magician',  rank: 9,  x: 37, y: 54, rot: 5 },
  { photo: 'people_15', num: 'VII',   arcana: 'The Chariot',   rank: 9,  x: 51, y: 51, rot: -4 },
  { photo: 'people_13', num: 'XI',    arcana: 'Strength',      rank: 8,  x: 14, y: 76, rot: -5 },
  { photo: 'people_14', num: 'XVIII', arcana: 'The Moon',      rank: 6,  x: 28, y: 78, rot: 4 },
  { photo: 'people_16', num: 'III',   arcana: 'The Empress',   rank: 8,  x: 42, y: 77, rot: -6 },
  { photo: 'people_17', num: 'IX',    arcana: 'The Hermit',    rank: 7,  x: 53, y: 73, rot: 5 },
];
const confidantSpread = document.getElementById('confidant-spread');
function buildConfidants() {
  if (!confidantSpread) return;

  const cx = CONFIDANTS.reduce((s, c) => s + c.x, 0) / CONFIDANTS.length;
  const cy = CONFIDANTS.reduce((s, c) => s + c.y, 0) / CONFIDANTS.length;
  const d2 = (c) => (c.x - cx) ** 2 + (c.y - cy) ** 2;
  const orderPos = new Map(
    CONFIDANTS.map((c, i) => i).sort((a, b) => d2(CONFIDANTS[a]) - d2(CONFIDANTS[b]))
      .map((idx, pos) => [idx, pos]));
  confidantSpread.innerHTML = CONFIDANTS.map((c, i) => {
    let pips = '';
    for (let p = 1; p <= 10; p++) pips += `<i${p <= c.rank ? ' class="on"' : ''}></i>`;

    return `<button type="button" class="confidant-card" tabindex="-1"
        style="--x:${c.x}%;--y:${c.y}%;--rot:${c.rot}deg;--z:${Math.round(c.y)};--pc-order:${orderPos.get(i)}"
        aria-label="${c.arcana}, bond rank ${c.rank} of 10">
      <span class="cf-frame">
        <span class="cf-num">${c.num}</span>
        <span class="cf-photo"><img src="./assets/people/${c.photo}.webp" alt="" draggable="false"></span>
        <span class="cf-arcana">${c.arcana}</span>
        <span class="cf-bond">${pips}</span>
      </span>
    </button>`;
  }).join('');
}
buildConfidants();

const METRO_VB = { w: 1650, h: 500 };

const METRO_LINE = { id: 'R', name: '레드라인', color: '#e0233a', glow: '224, 35, 58' };

const METRO_ROUTES = [
  {

    stops: 7, caps: 'both', tail: 48,
    route: [
      [50, 250], [250, 250],
      [350, 150],
      [650, 150],
      [750, 250],
      [1050, 250],
      [1150, 350],
      [1350, 350],
      [1450, 250], [1600, 250],
    ],
  },
  {

    stops: 3, caps: 'none', tail: 105,
    route: [[250, 250], [440, 440], [760, 440], [950, 250]],
  },
  {

    stops: 3, caps: 'none', tail: 105,
    route: [[350, 150], [440, 60], [860, 60], [1050, 250]],
  },
  {

    stops: 2, caps: 'end', tail: 90,
    route: [[750, 250], [900, 400], [1250, 400]],
  },
  {

    stops: 2, caps: 'end', tail: 70,
    route: [[1350, 350], [1440, 440], [1600, 440]],
  },
  {

    stops: 2, caps: 'none', tail: 95,
    route: [[440, 440], [690, 190]],
  },
];
const METRO_CORNER_R = 24;
const METRO_CAP = 46;
const METRO_TAIL = 48;
const PLACE_PHOTOS = [];
for (let i = 18; i <= 36; i++) PLACE_PHOTOS.push(`places_${i}`);

function metroPolyline(pts) {
  const segs = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const len = Math.hypot(x1 - x0, y1 - y0);
    segs.push({ x0, y0, x1, y1, len, at: total });
    total += len;
  }
  return { segs, total };
}
function metroPointAt(segs, d) {
  const seg = segs.find((s) => d <= s.at + s.len) || segs[segs.length - 1];
  const t = Math.max(0, Math.min(1, (d - seg.at) / seg.len));
  return [seg.x0 + (seg.x1 - seg.x0) * t, seg.y0 + (seg.y1 - seg.y0) * t];
}

function metroRoundedPath(pts, r) {
  const unit = (from, to) => {
    const dx = to[0] - from[0], dy = to[1] - from[1], m = Math.hypot(dx, dy) || 1;
    return [dx / m, dy / m];
  };
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1], cur = pts[i], next = pts[i + 1];
    const inLen = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]);
    const outLen = Math.hypot(next[0] - cur[0], next[1] - cur[1]);
    const rr = Math.min(r, inLen / 2, outLen / 2);
    const a = unit(cur, prev), b = unit(cur, next);
    d += ` L ${(cur[0] + a[0] * rr).toFixed(2)} ${(cur[1] + a[1] * rr).toFixed(2)}`;
    d += ` Q ${cur[0]} ${cur[1]} ${(cur[0] + b[0] * rr).toFixed(2)} ${(cur[1] + b[1] * rr).toFixed(2)}`;
  }
  const end = pts[pts.length - 1];
  return `${d} L ${end[0]} ${end[1]}`;
}

function metroEndCaps(pts, len, caps) {
  const tick = (p, q) => {
    const dx = q[0] - p[0], dy = q[1] - p[1], m = Math.hypot(dx, dy) || 1;
    const nx = (-dy / m) * (len / 2), ny = (dx / m) * (len / 2);
    return `M ${p[0] - nx} ${p[1] - ny} L ${p[0] + nx} ${p[1] + ny}`;
  };
  const out = [];
  if (caps === 'both' || caps === 'start') out.push(tick(pts[0], pts[1]));
  if (caps === 'both' || caps === 'end') out.push(tick(pts[pts.length - 1], pts[pts.length - 2]));
  return out.join(' ');
}

const METRO_MIN_SEP = 120;

const METRO_SEP_SQUASH = 0.8;
function metroPlaceStops(segs, total, n, placed, tail = METRO_TAIL) {
  const span = total - tail * 2;
  const out = [];
  for (let i = 0; i < n; i++) {
    const base = tail + (span * i) / (n - 1);
    const clears = (p) => placed.every((q) =>
      Math.hypot(q[0] - p[0], (q[1] - p[1]) * METRO_SEP_SQUASH) >= METRO_MIN_SEP);
    let spot = null;
    for (let step = 0; step <= 14 && !spot; step++) {
      for (const dir of (step === 0 ? [0] : [-1, 1])) {
        const d = base + dir * step * 20;
        if (d < tail * 0.6 || d > total - tail * 0.6) continue;
        const p = metroPointAt(segs, d);
        if (clears(p)) { spot = p; break; }
      }
    }
    const p = spot || metroPointAt(segs, base);
    placed.push(p);
    out.push(p);
  }
  return out;
}

const metroStations = document.getElementById('metro-stations');
const metroRails = document.querySelector('.metro-rails');
const metroCanvas = document.querySelector('.metro-canvas');
const metroBadge = document.getElementById('metro-badge');
function buildMementos() {
  if (!metroStations || !metroRails) return;
  metroRails.setAttribute('viewBox', `0 0 ${METRO_VB.w} ${METRO_VB.h}`);

  if (metroCanvas) metroCanvas.style.aspectRatio = `${METRO_VB.w} / ${METRO_VB.h}`;
  const line = METRO_LINE;

  let casings = '', cores = '', stations = '';
  let photo = 0;
  let stop = 0;
  let order = 0;
  const placed = [];
  METRO_ROUTES.forEach((rt, li) => {
    const { segs, total } = metroPolyline(rt.route);
    const d = metroRoundedPath(rt.route, METRO_CORNER_R);
    const caps = metroEndCaps(rt.route, METRO_CAP, rt.caps);

    casings +=
      `<path class="metro-casing" style="--li:${li}" pathLength="100" d="${d}"/>` +
      (caps ? `<path class="metro-cap-casing" style="--li:${li}" d="${caps}"/>` : '');
    cores +=
      `<path class="metro-line" style="--li:${li}" pathLength="100" d="${d}"/>` +
      (caps ? `<path class="metro-cap" style="--li:${li}" d="${caps}"/>` : '');

    const spots = metroPlaceStops(segs, total, rt.stops, placed, rt.tail);
    for (let i = 0; i < rt.stops; i++) {
      const [x, y] = spots[i];
      const code = `${line.id}-${String(++stop).padStart(2, '0')}`;
      const src = PLACE_PHOTOS[photo++ % PLACE_PHOTOS.length];

      stations += `<div class="mm-station"
          style="--x:${((x / METRO_VB.w) * 100).toFixed(3)};--y:${((y / METRO_VB.h) * 100).toFixed(3)};--o:${order++};--line-col:${line.color};--line-glow:${line.glow}"
          tabindex="-1" aria-label="${line.name}, station ${code}">
        <span class="mm-token"><img src="./assets/places/${src}.webp" alt="" draggable="false"></span>
        <span class="mm-code">${code}</span>
      </div>`;
    }
  });
  metroRails.innerHTML =
    `<g class="metro-rail" style="--line-col:${line.color}">${casings}${cores}</g>`;
  metroStations.innerHTML = stations;

  if (metroBadge) {
    metroBadge.innerHTML = `
      <span class="metro-badge-line" style="--line-col:${line.color}">
        <span class="metro-badge-m">${line.id}</span>
        <span class="metro-badge-name">${line.name}</span>
      </span>`;
  }
}
buildMementos();

const metroBoard = document.querySelector('.web-board[data-web="places"]');
const metroScroller = metroBoard && metroBoard.querySelector('.metro-scroll');

function metroRailYAt(x) {
  const pts = METRO_ROUTES[0].route;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    if (x < Math.min(x0, x1) || x > Math.max(x0, x1)) continue;
    if (x1 === x0) return (y0 + y1) / 2;
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return x < pts[0][0] ? pts[0][1] : pts[pts.length - 1][1];
}

function syncMetroProgress() {
  if (!metroScroller || !metroBoard) return;
  const max = metroScroller.scrollWidth - metroScroller.clientWidth;
  const p = max > 1 ? Math.min(1, Math.max(0, metroScroller.scrollLeft / max)) : 0;
  metroBoard.style.setProperty('--p', p.toFixed(4));
  metroBoard.classList.toggle('at-end', max <= 1 || p > 0.995);
  const canvasW = metroScroller.scrollWidth;
  if (canvasW > 1) {
    const edgeX = ((metroScroller.scrollLeft + metroScroller.clientWidth) / canvasW) * METRO_VB.w;
    metroBoard.style.setProperty('--more-y', `${((metroRailYAt(edgeX) / METRO_VB.h) * 100).toFixed(2)}%`);
  }
}
(function metroScroll() {
  const scroller = metroScroller, board = metroBoard;
  if (!scroller || !board) return;
  const prog = board.querySelector('.metro-prog');
  const track = board.querySelector('.metro-prog-track');
  const hideHint = () => board.classList.add('metro-scrolled');

  scroller.addEventListener('wheel', (e) => {
    const max = scroller.scrollWidth - scroller.clientWidth;
    if (max <= 1) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    const atStart = scroller.scrollLeft <= 0;
    const atEnd = scroller.scrollLeft >= max - 1;
    if ((delta < 0 && atStart) || (delta > 0 && atEnd)) return;
    e.preventDefault();
    scroller.scrollLeft += delta;
    hideHint();
  }, { passive: false });

  let down = false, startX = 0, startLeft = 0;
  scroller.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.mm-station')) return;
    down = true; startX = e.clientX; startLeft = scroller.scrollLeft;
    scroller.setPointerCapture(e.pointerId);
  });
  scroller.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 3) { scroller.classList.add('dragging'); hideHint(); }
    scroller.scrollLeft = startLeft - dx;
  });
  const endDrag = (e) => {
    if (!down) return;
    down = false; scroller.classList.remove('dragging');
    try { scroller.releasePointerCapture(e.pointerId); } catch (_) {}
  };
  scroller.addEventListener('pointerup', endDrag);
  scroller.addEventListener('pointercancel', endDrag);
  scroller.addEventListener('scroll', () => {
    if (scroller.scrollLeft > 8) hideHint();
    syncMetroProgress();
  }, { passive: true });
  window.addEventListener('resize', syncMetroProgress);

  if (prog && track) {
    const scrubTo = (clientX) => {
      const r = track.getBoundingClientRect();
      if (r.width < 4) return;
      const p = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
      scroller.scrollLeft = p * (scroller.scrollWidth - scroller.clientWidth);
      hideHint();
    };
    let scrubbing = false;
    prog.addEventListener('pointerdown', (e) => {
      scrubbing = true;
      prog.setPointerCapture(e.pointerId);
      scrubTo(e.clientX);
      e.preventDefault();
    });
    prog.addEventListener('pointermove', (e) => { if (scrubbing) scrubTo(e.clientX); });
    const endScrub = (e) => {
      if (!scrubbing) return;
      scrubbing = false;
      try { prog.releasePointerCapture(e.pointerId); } catch (_) {}
    };
    prog.addEventListener('pointerup', endScrub);
    prog.addEventListener('pointercancel', endScrub);
  }
})();

let pluckTimer = null;
function pluckTick() {
  const panel = !panelWrap.hidden ? document.querySelector('.panel.is-shown') : null;
  const board = panel && panel.querySelector('.web-board:not([hidden])');
  if (board) {
    const strings = board.querySelectorAll('.web-strings path:not(.pluck)');
    const n = 1 + ((Math.random() * 2) | 0);
    for (let i = 0; i < n && strings.length; i++) {
      const p = strings[(Math.random() * strings.length) | 0];
      if (p.classList.contains('pluck')) continue;
      p.classList.add('pluck');

      setTimeout(() => p.classList.remove('pluck'), 1150);
    }
  }
  pluckTimer = setTimeout(pluckTick, 2600 + Math.random() * 3800);
}
pluckTimer = setTimeout(pluckTick, 2600 + Math.random() * 3800);

setActive(0);
