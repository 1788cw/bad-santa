// Real-time Web Audio Holiday Jazz Quartet Synthesizer
// Instruments: Fender Rhodes Electric Piano, Jazz Vibraphone, Plucked Upright Bass, Brushed Drums + Warm Room Reverb
// Full Club Arrangement (~3.5-4.5 min per standard -> ~90+ min across 24 tunes):
// 4-bar Vamp Intro -> Head -> Rhodes Solo -> Vibes Solo -> Bass Feature -> Quartet Jam -> Head Out + Tag Cadence
(function initBadSantaJazzEngine(globalScope) {
  const INTRO_BARS = 4;
  const OUTRO_BARS = 2;
  const CHORUSES_PER_TRACK = 7;
  const CHORUS_LABELS = [
    'Head',
    'Rhodes Solo',
    'Vibes Solo',
    'Bass Feature',
    'Rhodes Improv',
    'Quartet Jam',
    'Head Out'
  ];
  const LOOKAHEAD_MS = 30;
  const SCHEDULE_AHEAD_SEC = 0.16;

  let ctx = null;
  let masterGain = null;
  let dryGain = null;
  let reverbGain = null;
  let reverbNode = null;
  let noiseBuffer = null;

  let currentChart = null;
  let generatedVibesSolo = [];
  let generatedRhodesImprov = [];
  let generatedQuartetVibes = [];
  let playing = false;
  let baseVolume = 0.35;
  let isDucking = false;

  let schedulerTimer = null;
  let startTimeCtx = 0; // audioCtx.currentTime corresponding to song beat 0
  let pausedAtBeat = 0;
  let lastScheduledBeat = -0.001;
  let lastChordSymbol = '';
  let lastSectionLabel = 'Intro';
  let onStateChange = null;
  let onTrackEnded = null;

  function midiToHz(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function ensureAudio() {
    const AudioCtx = globalScope.AudioContext || globalScope.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!ctx) {
      ctx = new AudioCtx();

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -16;
      compressor.knee.value = 18;
      compressor.ratio.value = 3.5;
      compressor.attack.value = 0.008;
      compressor.release.value = 0.18;

      masterGain = ctx.createGain();
      masterGain.gain.value = effectiveGain();

      dryGain = ctx.createGain();
      dryGain.gain.value = 0.85;

      reverbGain = ctx.createGain();
      reverbGain.gain.value = 0.26;

      reverbNode = ctx.createConvolver();
      reverbNode.buffer = buildWarmRoomIR(ctx, 1.45);

      dryGain.connect(compressor);
      reverbNode.connect(reverbGain);
      reverbGain.connect(compressor);
      compressor.connect(masterGain);
      masterGain.connect(ctx.destination);

      noiseBuffer = buildNoiseBuffer(ctx, 1.5);
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function buildNoiseBuffer(audioCtx, seconds) {
    const len = Math.floor(audioCtx.sampleRate * seconds);
    const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.95 * b2 + white * 0.048;
      data[i] = Math.max(-1, Math.min(1, (b0 + b1 + b2 + white * 0.18) * 1.4));
    }
    return buf;
  }

  function buildWarmRoomIR(audioCtx, seconds) {
    const len = Math.floor(audioCtx.sampleRate * seconds);
    const ir = audioCtx.createBuffer(2, len, audioCtx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = ir.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const env = Math.pow(1 - t, 2.75);
        const white = (Math.random() * 2 - 1) * env;
        lp = lp * 0.72 + white * 0.28;
        data[i] = lp * 0.56;
      }
    }
    return ir;
  }

  function effectiveGain() {
    const scaled = baseVolume * 0.85;
    return Math.max(0, Math.min(1, isDucking ? scaled * 0.30 : scaled));
  }

  function applyGainSmooth(rampSec = 0.06) {
    if (!ctx || !masterGain) return;
    const now = ctx.currentTime;
    const target = effectiveGain();
    try {
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setValueAtTime(masterGain.gain.value, now);
      masterGain.gain.linearRampToValueAtTime(target, now + rampSec);
    } catch {
      masterGain.gain.value = target;
    }
  }

  function connectVoice(node, pan = 0, sendReverb = true) {
    let out = node;
    if (ctx.createStereoPanner && Math.abs(pan) > 0.01) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = Math.max(-0.7, Math.min(0.7, pan));
      node.connect(panner);
      out = panner;
    }
    out.connect(dryGain);
    if (sendReverb && reverbNode) {
      out.connect(reverbNode);
    }
  }

  // ---- Instrument 1: Warm Fender Rhodes Electric Piano ----
  function playRhodesNote(midi, when, durSec, vel = 0.75, isComp = false) {
    const freq = midiToHz(midi);
    const hold = Math.max(0.14, Math.min(3.6, durSec));
    const peak = (isComp ? 0.070 : 0.172) * vel;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const startCut = isComp ? 1120 + vel * 620 : 1720 + vel * 1950;
    const endCut = isComp ? 600 : 860;
    filter.frequency.setValueAtTime(startCut, when);
    filter.frequency.exponentialRampToValueAtTime(endCut, when + Math.min(hold, 0.85));
    filter.Q.value = 0.9;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, when);
    env.gain.linearRampToValueAtTime(peak, when + 0.011);
    env.gain.exponentialRampToValueAtTime(peak * 0.56, when + Math.min(0.24, hold * 0.45));
    env.gain.exponentialRampToValueAtTime(0.0001, when + hold + 0.25);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, when);

    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, when);
    osc2.detune.setValueAtTime(1.8, when);
    g2.gain.setValueAtTime(isComp ? 0.09 : 0.16, when);
    g2.gain.exponentialRampToValueAtTime(0.001, when + Math.min(0.45, hold * 0.8));

    const tine = ctx.createOscillator();
    const gTine = ctx.createGain();
    tine.type = 'sine';
    tine.frequency.setValueAtTime(freq * 4, when);
    gTine.gain.setValueAtTime((isComp ? 0.04 : 0.115) * vel, when);
    gTine.gain.exponentialRampToValueAtTime(0.0001, when + 0.075);

    osc1.connect(filter);
    osc2.connect(g2);
    g2.connect(filter);
    tine.connect(gTine);
    gTine.connect(filter);

    filter.connect(env);
    const pan = isComp ? -0.20 : Math.max(-0.22, Math.min(0.28, (midi - 66) * 0.024));
    connectVoice(env, pan, true);

    const stopAt = when + hold + 0.28;
    osc1.start(when);
    osc2.start(when);
    tine.start(when);
    osc1.stop(stopAt);
    osc2.stop(stopAt);
    tine.stop(when + 0.09);
  }

  function playCompChord(notes, when, durSec, vel = 0.64) {
    if (!Array.isArray(notes) || !notes.length) return;
    notes.forEach((midi, idx) => {
      playRhodesNote(midi, when + idx * 0.014, durSec, vel * (0.92 + (idx % 2) * 0.08), true);
    });
  }

  // ---- Instrument 2: Warm Jazz Vibraphone (with classic 5.4Hz motor tremolo) ----
  function playVibesNote(midi, when, durSec, vel = 0.72) {
    const freq = midiToHz(midi);
    const hold = Math.max(0.25, Math.min(3.2, durSec + 0.35));
    const peak = 0.155 * vel;

    const fund = ctx.createOscillator();
    fund.type = 'sine';
    fund.frequency.setValueAtTime(freq, when);

    // Classic vibraphone bar 4th harmonic mallet ping (decays quickly)
    const bar4 = ctx.createOscillator();
    const gBar4 = ctx.createGain();
    bar4.type = 'sine';
    bar4.frequency.setValueAtTime(freq * 3.98, when);
    gBar4.gain.setValueAtTime(0.11 * vel, when);
    gBar4.gain.exponentialRampToValueAtTime(0.0001, when + 0.095);

    // Gentle motor-fan amplitude tremolo (~5.4 Hz)
    const tremGain = ctx.createGain();
    tremGain.gain.setValueAtTime(0.84, when);
    const lfo = ctx.createOscillator();
    const lfoDepth = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(5.4, when);
    lfoDepth.gain.setValueAtTime(0.16, when);
    lfo.connect(lfoDepth);
    lfoDepth.connect(tremGain.gain);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, when);
    env.gain.linearRampToValueAtTime(peak, when + 0.008);
    env.gain.exponentialRampToValueAtTime(peak * 0.45, when + Math.min(0.45, hold * 0.5));
    env.gain.exponentialRampToValueAtTime(0.0001, when + hold);

    fund.connect(tremGain);
    bar4.connect(gBar4);
    gBar4.connect(tremGain);
    tremGain.connect(env);

    // Sit slightly right of center opposite Rhodes comping
    connectVoice(env, 0.24, true);

    const stopAt = when + hold + 0.06;
    fund.start(when);
    bar4.start(when);
    lfo.start(when);
    fund.stop(stopAt);
    bar4.stop(when + 0.11);
    lfo.stop(stopAt);
  }

  // ---- Instrument 3: Plucked Acoustic Upright Bass ----
  function playUprightBass(midi, when, durSec, vel = 0.82) {
    const freq = midiToHz(midi);
    const hold = Math.max(0.18, Math.min(2.4, durSec));
    const peak = 0.34 * vel;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(580 + (vel > 0.9 ? 140 : 0), when);
    filter.frequency.exponentialRampToValueAtTime(175, when + 0.19);
    filter.Q.value = 1.4;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, when);
    env.gain.linearRampToValueAtTime(peak, when + 0.012);
    env.gain.exponentialRampToValueAtTime(peak * 0.62, when + 0.14);
    env.gain.exponentialRampToValueAtTime(0.0001, when + hold + 0.16);

    const body = ctx.createOscillator();
    body.type = 'triangle';
    body.frequency.setValueAtTime(freq, when);

    const string = ctx.createOscillator();
    const gStr = ctx.createGain();
    string.type = 'sawtooth';
    string.frequency.setValueAtTime(freq, when);
    gStr.gain.setValueAtTime(0.22, when);
    gStr.gain.exponentialRampToValueAtTime(0.03, when + 0.16);

    body.connect(filter);
    string.connect(gStr);
    gStr.connect(filter);
    filter.connect(env);
    connectVoice(env, -0.06, false);

    const stopAt = when + hold + 0.2;
    body.start(when);
    string.start(when);
    body.stop(stopAt);
    string.stop(stopAt);
  }

  // ---- Instrument 4: Brushed Jazz Drum Kit ----
  function playRide(when, vel = 0.5, accent = false) {
    if (!noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(accent ? 6800 : 6100, when);
    bp.Q.value = 2.4;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(5200, when);

    const env = ctx.createGain();
    const peak = (accent ? 0.085 : 0.052) * vel;
    const decay = accent ? 0.22 : 0.12;
    env.gain.setValueAtTime(0.0001, when);
    env.gain.linearRampToValueAtTime(peak, when + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, when + decay);

    src.connect(bp);
    bp.connect(hp);
    hp.connect(env);
    connectVoice(env, 0.28, true);

    src.start(when, Math.random() * 0.4, decay + 0.04);
  }

  function playHatChick(when, vel = 0.55) {
    if (!noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(5800, when);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, when);
    env.gain.linearRampToValueAtTime(0.072 * vel, when + 0.003);
    env.gain.exponentialRampToValueAtTime(0.0001, when + 0.045);

    src.connect(hp);
    hp.connect(env);
    connectVoice(env, -0.22, false);

    src.start(when, Math.random() * 0.5, 0.06);
  }

  function playBrush(when, dur = 0.16, vel = 0.42) {
    if (!noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(2800, when);
    bp.Q.value = 1.1;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, when);
    env.gain.linearRampToValueAtTime(0.058 * vel, when + dur * 0.25);
    env.gain.exponentialRampToValueAtTime(0.0001, when + dur);

    src.connect(bp);
    bp.connect(env);
    connectVoice(env, 0.05, true);

    src.start(when, Math.random() * 0.5, dur + 0.03);
  }

  function playRimClick(when, vel = 0.6) {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1650, when);
    osc.frequency.exponentialRampToValueAtTime(920, when + 0.022);

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1400, when);
    bp.Q.value = 2.6;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, when);
    env.gain.linearRampToValueAtTime(0.085 * vel, when + 0.002);
    env.gain.exponentialRampToValueAtTime(0.0001, when + 0.035);

    osc.connect(bp);
    bp.connect(env);
    connectVoice(env, 0.14, true);
    osc.start(when);
    osc.stop(when + 0.045);
  }

  function playFeatherKick(when, vel = 0.5) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(102, when);
    osc.frequency.exponentialRampToValueAtTime(46, when + 0.08);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, when);
    env.gain.linearRampToValueAtTime(0.14 * vel, when + 0.007);
    env.gain.exponentialRampToValueAtTime(0.0001, when + 0.14);

    osc.connect(env);
    connectVoice(env, 0, false);
    osc.start(when);
    osc.stop(when + 0.16);
  }

  // ---- Live Generative Jazz Vibraphone Soloist ----
  // Generates a fresh, lyrical jazz vibes solo directly from each bar's chord voicings
  // so repeat plays always breathe like a real quartet!
  function buildLiveVibesSolo(chart, sparse = false) {
    if (!chart || !chart.chords || !chart.chords.length) return [];
    const ts = chart.timeSig;
    const notes = [];
    let lastPitch = 72;

    const rhythmTemplates4 = [
      [{ b: 0, d: 1.4 }, { b: 1.5, d: 0.9 }, { b: 2.5, d: 1.2 }],
      [{ b: 0.5, d: 0.9 }, { b: 1.5, d: 0.5 }, { b: 2, d: 1.6 }],
      [{ b: 0, d: 0.5 }, { b: 0.5, d: 0.5 }, { b: 1, d: 1.0 }, { b: 2.5, d: 1.1 }],
      [{ b: 1, d: 1.3 }, { b: 2.5, d: 1.2 }]
    ];
    const rhythmTemplates3 = [
      [{ b: 0, d: 1.4 }, { b: 1.5, d: 0.5 }, { b: 2, d: 0.9 }],
      [{ b: 0.5, d: 1.0 }, { b: 2, d: 0.9 }],
      [{ b: 0, d: 0.9 }, { b: 1, d: 0.9 }, { b: 2, d: 0.9 }],
      [{ b: 0, d: 1.8 }, { b: 2, d: 0.8 }]
    ];
    const templates = ts === 3 ? rhythmTemplates3 : rhythmTemplates4;

    for (let bar = 0; bar < chart.bars; bar++) {
      // Leave natural jazz breathing space on every 4th bar end or sparse sections
      if (sparse && bar % 2 === 1) continue;
      if (!sparse && bar % 4 === 3 && Math.random() < 0.35) {
        // Gentle sustained resolution note on beat 0
        const ch = chordAt(chart, bar, 0);
        const pool = upperChordPool(ch);
        const pick = nearestPitch(pool, lastPitch);
        notes.push({ bar, beat: 0, midi: pick, dur: ts * 0.78, vel: 0.70 });
        lastPitch = pick;
        continue;
      }

      const tpl = templates[Math.floor(Math.random() * templates.length)];
      for (let i = 0; i < tpl.length; i++) {
        const slot = tpl[i];
        if (slot.b >= ts) continue;
        const ch = chordAt(chart, bar, slot.b);
        const pool = upperChordPool(ch);
        // Smooth melodic voice-leading with occasional tasteful leap
        const target = Math.random() < 0.25 ? lastPitch + (Math.random() < 0.5 ? 5 : -5) : lastPitch + (Math.random() < 0.5 ? 2 : -2);
        const midi = nearestPitch(pool, Math.max(64, Math.min(82, target)));
        const vel = Number((0.62 + Math.random() * 0.22).toFixed(2));
        notes.push({ bar, beat: slot.b, midi, dur: slot.d, vel });
        lastPitch = midi;
      }
    }
    return notes;
  }

  function chordAt(chart, bar, beat) {
    let best = chart.chords[0];
    for (let i = 0; i < chart.chords.length; i++) {
      const c = chart.chords[i];
      if (c.bar < bar || (c.bar === bar && c.beat <= beat + 0.05)) {
        best = c;
      } else {
        break;
      }
    }
    return best;
  }

  function upperChordPool(chord) {
    const out = [];
    for (const n of chord.notes || [60, 64, 67, 71]) {
      let p = n;
      while (p < 64) p += 12;
      if (p <= 83) out.push(p);
      if (p + 12 <= 84) out.push(p + 12);
    }
    return out.length ? out : [67, 71, 74, 76];
  }

  function nearestPitch(pool, target) {
    let best = pool[0];
    let bestDist = Math.abs(best - target);
    for (let i = 1; i < pool.length; i++) {
      const d = Math.abs(pool[i] - target);
      if (d < bestDist) {
        best = pool[i];
        bestDist = d;
      }
    }
    return best;
  }

  // ---- Swing & Form Timing Math ----
  function totalBeats(chart) {
    const bodyBars = chart.bars * CHORUSES_PER_TRACK;
    return (INTRO_BARS + bodyBars + OUTRO_BARS) * chart.timeSig;
  }

  function durationSeconds(chart) {
    if (!chart) return 0;
    return (totalBeats(chart) * 60) / chart.bpm;
  }

  function applySwingOffset(beatInBar, swingRatio) {
    if (!swingRatio || swingRatio <= 0.5) return beatInBar;
    const whole = Math.floor(beatInBar);
    const frac = beatInBar - whole;
    if (frac > 0.001 && frac < 0.999) {
      if (frac <= 0.5) {
        return whole + (frac / 0.5) * swingRatio;
      }
      return whole + swingRatio + ((frac - 0.5) / 0.5) * (1 - swingRatio);
    }
    return beatInBar;
  }

  function beatToCtxTime(absBeat, chart, humanizeMs = 0) {
    const spb = 60 / chart.bpm;
    const barIndex = Math.floor(absBeat / chart.timeSig);
    const beatInBar = absBeat - barIndex * chart.timeSig;
    const swungBeat = barIndex * chart.timeSig + applySwingOffset(beatInBar, chart.swing);
    const jitter = humanizeMs > 0 ? ((Math.random() * 2 - 1) * humanizeMs) / 1000 : 0;
    return Math.max(ctx.currentTime + 0.005, startTimeCtx + swungBeat * spb + jitter);
  }

  // ---- Drum Groove Pattern Generator per Bar ----
  function scheduleBarDrums(chart, absBarIndex, intensity, winStartBeat, winEndBeat) {
    const ts = chart.timeSig;
    const baseBeat = absBarIndex * ts;
    const groove = chart.groove || 'swing';

    const events = [];
    if (groove === 'bossa') {
      for (let b = 0; b < ts; b += 0.5) {
        events.push({ b, fn: (t) => playRide(t, (b % 1 === 0 ? 0.50 : 0.35) * intensity, b === 0) });
      }
      events.push({ b: 0, fn: (t) => playFeatherKick(t, 0.56 * intensity) });
      events.push({ b: 1.5, fn: (t) => playFeatherKick(t, 0.40 * intensity) });
      events.push({ b: 2, fn: (t) => playFeatherKick(t, 0.50 * intensity) });
      events.push({ b: 3.5, fn: (t) => playFeatherKick(t, 0.36 * intensity) });
      const clave = absBarIndex % 2 === 0 ? [0, 1.5, 3] : [0.5, 2];
      for (const cb of clave) {
        events.push({ b: cb, fn: (t) => playRimClick(t, 0.60 * intensity) });
      }
    } else if (groove === 'waltz') {
      events.push({ b: 0, fn: (t) => playRide(t, 0.64 * intensity, true) });
      events.push({ b: 1, fn: (t) => { playRide(t, 0.45 * intensity, false); playHatChick(t, 0.50 * intensity); } });
      events.push({ b: 2, fn: (t) => playRide(t, 0.56 * intensity, false) });
      events.push({ b: 2.5, fn: (t) => playRide(t, 0.40 * intensity, false) });
      events.push({ b: 0, fn: (t) => playFeatherKick(t, 0.40 * intensity) });
      if (absBarIndex % 2 === 1) {
        events.push({ b: 1.5, fn: (t) => playBrush(t, 0.14, 0.36 * intensity) });
      }
    } else if (groove === 'ballad') {
      events.push({ b: 0, fn: (t) => playBrush(t, 0.34, 0.44 * intensity) });
      events.push({ b: 1, fn: (t) => playHatChick(t, 0.28 * intensity) });
      events.push({ b: 2, fn: (t) => playRide(t, 0.36 * intensity, false) });
      if (absBarIndex % 2 === 1) {
        events.push({ b: 2.5, fn: (t) => playBrush(t, 0.18, 0.28 * intensity) });
      }
    } else {
      events.push({ b: 0, fn: (t) => { playRide(t, 0.66 * intensity, true); playFeatherKick(t, 0.42 * intensity); } });
      events.push({ b: 1, fn: (t) => { playRide(t, 0.52 * intensity, false); playHatChick(t, 0.60 * intensity); } });
      events.push({ b: 1.5, fn: (t) => playRide(t, 0.42 * intensity, false) });
      events.push({ b: 2, fn: (t) => playRide(t, 0.64 * intensity, true) });
      events.push({ b: 3, fn: (t) => { playRide(t, 0.52 * intensity, false); playHatChick(t, 0.60 * intensity); } });
      events.push({ b: 3.5, fn: (t) => playRide(t, 0.42 * intensity, false) });
      if (absBarIndex % 2 === 1) {
        events.push({ b: 2.5, fn: (t) => playBrush(t, 0.13, 0.38 * intensity) });
      }
    }

    for (const ev of events) {
      const absBeat = baseBeat + ev.b;
      if (absBeat > winStartBeat && absBeat <= winEndBeat) {
        ev.fn(beatToCtxTime(absBeat, chart, 3.5));
      }
    }
  }

  // ---- Main Lookahead Scheduler ----
  function scheduleTick() {
    if (!playing || !currentChart || !ctx) return;
    const chart = currentChart;
    const spb = 60 / chart.bpm;
    const ts = chart.timeSig;
    const introBeats = INTRO_BARS * ts;
    const chorusBeats = chart.bars * ts;
    const bodyEndBeat = introBeats + chorusBeats * CHORUSES_PER_TRACK;
    const total = totalBeats(chart);

    const nowBeat = (ctx.currentTime - startTimeCtx) / spb;
    if (nowBeat >= total) {
      stopInternal(false);
      pausedAtBeat = 0;
      if (typeof onTrackEnded === 'function') {
        onTrackEnded();
      }
      return;
    }

    const horizonBeat = Math.min(total, nowBeat + SCHEDULE_AHEAD_SEC / spb);
    const winStart = lastScheduledBeat;
    const winEnd = horizonBeat;

    if (winEnd > winStart) {
      // A) 4-BAR VAMP INTRO (uses last 4 bars of chart's chords & bass to set groove!)
      if (winStart < introBeats) {
        const vampStartBar = Math.max(0, chart.bars - INTRO_BARS);
        for (const ch of chart.chords) {
          if (ch.bar >= vampStartBar) {
            const absBeat = (ch.bar - vampStartBar) * ts + ch.beat;
            if (absBeat > winStart && absBeat <= Math.min(winEnd, introBeats)) {
              playCompChord(ch.notes, beatToCtxTime(absBeat, chart, 7), spb * 1.6, 0.54);
            }
          }
        }
        for (const b of chart.bass) {
          if (b.bar >= vampStartBar) {
            const absBeat = (b.bar - vampStartBar) * ts + b.beat;
            if (absBeat > winStart && absBeat <= Math.min(winEnd, introBeats)) {
              playUprightBass(b.midi, beatToCtxTime(absBeat, chart, 5), b.dur * spb, 0.78);
            }
          }
        }
        for (let ib = 0; ib < INTRO_BARS; ib++) {
          scheduleBarDrums(chart, ib, 0.78, winStart, Math.min(winEnd, introBeats));
        }
      }

      // B) 6 FULL CHORUSES
      if (winEnd > introBeats && winStart < bodyEndBeat) {
        const relStart = Math.max(0, winStart - introBeats);
        const relEnd = Math.min(chorusBeats * CHORUSES_PER_TRACK, winEnd - introBeats);
        const startChorus = Math.floor(relStart / chorusBeats);
        const endChorus = Math.min(CHORUSES_PER_TRACK - 1, Math.floor(relEnd / chorusBeats));

        for (let cIdx = startChorus; cIdx <= endChorus; cIdx++) {
          const chorusOffset = introBeats + cIdx * chorusBeats;
          const isBassFeature = cIdx === 3;
          const isRhodesImprov = cIdx === 4;
          const isQuartetJam = cIdx === 5;
          const isHeadOut = cIdx === 6;
          const compVel = isBassFeature ? 0.46 : cIdx === 2 ? 0.56 : 0.64;

          // 1. Rhodes Comping Chords
          for (let i = 0; i < chart.chords.length; i++) {
            const ch = chart.chords[i];
            const absBeat = chorusOffset + ch.bar * ts + ch.beat;
            if (absBeat > winStart && absBeat <= winEnd) {
              const nextCh = chart.chords[i + 1];
              const chordDurBeats = nextCh
                ? Math.max(1, (nextCh.bar - ch.bar) * ts + (nextCh.beat - ch.beat))
                : Math.max(1, ts - ch.beat);
              const durSec = Math.min(chordDurBeats * spb * 0.92, 2.5);
              playCompChord(ch.notes, beatToCtxTime(absBeat, chart, 7), durSec, compVel);

              // Syncopated jazz comping push on solo & quartet choruses
              if (chordDurBeats >= 3 && (cIdx === 1 || cIdx === 2 || isRhodesImprov || isQuartetJam) && chart.groove !== 'ballad') {
                const pushBeat = absBeat + (chart.groove === 'bossa' ? 1.5 : 2.5);
                if (pushBeat < chorusOffset + chorusBeats) {
                  playCompChord(ch.notes, beatToCtxTime(pushBeat, chart, 8), spb * 0.65, compVel * 0.72);
                }
              }

              // Delicate vibraphone bell shimmer on bar downbeats during Bass Feature
              if (isBassFeature && ch.beat === 0 && ch.bar % 2 === 0 && ch.notes.length) {
                const topNote = ch.notes[ch.notes.length - 1] + 12;
                if (topNote <= 84) {
                  playVibesNote(topNote, beatToCtxTime(absBeat, chart, 9), spb * 2.2, 0.42);
                }
              }
            }
          }

          // 2. Walking Upright Bass (steps forward in Chorus 3: Bass Feature!)
          const bassVel = isBassFeature ? 1.0 : 0.84;
          for (let i = 0; i < chart.bass.length; i++) {
            const b = chart.bass[i];
            const absBeat = chorusOffset + b.bar * ts + b.beat;
            if (absBeat > winStart && absBeat <= winEnd) {
              playUprightBass(b.midi, beatToCtxTime(absBeat, chart, 5), b.dur * spb, bassVel);
              // Tasteful bass-feature skip note into next bar
              if (isBassFeature && b.beat === ts - 1 && b.bar % 2 === 1) {
                const nextB = chart.bass[i + 1];
                if (nextB) {
                  const approach = nextB.midi + (b.midi < nextB.midi ? -1 : 1);
                  playUprightBass(approach, beatToCtxTime(absBeat + 0.5, chart, 4), spb * 0.45, 0.76);
                }
              }
            }
          }

          // 3. Lead Voice Routing by Chorus
          if (cIdx === 0) {
            // Head: Fender Rhodes plays the recognizable classic jazz melody
            for (const n of chart.melody) {
              const absBeat = chorusOffset + n.bar * ts + n.beat;
              if (absBeat > winStart && absBeat <= winEnd) {
                playRhodesNote(n.midi, beatToCtxTime(absBeat, chart, 6), n.dur * spb, n.vel, false);
              }
            }
          } else if (cIdx === 1) {
            // Rhodes Solo: arranger's improvised Rhodes solo chorus
            const soloList = chart.solo && chart.solo.length ? chart.solo : chart.melody;
            for (const n of soloList) {
              const absBeat = chorusOffset + n.bar * ts + n.beat;
              if (absBeat > winStart && absBeat <= winEnd) {
                playRhodesNote(n.midi, beatToCtxTime(absBeat, chart, 6), n.dur * spb, n.vel, false);
              }
            }
          } else if (cIdx === 2) {
            // Vibes Solo: live-improvised warm Jazz Vibraphone solo
            for (const n of generatedVibesSolo) {
              const absBeat = chorusOffset + n.bar * ts + n.beat;
              if (absBeat > winStart && absBeat <= winEnd) {
                playVibesNote(n.midi, beatToCtxTime(absBeat, chart, 7), n.dur * spb, n.vel);
              }
            }
          } else if (isRhodesImprov) {
            // Rhodes Improv: fresh live-improvised Rhodes chorus over the changes
            for (const n of generatedRhodesImprov) {
              const absBeat = chorusOffset + n.bar * ts + n.beat;
              if (absBeat > winStart && absBeat <= winEnd) {
                playRhodesNote(n.midi, beatToCtxTime(absBeat, chart, 6), n.dur * spb, n.vel, false);
              }
            }
          } else if (isQuartetJam) {
            // Trading 4s: 4 bars Rhodes solo <-> 4 bars Vibraphone solo!
            const soloList = chart.solo && chart.solo.length ? chart.solo : chart.melody;
            for (const n of soloList) {
              if (Math.floor(n.bar / 4) % 2 === 0) {
                const absBeat = chorusOffset + n.bar * ts + n.beat;
                if (absBeat > winStart && absBeat <= winEnd) {
                  playRhodesNote(n.midi, beatToCtxTime(absBeat, chart, 6), n.dur * spb, n.vel, false);
                }
              }
            }
            for (const n of generatedQuartetVibes) {
              if (Math.floor(n.bar / 4) % 2 === 1) {
                const absBeat = chorusOffset + n.bar * ts + n.beat;
                if (absBeat > winStart && absBeat <= winEnd) {
                  playVibesNote(n.midi, beatToCtxTime(absBeat, chart, 7), n.dur * spb, n.vel);
                }
              }
            }
          } else if (isHeadOut) {
            // Head Out: Rhodes melody + warm Vibraphone shimmer doubling accented notes + grace-note scoops
            for (let i = 0; i < chart.melody.length; i++) {
              const n = chart.melody[i];
              const absBeat = chorusOffset + n.bar * ts + n.beat;
              if (absBeat > winStart && absBeat <= winEnd) {
                const when = beatToCtxTime(absBeat, chart, 6);
                if (n.vel >= 0.82 && i % 5 === 1 && n.dur >= 0.75) {
                  playRhodesNote(n.midi - 1, Math.max(ctx.currentTime + 0.002, when - 0.036), 0.055, n.vel * 0.45, false);
                }
                playRhodesNote(n.midi, when, n.dur * spb, n.vel, false);
                if (i % 3 === 0 || n.dur >= 1.2) {
                  playVibesNote(n.midi, when + 0.012, n.dur * spb, n.vel * 0.56);
                }
              }
            }
          }

          // 4. Brushed Drums
          const drumIntensity = isBassFeature ? 0.82 : isQuartetJam ? 1.08 : cIdx === 1 || cIdx === 2 || isRhodesImprov ? 1.02 : 0.92;
          const firstBar = Math.max(0, Math.floor((winStart - chorusOffset) / ts));
          const lastBar = Math.min(chart.bars - 1, Math.floor((winEnd - chorusOffset) / ts));
          for (let bIdx = firstBar; bIdx <= lastBar; bIdx++) {
            const absBar = INTRO_BARS + cIdx * chart.bars + bIdx;
            scheduleBarDrums(chart, absBar, drumIntensity, winStart, winEnd);
          }
        }
      }

      // C) 2-BAR WARM JAZZ CLUB ENDING CADENCE (final resolved tonic chord + soft ride ring)
      if (winEnd > bodyEndBeat) {
        const resolveBeat = bodyEndBeat;
        if (resolveBeat > winStart && resolveBeat <= winEnd) {
          const homeChord = chart.chords[0];
          const homeBass = chart.bass[0];
          const when = beatToCtxTime(resolveBeat, chart, 4);
          if (homeChord) {
            playCompChord(homeChord.notes, when, spb * ts * 1.8, 0.68);
            const top = homeChord.notes[homeChord.notes.length - 1] + 12;
            if (top <= 84) playVibesNote(top, when + 0.06, spb * ts * 1.9, 0.58);
          }
          if (homeBass) {
            playUprightBass(homeBass.midi, when, spb * ts * 1.7, 0.82);
          }
          playRide(when, 0.58, true);
        }
      }

      lastScheduledBeat = winEnd;
    }

    // Update live section & chord symbol for UI
    const clampedBeat = Math.max(0, Math.min(total, nowBeat));
    let section = 'Intro';
    let sym = lastChordSymbol;

    if (clampedBeat < introBeats) {
      section = 'Intro';
      const vampBar = Math.max(0, chart.bars - INTRO_BARS) + Math.floor(clampedBeat / ts);
      const curBeatInBar = clampedBeat % ts;
      sym = chordAt(chart, vampBar, curBeatInBar).symbol;
    } else if (clampedBeat >= bodyEndBeat) {
      section = 'Finale';
      sym = chart.chords[0] ? chart.chords[0].symbol : '';
    } else {
      const rel = clampedBeat - introBeats;
      const cIdx = Math.min(CHORUSES_PER_TRACK - 1, Math.floor(rel / chorusBeats));
      section = CHORUS_LABELS[cIdx] || 'Head';
      const beatInChorus = rel - cIdx * chorusBeats;
      const curBar = Math.floor(beatInChorus / ts);
      const curBeatInBar = beatInChorus - curBar * ts;
      sym = chordAt(chart, curBar, curBeatInBar).symbol;
    }

    const metaChanged = sym !== lastChordSymbol || section !== lastSectionLabel;
    lastChordSymbol = sym;
    lastSectionLabel = section;

    if (typeof onStateChange === 'function') {
      onStateChange(metaChanged ? 'meta' : 'time');
    }
  }

  function stopInternal(keepPosition = true) {
    if (schedulerTimer) {
      clearInterval(schedulerTimer);
      schedulerTimer = null;
    }
    if (playing && currentChart && ctx && keepPosition) {
      const spb = 60 / currentChart.bpm;
      pausedAtBeat = Math.max(0, Math.min(totalBeats(currentChart), (ctx.currentTime - startTimeCtx) / spb));
    }
    playing = false;
  }

  function loadChart(chart, autoplay = false) {
    stopInternal(false);
    currentChart = chart;
    generatedVibesSolo = buildLiveVibesSolo(chart, false);
    generatedRhodesImprov = buildLiveVibesSolo(chart, false);
    generatedQuartetVibes = buildLiveVibesSolo(chart, false);
    pausedAtBeat = 0;
    lastScheduledBeat = -0.001;
    lastSectionLabel = 'Intro';
    lastChordSymbol = chart && chart.chords && chart.chords[0] ? chart.chords[0].symbol : '';
    if (autoplay && chart) {
      play();
    } else if (typeof onStateChange === 'function') {
      onStateChange('state');
    }
  }

  function play() {
    if (!currentChart) return;
    const audioCtx = ensureAudio();
    if (!audioCtx) return;

    const spb = 60 / currentChart.bpm;
    if (pausedAtBeat >= totalBeats(currentChart) - 0.1) {
      pausedAtBeat = 0;
      generatedVibesSolo = buildLiveVibesSolo(currentChart, false);
      generatedRhodesImprov = buildLiveVibesSolo(currentChart, false);
      generatedQuartetVibes = buildLiveVibesSolo(currentChart, false);
    }
    startTimeCtx = audioCtx.currentTime - pausedAtBeat * spb + 0.04;
    lastScheduledBeat = pausedAtBeat - 0.001;
    playing = true;
    applyGainSmooth(0.05);

    if (schedulerTimer) clearInterval(schedulerTimer);
    scheduleTick();
    schedulerTimer = setInterval(scheduleTick, LOOKAHEAD_MS);

    if (typeof onStateChange === 'function') {
      onStateChange('state');
    }
  }

  function pause() {
    if (!playing) return;
    stopInternal(true);
    if (typeof onStateChange === 'function') {
      onStateChange('state');
    }
  }

  function stop() {
    stopInternal(false);
    pausedAtBeat = 0;
    lastScheduledBeat = -0.001;
    if (typeof onStateChange === 'function') {
      onStateChange('state');
    }
  }

  function seek(fraction) {
    if (!currentChart) return;
    const clamped = Math.max(0, Math.min(1, Number(fraction) || 0));
    const targetBeat = clamped * totalBeats(currentChart);
    const wasPlaying = playing;
    stopInternal(false);
    pausedAtBeat = targetBeat;
    lastScheduledBeat = targetBeat - 0.001;
    if (wasPlaying) {
      play();
    } else if (typeof onStateChange === 'function') {
      onStateChange('time');
    }
  }

  function setVolume(vol) {
    baseVolume = Math.max(0, Math.min(1, Number(vol) || 0));
    applyGainSmooth(0.05);
  }

  function setDucking(ducking) {
    isDucking = Boolean(ducking);
    applyGainSmooth(ducking ? 0.04 : 0.18);
  }

  function getProgress() {
    if (!currentChart) {
      return { currentTime: 0, duration: 0, chordSymbol: '', chorusLabel: '' };
    }
    const dur = durationSeconds(currentChart);
    const spb = 60 / currentChart.bpm;
    const curBeat = playing && ctx
      ? Math.max(0, Math.min(totalBeats(currentChart), (ctx.currentTime - startTimeCtx) / spb))
      : pausedAtBeat;
    return {
      currentTime: curBeat * spb,
      duration: dur,
      chordSymbol: lastChordSymbol || (currentChart.chords[0] ? currentChart.chords[0].symbol : ''),
      chorusLabel: lastSectionLabel || 'Intro'
    };
  }

  function estimateTrackSeconds(chart) {
    return durationSeconds(chart);
  }

  function setCallbacks({ onChange, onEnded } = {}) {
    onStateChange = onChange || null;
    onTrackEnded = onEnded || null;
  }

  const BadSantaJazzEngine = {
    loadChart,
    play,
    pause,
    stop,
    seek,
    setVolume,
    setDucking,
    getProgress,
    estimateTrackSeconds,
    setCallbacks,
    isPlaying: () => playing,
    CHORUSES_PER_TRACK
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BadSantaJazzEngine;
  } else {
    globalScope.BadSantaJazzEngine = BadSantaJazzEngine;
  }
})(typeof window !== 'undefined' ? window : globalThis);
