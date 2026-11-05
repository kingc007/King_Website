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
  // Only the open panel's loop plays. The menu video sits under the panel, unseen,
  // so it waits too; decoding them all at once is what made the site stutter.
  panels.forEach((p) => {
    const v = p.dataset.panel !== target && p.querySelector('.section-video');
    if (v && !v.paused) v.pause();
  });
  if (bgVideo && !bgVideo.paused) bgVideo.pause();
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
  // Load this section's exit clip now so it's buffered by the time Escape is pressed.
  const out = SECTION_TRANSITION_OUT[target];
  if (to && out && !(to.currentSrc || '').endsWith(out.clip.slice(1))) {
    to.src = out.clip;
    to.load();
  }
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

  el.classList.remove('slide');
  void el.offsetWidth;
  el.classList.add('slide');
  try { personaTextSfx.currentTime = EDU_INTRO_START; personaTextSfx.play().catch(() => {}); } catch (e) {}
}

const transitionOut = document.getElementById('transition-out');
let transitioning = false;
let closeSeq = 0;

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
    if (bgVideo && bgVideo.paused) bgVideo.play().catch(() => {});
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
    const seq = ++closeSeq;
    let revealed = false;
    let swapped = false;
    let endTimer = 0;
    const end = () => {
      transitionOut.removeEventListener('ended', end);
      clearTimeout(endTimer);
      if (seq === closeSeq) transitionOut.classList.remove('is-playing');
    };
    transitionOut.addEventListener('ended', end);

    const swap = () => {
      if (swapped || seq !== closeSeq) return;
      swapped = true;
      clearTimeout(stallTimer);
      finishClose(cfg.replayIntro);
      if (cfg.endAtSwap || !revealed) end();
      transitioning = false;
    };

    // The swap is timed from the clip's first painted frame, not the keypress.
    // After the page sits idle the browser drops the clip's decoder, so the
    // first frame can arrive late; timing from the keypress swapped the panel
    // out before the clip covered it.
    const reveal = () => {
      if (revealed || swapped || seq !== closeSeq) return;
      revealed = true;
      transitionOut.classList.add('is-playing');
      setTimeout(swap, cfg.swapAt);
      // A clip that stalls never fires 'ended'; never leave it over the menu.
      const dur = isFinite(transitionOut.duration) ? transitionOut.duration * 1000 : 3000;
      endTimer = setTimeout(end, dur + 800);
    };
    const onReady = () => {
      if ('requestVideoFrameCallback' in transitionOut) {
        transitionOut.requestVideoFrameCallback(() => reveal());
      } else {
        requestAnimationFrame(reveal);
      }
    };
    // No frame in time: close without the clip rather than hang or pop it in late.
    const stallTimer = setTimeout(() => {
      if (revealed) return;
      try { transitionOut.pause(); } catch (e) {}
      swap();
    }, 1200);

    const p = transitionOut.play();
    if (p && p.then) {
      p.then(onReady).catch(() => {
        // Sound can be refused once the click no longer counts as a gesture; play it muted.
        transitionOut.muted = true;
        transitionOut.play().then(onReady).catch(() => {});
      });
    } else onReady();
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
      if (closePlaceCard()) { e.preventDefault(); return; }
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
    if (hobbiesBoard && !hobbiesBoard.hidden) blackjackKey(e);
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
      b.setAttribute('aria-hidden', 'false');
      b.classList.remove('drop', 'revealing');
      void b.offsetWidth;
      b.classList.add('drop', 'revealing');

      clearTimeout(b._revealTimer);
      b._revealTimer = setTimeout(() => b.classList.remove('revealing'), 1100);
      revealDoodles(b.querySelectorAll('.web-doodle'));
    } else {
      b.hidden = true;
      b.setAttribute('aria-hidden', 'true');
      b.classList.remove('drop', 'revealing');
    }
  });

  if (name === 'movies') resetMovieReel();
  if (name === 'places') {
    const pb = document.querySelector('.web-board[data-web="places"]');
    const sc = pb && pb.querySelector('.metro-scroll');
    if (sc) sc.scrollLeft = 0;
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

/* ---------- Music control: MUTE / CHILL·NORMAL (bottom-left calling card) ---------- */
// Normal = Last Surprise (then rolls into Beneath the Mask when it ends).
// Chill  = Beneath the Mask, looped.
const musicHat = document.getElementById('music-hat');
const musicMuteBtn = document.getElementById('music-mute');
const musicModeBtn = document.getElementById('music-mode');
const MUTE_KEY = 'tkb-music-muted';

let musicMuted = false;
let musicChill = false;
let musicStarted = false;
try { musicMuted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) {}

function setTiles(el, text) {
  el.textContent = '';
  for (const char of text) {
    const t = document.createElement('span');
    t.className = 'tile';
    t.textContent = char;
    el.appendChild(t);
  }
}

function renderMusicCtrl() {
  if (takeHeart) takeHeart.classList.toggle('is-muted', musicMuted);
  const label = musicMuted ? 'Unmute music' : 'Mute music';
  if (musicMuteBtn) {
    setTiles(musicMuteBtn, musicMuted ? 'Unmute' : 'Mute');
    musicMuteBtn.setAttribute('aria-pressed', String(musicMuted));
    musicMuteBtn.setAttribute('aria-label', label);
  }
  if (musicHat) {
    musicHat.setAttribute('aria-pressed', String(musicMuted));
    musicHat.setAttribute('aria-label', label);
  }
  if (musicModeBtn) {
    // Shows the mode you'll switch to, same as MUTE / UNMUTE.
    setTiles(musicModeBtn, musicChill ? 'Normal' : 'Chill');
    musicModeBtn.setAttribute('aria-label', musicChill
      ? 'Switch to normal music (Last Surprise)'
      : 'Switch to chill music (Beneath the Mask, looped)');
  }
}

function applyMute() {
  bgm.muted = musicMuted;
  maskBgm.muted = musicMuted;
}

function toggleMute() {
  musicMuted = !musicMuted;
  try { localStorage.setItem(MUTE_KEY, musicMuted ? '1' : '0'); } catch (e) {}
  applyMute();
  playClickSfx();
  renderMusicCtrl();
}

function stopBgmFade() {
  if (bgmFadeTimer) clearTimeout(bgmFadeTimer);
  if (bgmFadeRaf) cancelAnimationFrame(bgmFadeRaf);
}

function playMaskLoop() {
  try { bgm.pause(); } catch (e) {}
  try { maskBgm.currentTime = 0; maskBgm.play().catch(() => {}); } catch (e) {}
}

function playNormal() {
  try { maskBgm.pause(); } catch (e) {}
  stopBgmFade();
  try { bgm.currentTime = 0; bgm.volume = BGM_FULL_VOL; bgm.play().catch(() => {}); scheduleBgmFade(); } catch (e) {}
}

function toggleMusicMode() {
  musicChill = !musicChill;
  playClickSfx();
  // Before the gate is pressed this only sets the mode; startMusic picks it up.
  if (musicStarted) {
    if (musicChill) { stopBgmFade(); playMaskLoop(); } else playNormal();
  }
  renderMusicCtrl();
}

function startMusic() {
  musicStarted = true;
  applyMute();
  if (musicChill) playMaskLoop(); else playNormal();
}

bgm.addEventListener('ended', () => {
  musicChill = true;
  renderMusicCtrl();
  playMaskLoop();
});

if (musicHat) musicHat.addEventListener('click', toggleMute);
if (musicMuteBtn) musicMuteBtn.addEventListener('click', toggleMute);
if (musicModeBtn) musicModeBtn.addEventListener('click', toggleMusicMode);
applyMute();
renderMusicCtrl();

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
  startMusic();
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

  // "Press any button" — any key works, not just a click. Captured on window so
  // Enter/Space never fall through to the main menu while the gate is up.
  const MODIFIER_ONLY = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Fn', 'Tab']);
  window.addEventListener('keydown', (e) => {
    if (gateDismissed) return;
    e.stopImmediatePropagation();
    // Enter/Space on a focused MUTE/SKIP button presses that button, not the gate.
    if (takeHeart && takeHeart.contains(e.target) && (e.key === 'Enter' || e.key === ' ')) return;
    if (e.repeat || MODIFIER_ONLY.has(e.key) || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    startGo();
  }, true);

  // Gamepads count as "any button" too.
  if ('getGamepads' in navigator) {
    let padRaf = null;
    const pollPads = () => {
      if (gateStarting) { padRaf = null; return; }
      for (const pad of navigator.getGamepads()) {
        if (pad && pad.buttons.some((b) => b.pressed)) { startGo(); padRaf = null; return; }
      }
      padRaf = requestAnimationFrame(pollPads);
    };
    window.addEventListener('gamepadconnected', () => { if (!padRaf) padRaf = requestAnimationFrame(pollPads); });
  }
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

// ---------- Hobbies: card table dealt from my skills ----------
// 52 skills, 13 per suit. Within a suit the rank is the order I'd rate them:
// the ace is the one I'm best at. Two games share the table: single-deck
// blackjack, and heads-up Texas Hold'em dealt from two copies of the deck,
// one after the other: all 52 of the first copy go out before the second
// is touched, and no hand ever holds two copies of the same card.
// Neither shoe refills until the player shuffles, so both can be counted.

const BJ_SUITS = {
  s: { name: 'Spades', label: 'Mind',
       svg: '<path d="M12 1.6C9.5 6 3 9.3 3 14.1c0 2.7 2 4.6 4.5 4.6 1.5 0 2.7-.7 3.4-1.7-.2 1.9-1 3.3-2.7 4.7h7.6c-1.7-1.4-2.5-2.8-2.7-4.7.7 1 1.9 1.7 3.4 1.7 2.5 0 4.5-1.9 4.5-4.6C21 9.3 14.5 6 12 1.6z"/>' },
  c: { name: 'Clubs', label: 'Body',
       svg: '<circle cx="12" cy="6.7" r="4.4"/><circle cx="6.6" cy="13.6" r="4.4"/><circle cx="17.4" cy="13.6" r="4.4"/><path d="M10.4 9.5h3.2l1 4.5-.6 1.2H10l-.6-1.2z"/><path d="M11 13.2h2c.2 3.6 1.1 5.9 3 8.2H8c1.9-2.3 2.8-4.6 3-8.2z"/>' },
  h: { name: 'Hearts', label: 'Creative and life',
       svg: '<path d="M12 21.4C5.5 16.3 1.6 12.6 1.6 8.3 1.6 5.1 4 2.7 7.1 2.7c2.1 0 3.9 1.1 4.9 2.9 1-1.8 2.8-2.9 4.9-2.9 3.1 0 5.5 2.4 5.5 5.6 0 4.3-3.9 8-10.4 13.1z"/>' },
  d: { name: 'Diamonds', label: 'Business and tech',
       svg: '<path d="M12 1.4Q15.6 7 20.2 12 15.6 17 12 22.6 8.4 17 3.8 12 8.4 7 12 1.4z"/>' },
};
const BJ_SUIT_ORDER = ['s', 'c', 'h', 'd'];
const BJ_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const BJ_SKILLS = {
  s: { A: 'Poker', K: 'Brainteasers', Q: 'Chess', J: "Texas Hold'em", 10: 'Blackjack', 9: 'Escape Rooms',
       8: 'Chinese Poker', 7: 'Meditate', 6: 'Zetamac', 5: 'Connections', 4: 'Wordle', 3: 'Krillion', 2: 'Deuces' },
  c: { A: 'Tennis', K: 'Gym', Q: 'Boxing', J: 'Badminton', 10: 'Golf', 9: 'Bowling',
       8: 'Hiking', 7: 'Running', 6: 'Rock Climbing', 5: 'Basketball', 4: 'Soccer', 3: 'Football', 2: 'Pool' },
  h: { A: 'Origami', K: 'DaVinci Resolve', Q: 'Photoshop', J: 'Canva', 10: 'Premiere Pro', 9: 'Photography',
       8: 'Videography', 7: 'Flute', 6: 'Violin', 5: 'Obsidian', 4: 'Ideation', 3: 'CapCut', 2: 'After Effects' },
  d: { A: 'Risk Management', K: 'Learning', Q: 'Vibecoding', J: 'Operations', 10: 'Research', 9: 'Automation',
       8: 'LinkedIn', 7: 'Networking', 6: 'Valuation', 5: 'GitHub', 4: 'Excel', 3: 'Python', 2: 'Java' },
};

// Faint doodles printed into the felt: over the black slab, under everything else.
(function bjFeltDoodles() {
  const slab = document.querySelector('.hobbies-board .bj-slab');
  if (!slab) return;
  const placed = [];
  for (let n = 0; n < 16; n++) {
    let x, y, tries = 0;
    do {
      x = 4 + Math.random() * 92;
      y = 6 + Math.random() * 88;
      tries++;
    } while (tries < 60 && placed.some((p) => Math.hypot(x - p[0], (y - p[1]) * 0.6) < 13));
    placed.push([x, y]);
    const key = DOODLE_KEYS[(Math.random() * DOODLE_KEYS.length) | 0];
    const [fill, edge] = DOODLE_FILLS[(Math.random() * DOODLE_FILLS.length) | 0];
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'bj-doodle');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = `left:${x.toFixed(2)}%;top:${y.toFixed(2)}%;width:${(3 + Math.random() * 3).toFixed(2)}%;--rot:${(Math.random() * 50 - 25).toFixed(0)}deg`;
    svg.innerHTML = DOODLE_SHAPES[key](fill, edge);
    slab.after(svg);
  }
})();

const BJ_FULL_DECK = BJ_SUIT_ORDER.flatMap((suit) => BJ_RANKS.map((rank) => ({
  id: `${rank}${suit}`,
  suit,
  rank,
  name: BJ_SKILLS[suit][rank],
  value: rank === 'A' ? 11 : (rank === 'J' || rank === 'Q' || rank === 'K') ? 10 : +rank,
  // Poker rank: deuce is 2, ace is 14.
  hi: rank === 'A' ? 14 : rank === 'K' ? 13 : rank === 'Q' ? 12 : rank === 'J' ? 11 : +rank,
})));

// Hi-Lo: 2 to 6 is +1, 7 to 9 is 0, tens through aces are -1.
const bjHiLo = (c) => (c.value <= 6 ? 1 : c.value >= 10 ? -1 : 0);

// Where the pips sit on a real playing card, as [x, y] inside the pip field.
const BJ_PIPS = {
  2:  [[.5, 0], [.5, 1]],
  3:  [[.5, 0], [.5, .5], [.5, 1]],
  4:  [[0, 0], [1, 0], [0, 1], [1, 1]],
  5:  [[0, 0], [1, 0], [.5, .5], [0, 1], [1, 1]],
  6:  [[0, 0], [1, 0], [0, .5], [1, .5], [0, 1], [1, 1]],
  7:  [[0, 0], [1, 0], [.5, .25], [0, .5], [1, .5], [0, 1], [1, 1]],
  8:  [[0, 0], [1, 0], [.5, .25], [0, .5], [1, .5], [.5, .75], [0, 1], [1, 1]],
  9:  [[0, 0], [1, 0], [0, 1 / 3], [1, 1 / 3], [.5, .5], [0, 2 / 3], [1, 2 / 3], [0, 1], [1, 1]],
  10: [[0, 0], [1, 0], [.5, 1 / 6], [0, 1 / 3], [1, 1 / 3], [0, 2 / 3], [1, 2 / 3], [.5, 5 / 6], [0, 1], [1, 1]],
};

// Each game keeps its own shoe; switching tables puts one away and brings out the other.
const BJ_GAMES = {
  bj:     { decks: 1, minToDeal: 10, dealer: 'Dealer' },
  holdem: { decks: 2, minToDeal: 9,  dealer: 'House' },
};
const BJ_DEALER_STANDS = 17;
const BJ_DEAL_MS = 380;
const BJ_STEP_MS = 260;
const BJ_START_BANK = 1000;
const HD_ANTE = 10;
const HD_MAX_RAISES = 3;  // bets and raises allowed per street

// How the house plays hold'em. It reads its equity through some noise, then
// raises, calls, value bets, probes and bluffs at these thresholds and rates.
// `respect` shaves equity when you bet near the pot, less so for overbets it
// suspects are bluffs; `slowplay` checks a monster early.
const HD_LEVELS = {
  easy:   { trials: 90,  noise: 0.22, raiseAt: 0.86, raiseFreq: 0.25, callSlack: 0.12,
            valueAt: 0.72, valueFreq: 0.5, probeAt: 0.6, probeFreq: 0.1, bluff: 0.04,
            sizes: [0.5, 0.5], respect: 0, slowplay: 0 },
  medium: { trials: 260, noise: 0.08, raiseAt: 0.7, raiseFreq: 0.55, callSlack: 0,
            valueAt: 0.62, valueFreq: 0.8, probeAt: 0.48, probeFreq: 0.3, bluff: 0.12,
            sizes: [0.5, 0.75], respect: 0, slowplay: 0 },
  hard:   { trials: 650, noise: 0.03, raiseAt: 0.64, raiseFreq: 0.75, callSlack: 0,
            valueAt: 0.57, valueFreq: 0.9, probeAt: 0.45, probeFreq: 0.35, bluff: 0.2,
            sizes: [0.6, 1], respect: 0.08, slowplay: 0.2 },
};

const bjBoard = document.querySelector('.web-board[data-web="hobbies"]');
const bjTable = bjBoard && bjBoard.querySelector('.bj-table');
const bjShoe = document.getElementById('bj-shoe');
const bjLeftEl = document.getElementById('bj-left');
const bjDealerHand = document.getElementById('bj-dealer');
const bjPlayerHand = document.getElementById('bj-player');
const bjBoardHand = document.getElementById('bj-board');
const bjDealerName = document.getElementById('bj-dealer-name');
const bjDealerTotal = document.getElementById('bj-dealer-total');
const bjPlayerTotal = document.getElementById('bj-player-total');
const bjStatus = document.getElementById('bj-status');
const bjCutin = document.getElementById('bj-cutin');
const bjHit = document.getElementById('bj-hit');
const bjStand = document.getElementById('bj-stand');
const bjDouble = document.getElementById('bj-double');
const bjDeal = document.getElementById('bj-deal');
const bjClear = document.getElementById('bj-clear');
const hdCall = document.getElementById('hd-call');
const hdRaise = document.getElementById('hd-raise');
const hdAllIn = document.getElementById('hd-allin');
const hdFold = document.getElementById('hd-fold');
const bjShuffleBtn = document.getElementById('bj-shuffle');
const bjRecord = document.getElementById('bj-record');
const bjRack = document.getElementById('bj-rack');
const bjSpot = document.getElementById('bj-spot');
const bjStack = document.getElementById('bj-stack');
const bjBetLabel = document.getElementById('bj-bet-label');
const bjBetEl = document.getElementById('bj-bet');
const bjBankEl = document.getElementById('bj-bank');
const bjBankWrap = document.getElementById('bj-bank-wrap');
const bjHouseEl = document.getElementById('bj-house');
const bjHouseWrap = document.getElementById('bj-house-wrap');
const bjCountToggle = document.getElementById('bj-count-toggle');
const bjCountBody = document.getElementById('bj-count-body');
const bjRunningEl = document.getElementById('bj-rc');
const bjTrueEl = document.getElementById('bj-tc');
const bjTally = document.getElementById('bj-tally');

let bjMode = 'bj';        // bj | holdem
let bjDeck = [];          // the shoe: cards not yet dealt
let bjSeen = new Set();   // uids of cards that have been shown face up
let bjRunning = 0;
let bjDealer = [];        // the dealer in blackjack, the house in hold'em
let bjPlayer = [];
let bjPhase = 'idle';     // idle | dealing | player | dealer | done
let bjTimers = [];
let bjScore = { w: 0, l: 0, p: 0 };
const bjStash = {};       // everything on the table of the game not being played, hand and all
let bjPendingMode = null; // a switch asked for mid-deal, made once the cards settle

// Chips: the bank is what's still in front of you; chips on the spot are the bet.
// The house has a bank too, shared by both games. Empty either one and the match is over.
let bjBank = BJ_START_BANK;
let bjHouse = BJ_START_BANK;
let bjPile = [];
let bjStake = 0;
let bjLastBet = 25;

function bjLater(fn, ms) { bjTimers.push(setTimeout(fn, ms)); }
function bjClearTimers() { bjTimers.forEach(clearTimeout); bjTimers = []; }

function bjSuitSvg(suit) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${BJ_SUITS[suit].svg}</svg>`;
}

// Card backs carry a Phantom Thief mask, as the old hobby deck did — only the four best.
const BJ_MASKS = ['joker', 'skull', 'fox', 'crow'];
const bjMaskFor = (id) => BJ_MASKS[[...id].reduce((h, ch) => h + ch.charCodeAt(0), 0) % BJ_MASKS.length];
const bjMask = (key) => `<img class="bj-mask" src="./assets/masks/${key}.webp" alt="" draggable="false">`;

function bjCardFace(c) {
  if (c.rank === 'A') return `<span class="bj-ace">${bjSuitSvg(c.suit)}</span>`;
  if (c.value === 10 && c.rank !== '10') {
    return `<span class="bj-court"><b>${c.rank}</b>${bjSuitSvg(c.suit)}</span>`;
  }
  const pips = BJ_PIPS[c.rank].map(([x, y]) => `<span class="bj-pip${y > 0.5 ? ' bj-pip--flip' : ''}"
      style="left:${x * 100}%;top:${y * 100}%">${bjSuitSvg(c.suit)}</span>`).join('');
  return `<span class="bj-pips">${pips}</span>`;
}

function bjCardHTML(c) {
  const idx = (extra) => `<span class="bj-idx${extra}"><b>${c.rank}</b>${bjSuitSvg(c.suit)}</span>`;
  return `
    <span class="bj-inner">
      <span class="bj-side bj-front">
        ${idx('')}
        <span class="bj-skill bj-skill--top">${c.name}</span>
        ${bjCardFace(c)}
        <span class="bj-skill">${c.name}</span>
        ${idx(' bj-idx--br')}
      </span>
      <span class="bj-side bj-back">${bjMask(bjMaskFor(c.id))}</span>
    </span>`;
}

function bjShuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Every card in a game's shoe, each copy with its own uid.
const bjShoeCards = (mode) => Array.from({ length: BJ_GAMES[mode].decks }, (_, d) =>
  BJ_FULL_DECK.map((c) => ({ ...c, uid: `${c.id}.${d}` }))).flat();

// Best total for a hand; an ace counts 11 unless that would bust it.
function bjScoreHand(hand) {
  let total = 0, aces = 0;
  hand.forEach((c) => { total += c.value; if (c.rank === 'A') aces++; });
  while (total > 21 && aces) { total -= 10; aces--; }
  return { total, soft: aces > 0 };
}
const bjTotal = (hand) => bjScoreHand(hand).total;
const bjNatural = (hand) => hand.length === 2 && bjTotal(hand) === 21;

function bjTotalLabel(hand) {
  const { total, soft } = bjScoreHand(hand);
  return soft && total < 21 && bjPhase === 'player' ? `${total - 10}/${total}` : `${total}`;
}

// ---------- Ransom-note lettering ----------
// Every status line is cut from mismatched scraps, like a Phantom Thieves calling card.
// The scraps are picked from a hash of the text, so the same words always look the same.

const BJ_SCRAPS = ['w', 'k', 'r', 'w', 'k', 'w', 'r', 'k'];
const BJ_SCRAP_FONTS = ['a', 'b', 'c', 'a', 'd', 'b'];

function bjRansom(text, tone = '') {
  let h = 7;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  // Letters are grouped per word so a long line breaks between words, never inside one.
  let out = '<span class="rn-word">';
  [...text].forEach((ch, i) => {
    if (ch === ' ') { out += '</span><span class="rn-gap"></span><span class="rn-word">'; return; }
    const n = (h + i * 17 + ch.charCodeAt(0) * 7) % 97;
    let bg = BJ_SCRAPS[n % BJ_SCRAPS.length];
    if (tone === 'lose' && n % 3 === 0) bg = 'r';
    if (tone === 'win' && n % 3 === 0) bg = 'w';
    const font = BJ_SCRAP_FONTS[(n >> 2) % BJ_SCRAP_FONTS.length];
    const rot = ((n % 11) - 5) * 1.6;
    const lift = ((n >> 1) % 5) - 2;
    out += `<span class="rn rn--${bg} rn-f${font}" style="--r:${rot}deg;--y:${lift * 0.04}em">${ch}</span>`;
  });
  return `${out}</span>`;
}

function bjSetStatus(text, tone = '') {
  bjStatus.innerHTML = `<span class="bj-sr">${text}</span><span class="rn-line" aria-hidden="true">${bjRansom(text, tone)}</span>`;
  bjStatus.className = `bj-status${tone ? ` bj-status--${tone}` : ''}`;
  // Long lines drop a size so they don't push the buttons off the table.
  bjStatus.classList.toggle('is-long', text.length > 15);
  bjStatus.classList.remove('is-new');
  void bjStatus.offsetWidth;
  bjStatus.classList.add('is-new');
}

// A slashed banner tears across the table when a hand is decided.
function bjCutIn(text, tone) {
  if (!bjCutin) return;
  bjCutin.querySelector('.bj-cutin-text').innerHTML = bjRansom(text, tone);
  bjCutin.className = `bj-cutin bj-cutin--${tone}`;
  void bjCutin.offsetWidth;
  bjCutin.classList.add('is-on');
}

// ---------- The shoe and the count ----------

function bjBuildTally() {
  if (!bjTally) return;
  let html = '<span></span>' + BJ_RANKS.map((r) => `<span class="bj-tally-rank">${r}</span>`).join('');
  BJ_SUIT_ORDER.forEach((suit) => {
    html += `<span class="bj-tally-suit bj-tally-suit--${suit}">${bjSuitSvg(suit)}</span>`;
    html += BJ_RANKS.map((rank) => {
      const id = `${rank}${suit}`;
      return `<span class="bj-tally-cell" data-id="${id}" title="${BJ_SKILLS[suit][rank]}"></span>`;
    }).join('');
  });
  bjTally.innerHTML = html;
}

function bjRenderCount() {
  bjLeftEl.textContent = bjDeck.length;
  const sign = (n) => (n > 0 ? `+${n}` : `${n}`);
  bjRunningEl.textContent = sign(bjRunning);
  const decksLeft = Math.max(bjDeck.length, 1) / 52;
  const tc = Math.round((bjRunning / decksLeft) * 10) / 10;
  bjTrueEl.textContent = sign(tc);
  // With two decks a cell fills halfway for the first copy and fully for the second.
  const out = {};
  bjSeen.forEach((uid) => { const id = uid.split('.')[0]; out[id] = (out[id] || 0) + 1; });
  const decks = BJ_GAMES[bjMode].decks;
  bjTally.querySelectorAll('.bj-tally-cell').forEach((cell) => {
    const n = out[cell.dataset.id] || 0;
    cell.classList.toggle('is-out', n >= decks);
    cell.classList.toggle('is-half', n > 0 && n < decks);
  });
}

function bjSee(c) {
  if (bjSeen.has(c.uid)) return;
  bjSeen.add(c.uid);
  bjRunning += bjHiLo(c);
  bjRenderCount();
}

function bjRenderShoe() {
  if (!bjShoe) return;
  const shown = Math.min(Math.ceil(bjDeck.length / (6 * BJ_GAMES[bjMode].decks)), 8);
  let html = '';
  for (let k = 0; k < shown; k++) {
    html += `<span class="bj-shoe-card bj-back" style="--k:${k}">${bjMask(BJ_MASKS[k % BJ_MASKS.length])}</span>`;
  }
  bjShoe.innerHTML = html;
  bjShoe.classList.toggle('is-empty', !bjDeck.length);
}

function bjNewShoe() {
  // Each deck is shuffled on its own and stacked, first copy on top (cards
  // come off the end), so the second deck only starts once the first is gone.
  const cards = bjShoeCards(bjMode);
  bjDeck = [];
  for (let d = BJ_GAMES[bjMode].decks - 1; d >= 0; d--) {
    bjDeck.push(...bjShuffle(cards.slice(d * 52, (d + 1) * 52)));
  }
  bjSeen = new Set();
  bjRunning = 0;
  bjRenderShoe();
  bjRenderCount();
}

function bjClearHands() {
  bjDealer = [];
  bjPlayer = [];
  hdBoard = [];
  bjDealerHand.innerHTML = '';
  bjPlayerHand.innerHTML = '';
  bjBoardHand.innerHTML = '';
  bjBoard.classList.remove('is-showdown');
}

function bjShuffleUp() {
  if (!bjBetting()) return;
  playClickSfx();
  bjNewShoe();
  bjClearHands();
  bjRenderTotals();
  bjShoe.querySelectorAll('.bj-shoe-card').forEach((el, i) => el.animate([
    { translate: '0 0', rotate: '0deg' },
    { translate: `${i % 2 ? 14 : -14}px -6px`, rotate: `${i % 2 ? 6 : -6}deg`, offset: 0.4 },
    { translate: '0 0', rotate: '0deg' },
  ], { duration: 420, delay: i * 30, easing: 'cubic-bezier(0.3, 0.7, 0.3, 1)' }));
  bjSetStatus(bjMode === 'holdem' ? 'Fresh shoe' : 'Fresh deck');
  bjRenderControls();
}

// ---------- Table state ----------

const bjBetting = () => bjPhase === 'idle' || bjPhase === 'done';
const bjPileTotal = () => bjPile.reduce((a, v) => a + v, 0);
const bjMoney = (n) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
const bjEnough = () => bjDeck.length >= BJ_GAMES[bjMode].minToDeal;

function bjRenderTotals() {
  if (bjMode === 'holdem') { hdRenderTotals(); return; }
  bjPlayerTotal.textContent = bjPlayer.length ? bjTotalLabel(bjPlayer) : '';
  // Until the hole card turns over, only the up card counts for the dealer.
  const seen = bjDealer.filter((c) => c.up);
  bjDealerTotal.textContent = seen.length ? bjTotal(seen) : '';
}

// The smallest stake each game can be played for.
const bjMinStake = (mode = bjMode) => (mode === 'holdem' ? HD_ANTE : 5);

// Money still riding on the other table's paused hand keeps the match alive.
function bjStashedStake() {
  const other = bjStash[bjMode === 'bj' ? 'holdem' : 'bj'];
  if (!other) return 0;
  return other.pile.reduce((a, v) => a + v, 0) + (other.phase === 'idle' || other.phase === 'done' ? 0 : other.stake + other.hd.mine);
}

// Who has run out: 'you', 'house' or null. Only asked between hands.
function bjMatchOver() {
  if (!bjBetting()) return null;
  const min = bjMinStake();
  if (bjBank + (bjMode === 'bj' ? bjPileTotal() : 0) + bjStashedStake() < min) return 'you';
  if (bjHouse < min && !bjStashedStake()) return 'house';
  return null;
}

function bjRenderControls() {
  const playing = bjPhase === 'player';
  const enough = bjEnough();
  const holdem = bjMode === 'holdem';
  const over = bjMatchOver();
  if (holdem) {
    hdRenderControls();
  } else {
    bjHit.disabled = !playing || !bjDeck.length;
    bjStand.disabled = !playing;
    bjDouble.disabled = !playing || bjPlayer.length !== 2 || bjBank < bjStake || bjStake * 2 > bjHouse || !bjDeck.length;
    bjDeal.disabled = !bjBetting() || !bjPileTotal() || !enough;
    bjClear.disabled = !bjBetting() || !bjPileTotal();
    // The house has to be able to cover the bet.
    bjRack.querySelectorAll('.bj-chip').forEach((chip) => {
      const v = +chip.dataset.v;
      chip.disabled = !bjBetting() || v > bjBank || bjPileTotal() + v > bjHouse;
    });
    bjSpot.disabled = !bjBetting() || !bjPile.length;
  }
  if (over) {
    bjDeal.disabled = false;
    bjRack.querySelectorAll('.bj-chip').forEach((chip) => { chip.disabled = true; });
  }
  bjDeal.querySelector('span').textContent = over ? 'Rematch' : 'Deal';
  bjShuffleBtn.disabled = !bjBetting();
  bjShuffleBtn.classList.toggle('is-due', bjBetting() && !enough && !over);
  bjBoard.dataset.phase = bjPhase;
  const { w, l, p } = bjScore;
  bjRecord.textContent = w + l + p ? `${w} won, ${l} lost, ${p} ${holdem ? 'split' : 'pushed'}` : '';
  // A switch asked for mid-deal goes through once it's your move again.
  if (bjPendingMode && (playing || bjBetting())) {
    const mode = bjPendingMode;
    bjPendingMode = null;
    setTimeout(() => bjSetMode(mode), 0);
  }
}

function bjRenderBanks() {
  bjBankEl.textContent = bjMoney(bjBank - (bjMode === 'holdem' ? hdStagedTotal() : 0));
  bjHouseEl.textContent = bjMoney(bjHouse);
}

function bjRenderChips() {
  if (bjMode === 'holdem') { hdRenderPot(); return; }
  const shown = bjPile.slice(-14);
  bjStack.innerHTML = shown.map((v, i) =>
    `<span class="bj-chip bj-chip--flat" data-v="${v}" style="--i:${i}"><span>${v}</span></span>`).join('');
  bjBetEl.textContent = bjMoney(bjPileTotal() || bjStake || 0);
  bjRenderBanks();
}

// Fly a chip-shaped clone between two elements; resolves when it lands.
function bjFlyChip(v, fromEl, toEl, { fade = false, delay = 0 } = {}) {
  const a = fromEl.getBoundingClientRect();
  const b = toEl.getBoundingClientRect();
  const size = bjRack.firstElementChild.offsetWidth || 60;
  const fly = document.createElement('span');
  fly.className = 'bj-chip bj-chip--fly';
  fly.dataset.v = v;
  fly.innerHTML = `<span>${v}</span>`;
  fly.style.width = fly.style.height = `${size}px`;
  fly.style.left = `${a.left + a.width / 2 - size / 2}px`;
  fly.style.top = `${a.top + a.height / 2 - size / 2}px`;
  document.body.appendChild(fly);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const spin = (Math.random() < 0.5 ? -1 : 1) * (200 + Math.random() * 160);
  const anim = fly.animate([
    { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: 1 },
    { transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 40}px) rotate(${spin * 0.6}deg) scale(1.12)`, opacity: 1, offset: 0.55 },
    { transform: `translate(${dx}px, ${dy}px) rotate(${spin}deg) scale(${fade ? 0.6 : 0.9})`, opacity: fade ? 0 : 1 },
  ], { duration: 460, delay, easing: 'cubic-bezier(0.3, 0.7, 0.3, 1)', fill: 'backwards' });
  return anim.finished.catch(() => {}).then(() => fly.remove());
}

