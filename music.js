// Self-contained Holiday Jazz Trio music controller (live Web Audio synthesis + SFX ducking)
(function initBadSantaMusic(globalScope) {
  const VOLUME_KEY = 'badsanta_music_volume_v1';
  const SHUFFLE_KEY = 'badsanta_music_shuffle_v1';

  function getJazzCharts() {
    if (globalScope.BadSantaJazzCharts && Array.isArray(globalScope.BadSantaJazzCharts.JAZZ_CHARTS)) {
      return globalScope.BadSantaJazzCharts.JAZZ_CHARTS;
    }
    if (typeof require === 'function') {
      try {
        const mod = require('./jazz-charts');
        if (mod && Array.isArray(mod.JAZZ_CHARTS)) return mod.JAZZ_CHARTS;
      } catch {
        // ignore in browser
      }
    }
    return [];
  }

  function getJazzEngine() {
    return globalScope.BadSantaJazzEngine || null;
  }

  let currentIndex = 0;
  let playing = false;
  let shuffle = false;
  let baseVolume = 0.35; // gentle meeting-room background level
  let duckTimer = null;
  let isDucking = false;
  const listeners = new Set();

  try {
    const savedVol = Number(localStorage.getItem(VOLUME_KEY));
    if (!Number.isNaN(savedVol) && savedVol >= 0 && savedVol <= 1) {
      baseVolume = savedVol;
    }
    shuffle = localStorage.getItem(SHUFFLE_KEY) === 'on';
  } catch {
    // ignore storage errors
  }

  function notify(reason = 'state') {
    const snap = getState();
    for (const fn of listeners) {
      try {
        fn(snap, reason);
      } catch {
        // ignore subscriber errors
      }
    }
  }

  function applyEffectiveVolume() {
    const jazz = getJazzEngine();
    if (jazz) {
      jazz.setVolume(baseVolume);
      jazz.setDucking(isDucking);
    }
  }

  const jazzInit = getJazzEngine();
  if (jazzInit) {
    jazzInit.setVolume(baseVolume);
    jazzInit.setCallbacks({
      onChange: (reason) => {
        playing = jazzInit.isPlaying();
        notify(reason);
      },
      onEnded: () => {
        next(true);
      }
    });
    const charts = getJazzCharts();
    if (charts.length > 0) {
      jazzInit.loadChart(charts[0], false);
    }
  }

  function loadTrack(index, autoplay = false) {
    const list = getJazzCharts();
    if (!list.length) return;
    currentIndex = ((index % list.length) + list.length) % list.length;
    const jazz = getJazzEngine();
    if (jazz) {
      applyEffectiveVolume();
      jazz.loadChart(list[currentIndex], autoplay);
      playing = jazz.isPlaying();
    }
    notify('state');
  }

  function play() {
    const jazz = getJazzEngine();
    const list = getJazzCharts();
    if (!jazz || !list.length) return Promise.resolve();
    if (!jazz.isPlaying() && jazz.getProgress().duration === 0) {
      jazz.loadChart(list[currentIndex], false);
    }
    applyEffectiveVolume();
    jazz.play();
    playing = jazz.isPlaying();
    notify('state');
    return Promise.resolve();
  }

  function pause() {
    const jazz = getJazzEngine();
    if (jazz) jazz.pause();
    playing = false;
    notify('state');
  }

  function togglePlay() {
    if (playing) pause();
    else play();
  }

  function next(forcePlay = playing) {
    const list = getJazzCharts();
    if (!list.length) return;
    if (shuffle && list.length > 1) {
      let pick = currentIndex;
      while (pick === currentIndex) {
        pick = Math.floor(Math.random() * list.length);
      }
      loadTrack(pick, forcePlay);
    } else {
      loadTrack(currentIndex + 1, forcePlay);
    }
  }

  function prev(forcePlay = playing) {
    const jazz = getJazzEngine();
    if (jazz && jazz.getProgress().currentTime > 3) {
      jazz.seek(0);
      return;
    }
    loadTrack(currentIndex - 1, forcePlay);
  }

  function selectTrack(id, autoplay = true) {
    const list = getJazzCharts();
    const idx = list.findIndex((t) => t.id === id);
    if (idx === -1) return;
    loadTrack(idx, autoplay);
  }

  function setVolume(val) {
    const clamped = Math.max(0, Math.min(1, Number(val)));
    if (Number.isNaN(clamped)) return;
    baseVolume = clamped;
    applyEffectiveVolume();
    try {
      localStorage.setItem(VOLUME_KEY, String(baseVolume));
    } catch {
      // ignore
    }
    notify('volume');
  }

  function toggleShuffle() {
    shuffle = !shuffle;
    try {
      localStorage.setItem(SHUFFLE_KEY, shuffle ? 'on' : 'off');
    } catch {
      // ignore
    }
    notify('state');
    return shuffle;
  }

  function seek(fraction) {
    const clamped = Math.max(0, Math.min(1, Number(fraction) || 0));
    const jazz = getJazzEngine();
    if (jazz) jazz.seek(clamped);
  }

  // Briefly lower background jazz when a Bad Santa SFX plays
  function duck(ms = 650) {
    if (!playing) return;
    isDucking = true;
    applyEffectiveVolume();
    if (duckTimer) clearTimeout(duckTimer);
    duckTimer = setTimeout(() => {
      isDucking = false;
      applyEffectiveVolume();
      duckTimer = null;
    }, ms);
  }

  function getState() {
    const list = getJazzCharts();
    const idx = list.length ? ((currentIndex % list.length) + list.length) % list.length : 0;
    const jazz = getJazzEngine();
    const prog = jazz ? jazz.getProgress() : { currentTime: 0, duration: 0, chordSymbol: '', chorusLabel: '' };

    return {
      tracks: list,
      currentIndex: idx,
      currentTrack: list[idx] || { id: '', title: 'Holiday Jazz Trio', vibe: '', key: '', bpm: 120 },
      playing,
      shuffle,
      volume: baseVolume,
      currentTime: prog.currentTime,
      duration: prog.duration,
      chordSymbol: prog.chordSymbol,
      chorusLabel: prog.chorusLabel
    };
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  const BadSantaMusic = {
    get TRACKS() {
      return getJazzCharts();
    },
    play,
    pause,
    togglePlay,
    next,
    prev,
    selectTrack,
    setVolume,
    toggleShuffle,
    seek,
    duck,
    getState,
    subscribe
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BadSantaMusic;
  } else {
    globalScope.BadSantaMusic = BadSantaMusic;
  }
})(typeof window !== 'undefined' ? window : globalThis);