const bjRackChip = (v) => bjRack.querySelector(`.bj-chip[data-v="${v}"]`);

function bjAddChip(v, chipEl, quiet = false) {
  if (bjMode === 'holdem') { hdAddChip(v, chipEl); return; }
  if (!bjBetting() || bjMatchOver() || v > bjBank || bjPileTotal() + v > bjHouse) return;
  bjBank -= v;
  bjPile.push(v);
  bjRenderControls();
  bjBankEl.textContent = bjMoney(bjBank);
  bjBetEl.textContent = bjMoney(bjPileTotal());
  playSwitchSfx();
  bjFlyChip(v, chipEl || bjRackChip(v), bjSpot).then(() => bjRenderChips());
  if (!quiet && bjPhase === 'done') bjSetStatus('Deal when ready');
}

function bjTakeChip() {
  if (bjMode === 'holdem' || !bjBetting() || !bjPile.length) return;
  const v = bjPile.pop();
  bjBank += v;
  bjRenderChips();
  bjRenderControls();
  bjFlyChip(v, bjSpot, bjRackChip(v));
}

function bjClearBet() {
  if (bjMode === 'holdem') { hdClearRaise(); return; }
  if (!bjBetting() || !bjPile.length) return;
  bjPile.slice().reverse().forEach((v, i) =>
    bjFlyChip(v, bjSpot, bjRackChip(v), { delay: i * 40 }));
  bjBank += bjPileTotal();
  bjPile = [];
  bjRenderChips();
  bjRenderControls();
}

// Break an amount into the fewest chips, biggest first.
function bjChipsFor(amount) {
  const out = [];
  [500, 100, 25, 5].forEach((v) => { while (amount >= v) { out.push(v); amount -= v; } });
  return out.reverse();
}

// Called a beat after each hand: if someone is broke, say so and offer a rematch.
function bjAnnounceMatch() {
  const over = bjMatchOver();
  bjRenderControls();
  if (!over) return false;
  bjSetStatus(over === 'house' ? 'House is broke' : 'You are broke', over === 'house' ? 'win' : 'lose');
  bjCutIn(over === 'house' ? 'House broken!' : 'Busted out', over === 'house' ? 'win' : 'lose');
  return true;
}

// Both banks back to $1000. Any paused hand on the other table is swept away.
function bjRematch() {
  playClickSfx();
  bjClearTimers();
  bjBank = BJ_START_BANK;
  bjHouse = BJ_START_BANK;
  bjPile = [];
  bjStake = 0;
  bjLastBet = 25;
  hdPot = 0;
  hdMine = 0;
  hdTheirs = 0;
  hdStaged = [];
  Object.values(bjStash).forEach((s) => {
    Object.assign(s, { phase: 'idle', dealer: [], player: [], board: [], pile: [], stake: 0, lastBet: 25, nodes: null, status: null, live: false, showdown: false });
    s.hd = { pot: 0, street: 0, in: { me: 0, house: 0 }, mine: 0, theirs: 0, raises: 0, acted: false };
  });
  bjPhase = 'idle';
  bjClearHands();
  bjSpot.classList.remove('is-live');
  bjRenderTotals();
  bjRenderChips();
  bjRenderControls();
  bjSetStatus('New match. $1000 each');
  bjPaidPulse();
  bjLater(bjRebet, 500);
}

// After a hand, put the same bet back down (as much as the bank allows).
function bjRebet() {
  if (bjMode !== 'bj' || !bjBetting() || bjPile.length || bjMatchOver()) return;
  const cap = Math.min(bjBank, bjHouse);
  const amount = Math.min(bjLastBet, cap - (cap % 5));
  bjChipsFor(amount).forEach((v, i) => bjLater(() => bjAddChip(v, null, true), i * 90));
  bjRenderChips();
  bjRenderControls();
}

function bjFitHand(handEl) {
  const n = handEl.children.length;
  const first = handEl.firstElementChild;
  if (!first) return;
  // Fan the cards as wide as the seat allows, never more than 80% of a card apart.
  const w = first.offsetWidth;
  const room = handEl.clientWidth || w * 4;
  const step = n > 1 ? Math.min(w * 0.8, (room - w) / (n - 1)) : w;
  handEl.style.setProperty('--step', `${Math.max(w * 0.22, step)}px`);
}

// ---------- Dealing ----------

// Pull one card from the shoe and fly it into a hand.
function bjDraw(hand, handEl, faceUp) {
  // A hand that runs from one deck into the next could meet a second copy of
  // a card already on the table; skip past it (it stays in the shoe for later).
  const onTable = new Set(bjDealer.concat(bjPlayer, hdBoard).map((x) => x.id));
  let i = bjDeck.length - 1;
  while (i >= 0 && onTable.has(bjDeck[i].id)) i--;
  if (i < 0) return null;
  const [c] = bjDeck.splice(i, 1);
  c.up = faceUp;
  hand.push(c);
  const el = document.createElement('span');
  el.className = 'bj-card is-down';
  el.dataset.suit = c.suit;
  el.innerHTML = bjCardHTML(c);
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', faceUp ? `${c.name}, ${c.rank} of ${BJ_SUITS[c.suit].name}` : 'Face-down card');
  c.el = el;
  handEl.appendChild(el);
  if (handEl !== bjBoardHand) bjFitHand(handEl);
  bjRenderShoe();
  bjLeftEl.textContent = bjDeck.length;

  const from = bjShoe.getBoundingClientRect();
  const to = el.getBoundingClientRect();
  el.animate([
    { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) rotate(-9deg) scale(0.92)` },
    { transform: 'translate(0, 0) rotate(0deg) scale(1)' },
  ], { duration: BJ_DEAL_MS, easing: 'cubic-bezier(0.2, 0.72, 0.28, 1.04)' });
  if (faceUp) {
    setTimeout(() => el.classList.remove('is-down'), BJ_DEAL_MS * 0.55);
    bjSee(c);
  }
  playSwitchSfx();
  return c;
}

function bjTurnUp(c) {
  if (!c || c.up) return;
  c.up = true;
  c.el.classList.remove('is-down');
  c.el.setAttribute('aria-label', `${c.name}, ${c.rank} of ${BJ_SUITS[c.suit].name}`);
  bjSee(c);
}

function bjStartDeal() {
  if (bjBetting() && bjMatchOver()) bjRematch();
  else if (bjMode === 'holdem') hdDealRound();
  else bjDealRound();
}

function bjDealRound() {
  if (!bjBoard || bjBoard.hidden || !bjBetting()) return;
  if (!bjPileTotal()) { bjSetStatus('Place a bet first'); return; }
  if (!bjEnough()) { bjSetStatus('Shuffle to keep playing'); bjRenderControls(); return; }
  bjClearTimers();
  bjStake = bjPileTotal();
  bjLastBet = bjStake;
  bjSpot.classList.add('is-live');
  bjClearHands();
  bjPhase = 'dealing';
  bjRenderTotals();
  bjRenderControls();
  bjSetStatus('Dealing');

  const order = [
    () => bjDraw(bjPlayer, bjPlayerHand, true),
    () => bjDraw(bjDealer, bjDealerHand, true),
    () => bjDraw(bjPlayer, bjPlayerHand, true),
    () => bjDraw(bjDealer, bjDealerHand, false),
  ];
  order.forEach((step, i) => bjLater(() => { step(); bjRenderTotals(); }, i * BJ_STEP_MS));
  bjLater(bjAfterDeal, order.length * BJ_STEP_MS + BJ_DEAL_MS * 0.6);
}

function bjAfterDeal() {
  const up = bjDealer[0];
  // The dealer peeks under a ten or an ace before anyone plays.
  if (up.value >= 10 && bjNatural(bjDealer)) {
    bjTurnUp(bjDealer[1]);
    bjRenderTotals();
    if (bjNatural(bjPlayer)) bjFinish('push', 'Both have blackjack');
    else bjFinish('lose', 'Dealer has blackjack');
    return;
  }
  if (bjNatural(bjPlayer)) {
    bjTurnUp(bjDealer[1]);
    bjRenderTotals();
    bjFinish('blackjack', 'Blackjack');
    return;
  }
  bjPhase = 'player';
  bjRenderTotals();
  bjRenderControls();
  bjSetStatus('Hit or stand?');
}

function bjHitMe() {
  if (bjMode !== 'bj' || bjPhase !== 'player' || !bjDeck.length) return;
  playClickSfx();
  bjDraw(bjPlayer, bjPlayerHand, true);
  bjRenderTotals();
  bjRenderControls();
  const t = bjTotal(bjPlayer);
  if (t > 21) {
    bjPhase = 'dealing';
    bjRenderControls();
    bjLater(() => {
      bjTurnUp(bjDealer[1]);
      bjRenderTotals();
      bjFinish('lose', 'Bust');
    }, BJ_DEAL_MS + 120);
  } else if (t === 21 || !bjDeck.length) {
    bjStandUp();
  }
}

function bjDoubleDown() {
  if (bjMode !== 'bj' || bjDouble.disabled) return;
  playClickSfx();
  bjBank -= bjStake;
  const extra = bjChipsFor(bjStake);
  bjPile.push(...extra);
  extra.forEach((v, i) => bjFlyChip(v, bjRackChip(v), bjSpot, { delay: i * 60 }));
  bjStake *= 2;
  bjRenderChips();
  bjDraw(bjPlayer, bjPlayerHand, true);
  bjRenderTotals();
  bjPhase = 'dealing';
  bjRenderControls();
  if (bjTotal(bjPlayer) > 21) {
    bjLater(() => { bjTurnUp(bjDealer[1]); bjRenderTotals(); bjFinish('lose', 'Bust'); }, BJ_DEAL_MS + 120);
  } else {
    bjLater(() => { bjPhase = 'player'; bjStandUp(); }, BJ_DEAL_MS + 120);
  }
}

function bjStandUp() {
  if (bjMode !== 'bj' || bjPhase !== 'player') return;
  bjPhase = 'dealer';
  bjRenderTotals();
  bjRenderControls();
  bjSetStatus('Dealer plays');
  bjLater(() => { bjTurnUp(bjDealer[1]); bjRenderTotals(); bjDealerStep(); }, 320);
}

function bjDealerStep() {
  if (bjTotal(bjDealer) < BJ_DEALER_STANDS && bjDeck.length) {
    bjLater(() => {
      bjDraw(bjDealer, bjDealerHand, true);
      bjRenderTotals();
      bjDealerStep();
    }, 560);
    return;
  }
  bjLater(() => {
    const me = bjTotal(bjPlayer), them = bjTotal(bjDealer);
    if (them > 21) bjFinish('win', 'Dealer busts');
    else if (me > them) bjFinish('win', 'You win');
    else if (me < them) bjFinish('lose', 'House wins');
    else bjFinish('push', 'Push');
  }, 420);
}

// The money changing hands pops up under the bank.
function bjDelta(text, tone, wrap = bjBankWrap) {
  const d = document.createElement('span');
  d.className = `bj-delta bj-delta--${tone}`;
  d.textContent = text;
  wrap.appendChild(d);
  setTimeout(() => d.remove(), 1600);
}

// The house's side of a hand, shown under its bank.
function bjHouseDelta(n) {
  if (!n) return;
  bjDelta(n > 0 ? `+${bjMoney(n)}` : `−${bjMoney(-n)}`, n > 0 ? 'win' : 'lose', bjHouseWrap);
}

function bjPaidPulse() {
  bjBankWrap.classList.remove('is-paid');
  void bjBankWrap.offsetWidth;
  bjBankWrap.classList.add('is-paid');
}

function bjRecordResult(result) {
  if (result === 'win' || result === 'blackjack') bjScore.w++;
  else if (result === 'lose') bjScore.l++;
  else bjScore.p++;
}

function bjFinish(result, text) {
  bjPhase = 'done';
  // However the hand ends, the dealer's cards finish face up.
  bjDealer.forEach(bjTurnUp);
  bjRenderTotals();
  const won = result === 'win' || result === 'blackjack';
  bjRecordResult(result);

  const stake = bjStake;
  const chips = bjPile.slice();
  bjPile = [];
  bjStake = 0;
  bjSpot.classList.remove('is-live');
  if (result === 'lose') {
    bjHouse += stake;
    chips.forEach((v, i) => bjFlyChip(v, bjSpot, bjHouseWrap, { fade: true, delay: i * 45 }));
    bjDelta(`−${bjMoney(stake)}`, 'lose');
    bjHouseDelta(stake);
  } else {
    // The house can only pay what it has left.
    const profit = Math.min(bjHouse, result === 'blackjack' ? stake * 1.5 : result === 'win' ? stake : 0);
    bjHouse -= profit;
    bjHouseDelta(-profit);
    bjBank += stake + profit;
    const pay = won ? chips.concat(chips) : chips;
    pay.forEach((v, i) => bjFlyChip(v, bjSpot, bjBankWrap, { delay: i * 45 }));
    bjDelta(won ? `+${bjMoney(profit)}` : 'Bet back', won ? 'win' : 'push');
    bjPaidPulse();
  }
  const tone = won ? 'win' : result;
  bjSetStatus(text, tone);
  bjCutIn(result === 'blackjack' ? 'Blackjack!' : won ? 'You win' : result === 'lose' ? 'House wins' : 'Push', tone);
  bjRenderTotals();
  bjRenderChips();
  bjRenderControls();
  bjLater(() => {
    if (!bjAnnounceMatch() && !bjEnough()) bjSetStatus('Shuffle to keep playing');
  }, 1400);
  bjLater(bjRebet, 900);
  bjDeal.focus({ preventScroll: true });
}

// ---------- Texas Hold'em, heads up against the house ----------
// Both sides ante, then four betting rounds. You act first on every street.
// Nobody can bet more than the other side has left to call with.

let hdBoard = [];
let hdPot = 0;
let hdStreet = 0;        // 0 preflop, 1 flop, 2 turn, 3 river
let hdIn = { me: 0, house: 0 };  // put in on this street
let hdMine = 0;          // everything you have put in this hand
let hdTheirs = 0;        // everything the house has put in this hand
let hdLevel = 'medium';  // easy | medium | hard
let hdRaises = 0;
let hdActed = false;     // you have acted on this street
let hdStaged = [];       // chips picked from the rack for your next bet

const HD_HANDS = ['High card', 'Pair', 'Two pair', 'Three of a kind', 'Straight', 'Flush',
  'Full house', 'Four of a kind', 'Straight flush', 'Five of a kind'];
const HD_PLURAL = { 14: 'Aces', 13: 'Kings', 12: 'Queens', 11: 'Jacks', 10: 'Tens', 9: 'Nines', 8: 'Eights',
  7: 'Sevens', 6: 'Sixes', 5: 'Fives', 4: 'Fours', 3: 'Threes', 2: 'Deuces' };

// Score five cards. The shoe never puts two copies of a card in one hand,
// so five of a kind can't come up; its rank is kept only as a safe ceiling.
function hdEval5(cards) {
  const vals = cards.map((c) => c.hi).sort((a, b) => b - a);
  const flush = cards.every((c) => c.suit === cards[0].suit);
  const counts = {};
  vals.forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
  const groups = Object.entries(counts).map(([v, n]) => [n, +v]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const distinct = groups.length === 5;
  let straight = 0;
  if (distinct && vals[0] - vals[4] === 4) straight = vals[0];
  else if (distinct && vals.join() === '14,5,4,3,2') straight = 5;
  const g = groups.map((x) => x[1]);
  let rank;
  if (groups[0][0] === 5) rank = [9, g[0]];
  else if (flush && straight) rank = [8, straight];
  else if (groups[0][0] === 4) rank = [7, ...g];
  else if (groups[0][0] === 3 && groups[1][0] === 2) rank = [6, ...g];
  else if (flush) rank = [5, ...vals];
  else if (straight) rank = [4, straight];
  else if (groups[0][0] === 3) rank = [3, ...g];
  else if (groups[0][0] === 2 && groups[1][0] === 2) rank = [2, ...g];
  else if (groups[0][0] === 2) rank = [1, ...g];
  else rank = [0, ...vals];
  let score = 0;
  for (let i = 0; i < 6; i++) score = score * 15 + (rank[i] || 0);
  return { score, cat: rank[0], top: rank[1], cards };
}

const HD_COMBOS = {};
function hdCombos(n) {
  if (HD_COMBOS[n]) return HD_COMBOS[n];
  const out = [];
  const pick = (start, acc) => {
    if (acc.length === 5) { out.push(acc.slice()); return; }
    for (let i = start; i < n; i++) { acc.push(i); pick(i + 1, acc); acc.pop(); }
  };
  pick(0, []);
  return (HD_COMBOS[n] = out);
}

// Best five out of five to seven cards.
function hdBest(cards) {
  let best = null;
  hdCombos(cards.length).forEach((idx) => {
    const r = hdEval5(idx.map((i) => cards[i]));
    if (!best || r.score > best.score) best = r;
  });
  return best;
}

// The same number hdBest(cards).score gives, read straight off the rank and
// suit counts instead of trying every five-card pick. The house's simulations
// call this hundreds of times per decision.
const hdPack = (r) => { let s = 0; for (let i = 0; i < 6; i++) s = s * 15 + (r[i] || 0); return s; };
function hdStraight(has) {
  for (let hi = 14; hi >= 5; hi--) {
    let v = hi;
    while (v > hi - 5 && has[v === 1 ? 14 : v]) v--;
    if (v === hi - 5) return hi;
  }
  return 0;
}
function hdScore(cards) {
  const cnt = new Array(15).fill(0);
  const suits = { s: [], c: [], h: [], d: [] };
  for (const c of cards) { cnt[c.hi]++; suits[c.suit].push(c.hi); }
  let five = 0, quad = 0;
  const trips = [], pairs = [], ranks = [];
  for (let v = 14; v >= 2; v--) {
    const n = cnt[v];
    if (n >= 5 && !five) five = v;
    if (n >= 4 && !quad) quad = v;
    if (n >= 3) trips.push(v);
    if (n >= 2) pairs.push(v);
    if (n) ranks.push(v);
  }
  if (five) return hdPack([9, five]);
  const fl = Object.values(suits).find((s) => s.length >= 5);
  if (fl) {
    const has = new Array(15).fill(false);
    fl.forEach((v) => { has[v] = true; });
    const sf = hdStraight(has);
    if (sf) return hdPack([8, sf]);
  }
  const other = (...not) => ranks.filter((v) => !not.includes(v));
  if (quad) return hdPack([7, quad, other(quad)[0]]);
  if (trips.length) {
    const pair = pairs.find((v) => v !== trips[0]);
    if (pair) return hdPack([6, trips[0], pair]);
  }
  if (fl) return hdPack([5, ...fl.sort((a, b) => b - a).slice(0, 5)]);
  const st = hdStraight(cnt.map((n) => n > 0));
  if (st) return hdPack([4, st]);
  if (trips.length) return hdPack([3, trips[0], ...other(trips[0]).slice(0, 2)]);
  if (pairs.length >= 2) return hdPack([2, pairs[0], pairs[1], other(pairs[0], pairs[1])[0]]);
  if (pairs.length) return hdPack([1, pairs[0], ...other(pairs[0]).slice(0, 3)]);
  return hdPack([0, ...ranks.slice(0, 5)]);
}

function hdHandName(r) {
  if (r.cat === 8 && r.top === 14) return 'Royal flush';
  if (r.cat === 1) return `Pair of ${HD_PLURAL[r.top]}`;
  if (r.cat === 3) return `Three ${HD_PLURAL[r.top]}`;
  if (r.cat === 6) return `${HD_PLURAL[r.top]} full`;
  if (r.cat === 7) return `Four ${HD_PLURAL[r.top]}`;
  if (r.cat === 9) return `Five ${HD_PLURAL[r.top]}`;
  return HD_HANDS[r.cat];
}

// What you hold right now, for the label above your cards.
function hdReadHand(hole) {
  const cards = hole.concat(hdBoard);
  if (cards.length >= 5) return hdHandName(hdBest(cards));
  if (hole.length === 2 && hole[0].hi === hole[1].hi) return `Pair of ${HD_PLURAL[hole[0].hi]}`;
  return '';
}

// The house's chance of winning, from what it can see: its own cards and the board.
function hdEquity(trials = 260) {
  // A hand never holds two of the same card, so the unknowns are one copy each.
  const known = new Set(bjDealer.concat(hdBoard).map((c) => c.id));
  const pool = BJ_FULL_DECK.filter((c) => !known.has(c.id));
  const need = 2 + (5 - hdBoard.length);
  let score = 0;
  for (let t = 0; t < trials; t++) {
    // Partial Fisher-Yates: only the cards this run needs.
    for (let i = 0; i < need; i++) {
      const j = i + ((Math.random() * (pool.length - i)) | 0);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const board = hdBoard.concat(pool.slice(2, need));
    const them = hdScore(bjDealer.concat(board));
    const you = hdScore(pool.slice(0, 2).concat(board));
    score += them > you ? 1 : them === you ? 0.5 : 0;
  }
  return score / trials;
}

const hdStagedTotal = () => hdStaged.reduce((a, v) => a + v, 0);
const hdOwe = () => Math.max(0, hdIn.house - hdIn.me);
const hdRound5 = (n) => Math.max(5, Math.round(n / 5) * 5);
// The most you can put in now: your bank, or what you owe plus all the house has left.
const hdMaxBet = () => Math.min(bjBank, hdOwe() + bjHouse);
// Why the next hand can't be dealt, when a side is short of the ante but the
// match goes on (its money is riding on the paused blackjack table).
const hdShort = () => (bjBank < HD_ANTE ? 'Need $10 to ante'
  : bjHouse < HD_ANTE ? 'House can\'t cover the ante' : '');

function hdRenderTotals() {
  bjPlayerTotal.textContent = bjPlayer.length ? hdReadHand(bjPlayer) : '';
  bjDealerTotal.textContent = bjDealer.length && bjDealer.every((c) => c.up) ? hdReadHand(bjDealer) : '';
}

function hdRenderPot() {
  const chips = bjChipsFor(hdPot).slice(-14);
  bjStack.innerHTML = chips.map((v, i) =>
    `<span class="bj-chip bj-chip--flat" data-v="${v}" style="--i:${i}"><span>${v}</span></span>`).join('');
  bjBetEl.textContent = bjMoney(hdPot);
  bjRenderBanks();
}

function hdRenderControls() {
  const mine = bjPhase === 'player';
  const owe = hdOwe();
  const staged = hdStagedTotal();
  const callLabel = owe ? `Call ${bjMoney(Math.min(owe, bjBank))}` : 'Check';
  hdCall.querySelector('span').textContent = callLabel;
  hdCall.disabled = !mine;
  // A bet must at least cover what you owe plus the size of the last raise ($10 minimum).
  const minRaise = owe + Math.max(HD_ANTE, owe);
  const max = hdMaxBet();
  const canRaise = mine && hdRaises < HD_MAX_RAISES && max > owe;
  const word = owe ? 'Raise' : 'Bet';
  hdRaise.querySelector('span').textContent = staged ? `${word} ${bjMoney(staged)}` : word;
  hdRaise.disabled = !canRaise || !staged || (staged < minRaise && staged < max);
  hdAllIn.disabled = !mine || !bjBank;
  hdFold.disabled = !mine;
  bjDeal.disabled = !bjBetting() || !bjEnough() || !!hdShort();
  bjRack.querySelectorAll('.bj-chip').forEach((chip) => {
    chip.disabled = !canRaise || staged + +chip.dataset.v > max;
  });
  bjSpot.disabled = true;
}

// Chips from the rack size your next bet; they only hit the pot when you press Bet.
function hdAddChip(v, chipEl) {
  if (bjPhase !== 'player' || hdStagedTotal() + v > hdMaxBet()) return;
  hdStaged.push(v);
  playSwitchSfx();
  const chip = chipEl || bjRackChip(v);
  chip.animate([{ translate: '0 0' }, { translate: `${chip.offsetWidth * 0.25}px 0` }, { translate: '0 0' }],
    { duration: 220, easing: 'cubic-bezier(0.3, 0.7, 0.3, 1)' });
  hdRenderPot();
  hdRenderControls();
}

function hdClearRaise() {
  if (!hdStaged.length) return;
  hdStaged = [];
  hdRenderPot();
  hdRenderControls();
}

// Move money from a side into the pot, with chips flying the right way.
function hdPutIn(who, amount) {
  if (amount <= 0) return;
  hdPot += amount;
  hdIn[who] += amount;
  const from = who === 'me' ? bjBankWrap : bjHouseWrap;
  if (who === 'me') { hdMine += amount; bjBank -= amount; } else { hdTheirs += amount; bjHouse -= amount; }
  bjChipsFor(amount).slice(-6).forEach((v, i) =>
    bjFlyChip(v, who === 'me' && bjRackChip(v) ? bjRackChip(v) : from, bjSpot, { delay: i * 50 }));
  bjLater(hdRenderPot, 460);
  bjRenderBanks();
}

function hdDealRound() {
  if (!bjBoard || bjBoard.hidden || !bjBetting()) return;
  if (!bjEnough()) { bjSetStatus('Shuffle to keep playing'); bjRenderControls(); return; }
  if (bjMatchOver()) { bjAnnounceMatch(); return; }
  if (hdShort()) { bjSetStatus(hdShort()); bjRenderControls(); return; }
  bjClearTimers();
  bjClearHands();
  hdPot = 0;
  hdMine = 0;
  hdTheirs = 0;
  hdStaged = [];
  hdStreet = 0;
  hdIn = { me: 0, house: 0 };
  bjPhase = 'dealing';
  bjSpot.classList.add('is-live');
  hdPutIn('me', HD_ANTE);
  hdPutIn('house', HD_ANTE);
  hdRenderTotals();
  bjRenderControls();
  bjSetStatus('Antes in');

  const order = [
    () => bjDraw(bjPlayer, bjPlayerHand, true),
    () => bjDraw(bjDealer, bjDealerHand, false),
    () => bjDraw(bjPlayer, bjPlayerHand, true),
    () => bjDraw(bjDealer, bjDealerHand, false),
  ];
  order.forEach((step, i) => bjLater(() => { step(); hdRenderTotals(); }, 300 + i * BJ_STEP_MS));
  bjLater(hdStartStreet, 300 + order.length * BJ_STEP_MS + BJ_DEAL_MS * 0.6);
}

function hdStartStreet() {
  hdIn = { me: 0, house: 0 };
  hdRaises = 0;
  hdActed = false;
  hdStaged = [];
  // Nothing left to bet with: run the rest of the board out.
  if (!bjBank || !bjHouse) { bjPhase = 'dealing'; bjRenderControls(); bjLater(hdNextStreet, 700); return; }
  bjPhase = 'player';
  hdRenderPot();
  bjRenderControls();
  bjSetStatus(['Check or bet?', 'The flop', 'The turn', 'The river'][hdStreet]);
}

function hdCallOrCheck() {
  if (bjMode !== 'holdem' || bjPhase !== 'player') return;
  playClickSfx();
  const owe = Math.min(hdOwe(), bjBank);
  hdStaged = [];
  hdActed = true;
  if (owe) {
    hdPutIn('me', owe);
    bjSetStatus(`You call ${bjMoney(owe)}`);
    hdCloseStreet();
  } else {
    bjSetStatus('You check');
    hdHouseTurn();
  }
}

function hdBet(amount) {
  if (bjMode !== 'holdem' || bjPhase !== 'player') return;
  const owe = hdOwe();
  amount = Math.min(amount, hdMaxBet());
  if (amount <= owe) { hdCallOrCheck(); return; }
  playClickSfx();
  hdStaged = [];
  hdActed = true;
  hdRaises++;
  hdPutIn('me', amount);
  bjSetStatus(!bjBank ? 'All in' : `You ${owe ? 'raise' : 'bet'} ${bjMoney(amount - owe)}`);
  hdHouseTurn();
}

function hdBetStaged() {
  if (hdRaise.disabled) return;
  hdBet(hdStagedTotal());
}

function hdFoldHand() {
  if (bjMode !== 'holdem' || bjPhase !== 'player') return;
  playClickSfx();
  hdFinish('lose', 'You fold');
}

function hdHouseTurn() {
  bjPhase = 'dealer';
  bjRenderControls();
  bjLater(() => {
    const lv = HD_LEVELS[hdLevel];
    const owe = Math.min(hdIn.me - hdIn.house, bjHouse);
    // Its read on the hand: noisy for the easy house, wary of big bets for the hard one.
    let eq = hdEquity(lv.trials) + (Math.random() * 2 - 1) * lv.noise;
    if (owe > 0) {
      const size = owe / Math.max(1, hdPot - owe);
      eq -= lv.respect * (size <= 1 ? size : 1 / size);
    }
    eq = Math.min(1, Math.max(0, eq));
    const roll = Math.random();
    if (owe > 0) {
      const room = Math.min(bjBank, bjHouse - owe);   // the most it can raise, and you can still call
      const odds = owe / (hdPot + owe);
      if (eq > lv.raiseAt && room > 0 && hdRaises < HD_MAX_RAISES && roll < lv.raiseFreq) {
        const raise = Math.min(room, hdRound5(Math.max(owe * 2, hdPot * lv.sizes[1])));
        hdPutIn('house', owe + raise);
        hdRaises++;
        bjSetStatus(`House raises ${bjMoney(raise)}`);
        bjPhase = 'player';
        bjRenderControls();
      } else if (eq + lv.callSlack >= odds) {
        hdPutIn('house', owe);
        bjSetStatus('House calls');
        hdCloseStreet();
      } else {
        hdFinish('win', 'House folds');
      }
      return;
    }
    // You checked: the house bets its good hands and bluffs now and then.
    // A hard house sometimes checks a monster early to let you catch up.
    const room = Math.min(bjBank, bjHouse);
    const trap = eq > 0.85 && hdStreet < 2 && Math.random() < lv.slowplay;
    const bluff = lv.bluff * (hdLevel === 'hard' && hdStreet === 3 ? 1.5 : 1);
    const bets = room > 0 && !trap && ((eq > lv.valueAt && roll < lv.valueFreq)
      || (eq > lv.probeAt && roll < lv.probeFreq) || (eq < 0.3 && roll < bluff));
    if (bets) {
      const size = Math.min(room, hdRound5(hdPot * (eq > 0.75 ? lv.sizes[1] : lv.sizes[0])));
      hdPutIn('house', size);
      hdRaises++;
      bjSetStatus(`House bets ${bjMoney(size)}`);
      bjPhase = 'player';
      bjRenderControls();
    } else {
      bjSetStatus('House checks');
      hdCloseStreet();
    }
  }, 650 + Math.random() * 350);
}

function hdCloseStreet() {
  bjPhase = 'dealing';
  bjRenderControls();
  bjLater(hdNextStreet, 700);
}

function hdNextStreet() {
  hdStreet++;
  if (hdStreet > 3) { hdShowdown(); return; }
  const n = hdStreet === 1 ? 3 : 1;
  for (let i = 0; i < n; i++) {
    bjLater(() => { bjDraw(hdBoard, bjBoardHand, true); hdRenderTotals(); }, i * BJ_STEP_MS);
  }
  bjLater(hdStartStreet, n * BJ_STEP_MS + BJ_DEAL_MS * 0.6);
}

function hdShowdown() {
  bjDealer.forEach(bjTurnUp);
  hdRenderTotals();
  const me = hdBest(bjPlayer.concat(hdBoard));
  const them = hdBest(bjDealer.concat(hdBoard));
  const winner = me.score > them.score ? me : them;
  // Light up the five cards that won; a split lights both.
  bjBoard.classList.add('is-showdown');
  const lit = new Set((me.score === them.score ? me.cards.concat(them.cards) : winner.cards).map((c) => c.uid));
  bjPlayer.concat(bjDealer, hdBoard).forEach((c) => c.el.classList.toggle('is-best', lit.has(c.uid)));
  bjLater(() => {
    if (me.score > them.score) hdFinish('win', `${hdHandName(me)} wins`);
    else if (me.score < them.score) hdFinish('lose', `House has ${hdHandName(them).toLowerCase()}`);
    else hdFinish('push', 'Split pot');
  }, 650);
}

function hdFinish(result, text) {
  bjPhase = 'done';
  // Folds included, the house shows what it had once the hand is over.
  bjDealer.forEach(bjTurnUp);
  hdRenderTotals();
  bjRecordResult(result);
  // Anything one side put in that the other never matched goes straight back.
  const matched = Math.min(hdMine, hdTheirs);
  bjBank += hdMine - matched;
  bjHouse += hdTheirs - matched;
  const pot = matched * 2;
  const back = result === 'win' ? pot : result === 'push' ? matched : 0;
  bjHouse += pot - back;
  const chips = bjChipsFor(pot).slice(-10);
  if (result === 'lose') {
    chips.forEach((v, i) => bjFlyChip(v, bjSpot, bjHouseWrap, { fade: true, delay: i * 45 }));
    bjDelta(`−${bjMoney(matched)}`, 'lose');
    bjHouseDelta(matched);
  } else {
    bjBank += back;
    chips.forEach((v, i) => bjFlyChip(v, bjSpot, bjBankWrap, { delay: i * 45 }));
    bjDelta(result === 'win' ? `+${bjMoney(matched)}` : 'Pot split', result === 'win' ? 'win' : 'push');
    if (result === 'win') bjHouseDelta(-matched);
    bjPaidPulse();
  }
  hdPot = 0;
  hdMine = 0;
  hdTheirs = 0;
  hdStaged = [];
  hdIn = { me: 0, house: 0 };
  bjSpot.classList.remove('is-live');
  const tone = result === 'win' ? 'win' : result;
  bjSetStatus(text, tone);
  bjCutIn(result === 'win' ? 'Take the pot' : result === 'lose' ? 'House takes it' : 'Split pot', tone);
  hdRenderTotals();
  hdRenderPot();
  bjRenderControls();
  bjLater(() => {
    if (bjAnnounceMatch()) return;
    if (hdShort()) bjSetStatus(hdShort());
    else if (!bjEnough()) bjSetStatus('Shuffle to keep playing');
  }, 1400);
  bjDeal.focus({ preventScroll: true });
}

// ---------- Switching tables ----------

// Everything on the table goes in the stash: shoe, count, record, the hand
// in progress with its cards, chips and pot, and what the table last said.
function bjPackTable() {
  return {
    deck: bjDeck, seen: bjSeen, running: bjRunning, score: bjScore,
    phase: bjPhase, dealer: bjDealer, player: bjPlayer, board: hdBoard,
    pile: bjPile, stake: bjStake, lastBet: bjLastBet,
    hd: { pot: hdPot, street: hdStreet, in: hdIn, mine: hdMine, theirs: hdTheirs, raises: hdRaises, acted: hdActed },
    nodes: {
      dealer: [...bjDealerHand.children],
      player: [...bjPlayerHand.children],
      board: [...bjBoardHand.children],
    },
    status: { html: bjStatus.innerHTML, cls: bjStatus.className },
    live: bjSpot.classList.contains('is-live'),
    showdown: bjBoard.classList.contains('is-showdown'),
  };
}

function bjUnpackTable(s) {
  bjClearHands();
  ({ deck: bjDeck, seen: bjSeen, running: bjRunning, score: bjScore, phase: bjPhase,
    pile: bjPile, stake: bjStake, lastBet: bjLastBet } = s);
  ({ pot: hdPot, street: hdStreet, in: hdIn, mine: hdMine, theirs: hdTheirs, raises: hdRaises, acted: hdActed } = s.hd);
  bjDealer = s.dealer;
  bjPlayer = s.player;
  hdBoard = s.board;
  if (s.nodes) {
    bjDealerHand.append(...s.nodes.dealer);
    bjPlayerHand.append(...s.nodes.player);
    bjBoardHand.append(...s.nodes.board);
  }
  bjSpot.classList.toggle('is-live', s.live);
  bjBoard.classList.toggle('is-showdown', s.showdown);
}

// Switching tables leaves the hand exactly where it was; coming back picks it up.
// Money is shared, so chips riding on the paused hand stay out of the bank.
function bjSetMode(mode) {
  if (mode === bjMode || !BJ_GAMES[mode]) return;
  // Cards in the air land first, then the switch goes through.
  if (bjPhase === 'dealing' || bjPhase === 'dealer') {
    bjPendingMode = mode;
    bjBoard.querySelector(`.bj-mode[data-mode="${mode}"]`).classList.add('is-pending');
    return;
  }
  bjPendingMode = null;
  bjBoard.querySelectorAll('.bj-mode').forEach((b) => b.classList.remove('is-pending'));
  playClickSfx();
  bjClearTimers();
  bjCutin.classList.remove('is-on');
  hdStaged = [];
  bjStash[bjMode] = bjPackTable();
  bjMode = mode;
  bjBoard.dataset.mode = mode;
  const foot = bjBoard.querySelector('.bj-foot');
  foot.classList.remove('is-swapping');
  void foot.offsetWidth;
  foot.classList.add('is-swapping');
  const saved = bjStash[mode];
  if (saved) {
    bjUnpackTable(saved);
  } else {
    bjClearHands();
    bjScore = { w: 0, l: 0, p: 0 };
    bjPhase = 'idle';
    bjPile = [];
    bjStake = 0;
    bjSpot.classList.remove('is-live');
    bjNewShoe();
  }
  bjBoard.querySelectorAll('.bj-mode').forEach((b) => {
    const on = b.dataset.mode === mode;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-selected', String(on));
  });
  bjDealerName.textContent = BJ_GAMES[mode].dealer;
  bjBetLabel.textContent = mode === 'holdem' ? 'Pot' : 'Bet';
  bjSpot.setAttribute('aria-label', mode === 'holdem' ? 'Pot' : 'Your bet. Click to take a chip back');
  bjRack.setAttribute('aria-label', mode === 'holdem'
    ? 'Chips. Click to size your bet, then press Bet' : 'Chips. Click one to add it to your bet');
  bjLeftEl.textContent = bjDeck.length;
  bjRenderShoe();
  bjRenderCount();
  bjRenderTotals();
  bjRenderChips();
  bjRenderControls();
  [bjDealerHand, bjPlayerHand].forEach(bjFitHand);
  if (saved && saved.status) {
    bjStatus.innerHTML = saved.status.html;
    bjStatus.className = saved.status.cls;
  } else {
    bjSetStatus(!bjEnough() ? 'Shuffle to keep playing' : mode === 'holdem' ? 'Deal when ready' : 'Place your bet');
  }
  if (bjAnnounceMatch()) return;
  if (mode === 'bj') bjLater(bjRebet, 300);
  else if (bjBetting()) {
    // The money may have come back since the table was put away.
    const said = bjStatus.querySelector('.bj-sr')?.textContent || '';
    if (hdShort()) bjSetStatus(hdShort());
    else if (/ante$/.test(said)) bjSetStatus('Deal when ready');
  }
}

function resetHobbies() {
  if (!bjBoard) return;
  // A hand waiting on you is left as it was. One caught mid-deal is folded
  // back to the bet; its cards stay used.
  if (bjPhase === 'dealing' || bjPhase === 'dealer') {
    bjClearTimers();
    bjPhase = 'idle';
    if (bjMode === 'holdem') {
      bjBank += hdMine;
      bjHouse += hdTheirs;
      hdPot = 0;
      hdMine = 0;
      hdTheirs = 0;
      hdStaged = [];
      hdIn = { me: 0, house: 0 };
    } else {
      bjBank += bjPileTotal() + (bjPile.length ? 0 : bjStake);
    }
    bjPile = [];
    bjStake = 0;
    bjClearHands();
    bjSpot.classList.remove('is-live');
    bjSetStatus(!bjEnough() ? 'Shuffle to keep playing' : bjMode === 'holdem' ? 'Deal when ready' : 'Place your bet');
  }
  bjCutin.classList.remove('is-on');
  if (!bjStatus.querySelector('.rn-line')) bjSetStatus(bjMode === 'holdem' ? 'Deal when ready' : 'Place your bet');
  bjRenderShoe();
  bjRenderCount();
  bjRenderTotals();
  bjRenderChips();
  bjRenderControls();
  requestAnimationFrame(() => [bjDealerHand, bjPlayerHand].forEach(bjFitHand));
  // Let the board finish dropping in, then slide the usual bet onto the spot.
  bjLater(bjRebet, 700);
}

function bjToggleCount() {
  const open = bjCountBody.hidden;
  bjCountBody.hidden = !open;
  bjCountToggle.setAttribute('aria-expanded', String(open));
  bjCountToggle.querySelector('span').textContent = open ? 'Hide count' : 'Show count';
}

function blackjackKey(e) {
  const k = e.key.toLowerCase();
  const holdem = bjMode === 'holdem';
  if (k === 'r') bjShuffleUp();
  else if (k === 'k') bjToggleCount();
  else if (k >= '1' && k <= '4') bjAddChip([5, 25, 100, 500][k - 1]);
  else if (holdem && k === 'c') hdCallOrCheck();
  else if (holdem && k === 'b') hdBetStaged();
  else if (holdem && k === 'a') { if (!hdAllIn.disabled) hdBet(bjBank); }
  else if (holdem && k === 'f') hdFoldHand();
  else if (holdem && (k === 'x' || k === 'backspace')) hdClearRaise();
  else if (!holdem && k === 'h') bjHitMe();
  else if (!holdem && k === 's') { if (bjPhase === 'player') { playClickSfx(); bjStandUp(); } }
  else if (!holdem && k === 'x') bjDoubleDown();
  else if (!holdem && k === 'c') bjClearBet();
  else if (k === 'enter' || k === ' ' || k === 'd') {
    // Enter/Space on a focused button already clicks it.
    if (k !== 'd' && document.activeElement && document.activeElement.closest('.bj-table button')) return;
    if (bjPhase === 'player') { if (holdem) hdCallOrCheck(); else bjHitMe(); }
    else if (bjBetting()) { playClickSfx(); bjStartDeal(); }
  } else return;
  e.preventDefault();
}

if (bjBoard) {
  bjBuildTally();
  bjNewShoe();
  bjHit.addEventListener('click', bjHitMe);
  bjStand.addEventListener('click', () => { playClickSfx(); bjStandUp(); });
  bjDouble.addEventListener('click', bjDoubleDown);
  bjDeal.addEventListener('click', () => { playClickSfx(); bjStartDeal(); });
  bjShoe.addEventListener('click', () => { if (bjBetting()) { playClickSfx(); bjStartDeal(); } });
  bjClear.addEventListener('click', () => { playClickSfx(); bjClearBet(); });
  hdCall.addEventListener('click', hdCallOrCheck);
  hdRaise.addEventListener('click', hdBetStaged);
  hdAllIn.addEventListener('click', () => hdBet(bjBank));
  hdFold.addEventListener('click', hdFoldHand);
  bjShuffleBtn.addEventListener('click', bjShuffleUp);
  bjSpot.addEventListener('click', bjTakeChip);
  bjRack.addEventListener('click', (e) => {
    const chip = e.target.closest('.bj-chip');
    if (chip && !chip.disabled) bjAddChip(+chip.dataset.v, chip);
  });
  bjBoard.querySelectorAll('.bj-mode').forEach((b) => b.addEventListener('click', () => bjSetMode(b.dataset.mode)));
  // The house's skill takes effect on its next decision.
  bjBoard.querySelectorAll('.hd-level').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.level === hdLevel) return;
    playClickSfx();
    hdLevel = b.dataset.level;
    bjBoard.querySelectorAll('.hd-level').forEach((o) => {
      o.classList.toggle('is-on', o === b);
      o.setAttribute('aria-checked', String(o === b));
    });
  }));
  bjCountToggle.addEventListener('click', bjToggleCount);
  bjCutin.addEventListener('animationend', () => bjCutin.classList.remove('is-on'));
  window.addEventListener('resize', () => [bjDealerHand, bjPlayerHand].forEach(bjFitHand));
  bjRenderChips();
  bjRenderControls();
}

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

// Branches never start or end on another line's corner (the rounded bend
// leaves the branch's cap poking out). `join` adds a point on the parent's
// straight track so the branch rides along it and peels off with its own
// matching curve; stations are only placed on `route`.
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
    join: [[150, 250], [1000, 250]],
    route: [[250, 250], [440, 440], [760, 440], [950, 250]],
  },
  {

    stops: 3, caps: 'none', tail: 105,
    join: [[300, 200], [1100, 300]],
    route: [[350, 150], [440, 60], [860, 60], [1050, 250]],
  },
  {

    stops: 2, caps: 'end', tail: 90,
    join: [[700, 200], null],
    route: [[750, 250], [900, 400], [1250, 400]],
  },
  {

    stops: 2, caps: 'end', tail: 70,
    join: [[1300, 350], null],
    route: [[1350, 350], [1440, 440], [1600, 440]],
  },
  {

    stops: 2, caps: 'none', tail: 80,
    route: [[500, 440], [500, 150]],
  },
];
const METRO_CORNER_R = 24;
const METRO_CAP = 46;
const METRO_TAIL = 48;
const PLACE_PHOTOS = [];
for (let i = 18; i <= 36; i++) PLACE_PHOTOS.push(`places_${i}`);

// Shown on the card when a station is clicked.
const PLACE_NOTES = {
  places_18: { title: 'Truckee, California', desc: 'Pines wrapped in thousands of string lights ring an open-air rink at the foot of the slopes. Snowmaking haze glows blue under the floodlights while skaters loop the ice.' },
  places_19: { title: 'Wailea, Hawaii', desc: 'Terraced infinity pools step down toward Mokapu Beach on Maui\'s sunny south shore. Palms frame a clear view across the channel to Kahoʻolawe and Molokini.' },
  places_20: { title: 'San Francisco, California', desc: 'A full moon rises behind a lattice of oak leaves as dusk settles over the city. A quiet moment between the fog banks rolling in off the Pacific.' },
  places_21: { title: 'Ithaca, New York', desc: 'Cornell\'s A.D. White Library rises in tiers of ornate cast-iron balconies inside Uris Library. Its gaslight-era chandeliers and 19th-century stacks hold the rare books Cornell\'s first president gave the university.' },
  places_22: { title: 'New York, New York', desc: 'College Walk cuts across Columbia\'s Morningside Heights campus between Broadway and Amsterdam Avenue. Rows of trees line the lawns in front of the McKim, Mead & White buildings.' },
  places_23: { title: 'New York, New York', desc: 'This Greenwich Village building is the hub of NYU\'s College of Arts and Science and its Bonomi Admissions Center. Violet NYU banners mark it a block from Washington Square Park.' },
  places_24: { title: 'Anaheim, California', desc: 'Fireworks burst over Tomorrowland with the snowy peak of the Matterhorn glowing to the right. The nightly show fills the sky above Anaheim\'s original Disney park.' },
  places_25: { title: 'Seoul, South Korea', desc: 'N Seoul Tower rises from the forested summit of Namsan Mountain in the heart of the city. At dusk the sky turns pink behind the glass towers below.' },
  places_26: { title: 'Tokyo, Japan', desc: 'A weeping cherry tree spills pink blossoms over a folding-fan sculpture in a high-rise hotel lobby. The city\'s night lights glitter through the floor-to-ceiling windows behind it.' },
  places_27: { title: 'San Francisco, California', desc: 'The steep drum bridge arches over a koi pond in the oldest public Japanese garden in the United States. It sits in Golden Gate Park, surrounded by pines, maples and a five-storey pagoda.' },
  places_28: { title: 'Tsim Sha Tsui, Hong Kong', desc: 'Curving wood balconies wrap the atrium of this art-filled mall on the Tsim Sha Tsui waterfront. A faceted glass sculpture glints beside the escalators beneath strings of lights.' },
  places_29: { title: 'Tokyo, Japan', desc: 'At teamLab\'s digital art museum, mirrored walls, floors and ceilings multiply glowing orbs into an endless field of light. Visitors wander through the installation as it shifts color around them.' },
  places_30: { title: 'Seoul, South Korea', desc: 'Neon signs for pubs, tapas bars and Korean barbecue crowd the alleys of Seoul\'s most international neighbourhood. On weekend nights the streets fill with people until the early hours.' },
  places_31: { title: 'San Francisco, California', desc: 'The white wood-and-glass Victorian greenhouse has stood in Golden Gate Park since 1879. Sunbathers, bikes and giant wooden letter blocks dot the lawn in front.' },
  places_32: { title: 'San Francisco, California', desc: 'A Van Ness Avenue institution since 1949, it carves English-style prime rib tableside from silver carts. Its engraved steak knives and old-school red booths haven\'t changed in decades.' },
  places_33: { title: 'New York, New York', desc: 'Cascades of purple wisteria drape over a café entrance on a brick-walled Manhattan block. Passers-by stop under the blooms for a photo before moving on.' },
  places_34: { title: 'Anaheim, California', desc: 'The Disneyland Railroad station greets guests at the park entrance above the Mickey floral display. Here it is dressed in banners for the park\'s 70th anniversary.' },
  places_35: { title: 'Seoul, South Korea', desc: 'A traditional Korean hanok, with curved tile roofs and timber lattice doors, sits half-hidden behind old trees. A wooden boardwalk leads through the greenery toward its gate.' },
  places_36: { title: 'Tsim Sha Tsui, Hong Kong', desc: 'Built in 1881 as the Marine Police Headquarters, this colonial complex in Tsim Sha Tsui is one of Hong Kong\'s oldest government buildings. Today its lit verandas house a hotel, shops and restaurants.' },
};

// Individual framing for the restored photos. Square compositions keep tall
// landmarks intact; a few landscape scenes get a gentle 4:3 crop.
const PLACE_IMAGES = {
  places_18: { ratio: '1', focus: '55% 62%', zoom: 1.15, alt: 'Illuminated pine trees and string lights surrounding a nighttime ice rink' },
  places_19: { ratio: '4 / 3', focus: '50% 82%', zoom: 1.3, alt: 'Terraced turquoise pools, palms and the ocean at Wailea' },
  places_20: { ratio: '1', focus: '59% 64%', zoom: 1.5, alt: 'An ivory full moon framed by silhouetted leaves at dusk' },
  places_21: { ratio: '1', focus: '58% 50%', zoom: 1.12, alt: 'Ornate library balconies, bookshelves and a glowing chandelier' },
  places_22: { ratio: '4 / 3', focus: '58% 50%', zoom: 1.12, alt: 'A tree-lined campus walkway between stone and brick buildings' },
  places_23: { ratio: '1', focus: '54% 43%', zoom: 1.12, alt: 'Purple NYU banners above a Greenwich Village sidewalk' },
  places_24: { ratio: '1', focus: '39% 25%', zoom: 1.12, alt: 'Golden fireworks above Tomorrowland and the Matterhorn at night' },
  places_25: { ratio: '1', focus: '50% 38%', zoom: 1.2, alt: 'N Seoul Tower against a pink dusk sky between city buildings' },
  places_26: { ratio: '1', focus: '50% 48%', zoom: 1.08, alt: 'Pale pink cherry blossoms cascading over a sculptural folding fan' },
  places_27: { ratio: '1', focus: '52% 53%', zoom: 1.08, alt: 'An arched wooden bridge surrounded by a lush Japanese garden' },
  places_28: { ratio: '1', focus: '55% 50%', zoom: 1.08, alt: 'Curving wooden balconies and faceted glass in a multilevel atrium' },
  places_29: { ratio: '1', focus: '50% 50%', zoom: 1.08, alt: 'Indigo lights repeating through a mirrored art installation' },
  places_30: { ratio: '1', focus: '50% 45%', zoom: 1.08, alt: 'A bustling Seoul street lined with colorful neon signs at night' },
  places_31: { ratio: '1', focus: '55% 40%', zoom: 1.08, alt: 'A white conservatory beyond palms, a green lawn and giant letter blocks' },
  places_32: { ratio: '1', focus: '58% 50%', zoom: 1.15, alt: 'An engraved steel steak knife resting over a burgundy restaurant menu' },
  places_33: { ratio: '1', focus: '52% 35%', zoom: 1.12, alt: 'Lilac wisteria draped across a café entrance beneath brick and fire escapes' },
  places_34: { ratio: '1', focus: '58% 42%', zoom: 1.08, alt: 'Disneyland Railroad station above a Mickey-shaped flower bed' },
  places_35: { ratio: '1', focus: '52% 43%', zoom: 1.1, alt: 'A traditional Korean hanok behind leafy trees and a wooden walkway' },
  places_36: { ratio: '1', focus: '50% 42%', zoom: 1.1, alt: 'The illuminated 1881 Heritage building with palms and arched verandas' },
};
const PLACE_IMAGE_ROOT = './assets/places/photo';

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
    const [joinIn, joinOut] = rt.join || [];
    const track = [...(joinIn ? [joinIn] : []), ...rt.route, ...(joinOut ? [joinOut] : [])];
    const d = metroRoundedPath(track, METRO_CORNER_R);
    const caps = metroEndCaps(track, METRO_CAP, rt.caps);

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
      const image = PLACE_IMAGES[src];

      stations += `<div class="mm-station" data-photo="${src}" data-code="${code}" role="button"
          style="--x:${((x / METRO_VB.w) * 100).toFixed(3)};--y:${((y / METRO_VB.h) * 100).toFixed(3)};--o:${order++};--line-col:${line.color};--line-glow:${line.glow};--place-focus:${image.focus};--place-zoom:${image.zoom}"
          tabindex="0" aria-label="${PLACE_NOTES[src].title}, station ${code}" aria-haspopup="dialog" aria-expanded="false" aria-controls="place-card-wrap">
        <span class="mm-token"><img src="${PLACE_IMAGE_ROOT}/thumbs/${src}.webp" width="240" height="240" alt="" decoding="async" draggable="false"></span>
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

const placeCardWrap = document.getElementById('place-card-wrap');
const placeCardImg = document.getElementById('place-card-img');
const placeCardTitle = document.getElementById('place-card-title');
const placeCardDesc = document.getElementById('place-card-desc');
let placeCardFrom = null;

function openPlaceCard(station) {
  if (!placeCardWrap) return;
  const photo = station.dataset.photo;
  const note = PLACE_NOTES[photo] || {};
  const image = PLACE_IMAGES[photo];
  const card = placeCardWrap.querySelector('.place-card');
  const frame = placeCardImg.parentElement;
  card.style.setProperty('--place-ratio', image.ratio);
  card.style.setProperty('--place-focus', image.focus);
  frame.style.backgroundImage = `url("${PLACE_IMAGE_ROOT}/thumbs/${photo}.webp")`;
  frame.classList.add('is-loading');
  frame.setAttribute('aria-busy', 'true');
  placeCardImg.onload = () => {
    frame.classList.remove('is-loading');
    frame.setAttribute('aria-busy', 'false');
    positionPlaceCard();
  };
  placeCardImg.onerror = () => {
    // Keep the matching thumbnail visible while trying the original HD copy.
    placeCardImg.onerror = () => frame.setAttribute('aria-busy', 'false');
    placeCardImg.removeAttribute('srcset');
    placeCardImg.src = `./assets/places/hd/${photo}.webp`;
  };
  placeCardImg.alt = image.alt;
  placeCardImg.sizes = '(min-width: 1220px) 358px, 32vw';
  placeCardImg.srcset = `${PLACE_IMAGE_ROOT}/cards/${photo}.webp 640w, ${PLACE_IMAGE_ROOT}/${photo}.webp 1254w`;
  placeCardImg.src = `${PLACE_IMAGE_ROOT}/${photo}.webp`;
  placeCardTitle.textContent = note.title || `Station ${station.dataset.code}`;
  placeCardDesc.textContent = note.desc || 'A stop along the red line.';
  if (placeCardFrom) placeCardFrom.setAttribute('aria-expanded', 'false');
  placeCardFrom = station;
  station.setAttribute('aria-expanded', 'true');
  placeCardWrap.hidden = false;
  positionPlaceCard();
  placeCardWrap.classList.remove('is-open');
  void placeCardWrap.offsetWidth;
  placeCardWrap.classList.add('is-open');
  playClickSfx();
  placeCardWrap.querySelector('.place-card-close').focus({ preventScroll: true });
}
// Sit the card just above the station, or below it when there isn't room,
// clamped to the viewport with the tail pointing back at the station.
function positionPlaceCard() {
  if (!placeCardFrom || placeCardWrap.hidden) return;
  const card = placeCardWrap.querySelector('.place-card');
  const tok = placeCardFrom.getBoundingClientRect();
  const lbl = placeCardFrom.querySelector('.mm-code').getBoundingClientRect();
  const r = { left: tok.left, width: tok.width, top: tok.top, bottom: Math.max(tok.bottom, lbl.bottom) };
  const cw = card.offsetWidth, ch = card.offsetHeight;
  const gap = 18, margin = 24;
  const roomAbove = r.top - margin, roomBelow = innerHeight - r.bottom - margin;
  const below = roomAbove < ch + gap && roomBelow > roomAbove;
  const cx = r.left + r.width / 2;
  const left = Math.max(margin, Math.min(cx - cw / 2, innerWidth - cw - margin));
  const idealTop = below ? r.bottom + gap : r.top - gap - ch;
  const top = Math.max(margin, Math.min(idealTop, innerHeight - ch - margin));
  card.dataset.side = below ? 'below' : 'above';
  card.style.left = `${left}px`;
  card.style.top = `${top}px`;
  card.style.setProperty('--tail-x', `${Math.max(20, Math.min(cw - 20, cx - left))}px`);
}
function closePlaceCard() {
  if (!placeCardWrap || placeCardWrap.hidden) return false;
  placeCardWrap.hidden = true;
  placeCardWrap.classList.remove('is-open');
  playEscSfx();
  if (placeCardFrom) {
    placeCardFrom.setAttribute('aria-expanded', 'false');
    placeCardFrom.focus({ preventScroll: true });
  }
  placeCardFrom = null;
  return true;
}
if (metroStations) {
  metroStations.addEventListener('click', (e) => {
    const st = e.target.closest('.mm-station');
    if (st) openPlaceCard(st);
  });
  metroStations.addEventListener('keydown', (e) => {
    const st = e.target.closest('.mm-station');
    if (st && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openPlaceCard(st); }
  });
}
if (placeCardWrap) {
  placeCardWrap.addEventListener('click', (e) => {
    if (e.target.closest('.place-card-close')) closePlaceCard();
  });
  document.addEventListener('pointerdown', (e) => {
    if (placeCardWrap.hidden) return;
    if (e.target.closest('.place-card') || e.target.closest('.mm-station')) return;
    closePlaceCard();
  });
  window.addEventListener('resize', positionPlaceCard);
  if (metroScroller) metroScroller.addEventListener('scroll', positionPlaceCard, { passive: true });
}

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

  scroller.addEventListener('wheel', (e) => {
    const max = scroller.scrollWidth - scroller.clientWidth;
    if (max <= 1) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    const atStart = scroller.scrollLeft <= 0;
    const atEnd = scroller.scrollLeft >= max - 1;
    if ((delta < 0 && atStart) || (delta > 0 && atEnd)) return;
    e.preventDefault();
    scroller.scrollLeft += delta;
  }, { passive: false });

  scroller.addEventListener('scroll', syncMetroProgress, { passive: true });
  window.addEventListener('resize', syncMetroProgress);

  if (prog && track) {
    const scrubTo = (clientX) => {
      const r = track.getBoundingClientRect();
      if (r.width < 4) return;
      const p = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
      scroller.scrollLeft = p * (scroller.scrollWidth - scroller.clientWidth);
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
