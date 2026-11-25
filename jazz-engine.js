// Real-time Web Audio Jazz Trio Synthesizer (Rhodes, Upright Bass, Brushed Drums, Room Reverb)
(function initBadSantaJazzEngine(globalScope) {
  const CHORUSES_PER_TRACK = 3; // 0 = Head, 1 = Rhodes Solo, 2 = Head Out
  const CHORUS_LABELS = ['Head', 'Rhodes Solo', 'Head Out'];
  const LOOKAHEAD_MS = 30;
  const SCHEDULE_AHEAD_SEC = 0.16;

  let ctx = null;
  let masterGain = null;
  let dryGain = null;
  let reverbGain = null;
  let reverbNode = null;
  let noiseBuffer = null;

  let currentChart = null;
  let playing = false;
  let baseVolume = 0.35;
  let isDucking = false;

  let schedulerTimer = null;
  let startTimeCtx = 0; // audioCtx.currentTime corresponding to song beat 0
  let pausedAtBeat = 0;
  let lastScheduledBeat = -0.001;
  let lastChordSymbol = '';
  let lastChorusIndex = 0;
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
      dryGain.gain.value = 0.86;

      reverbGain = ctx.createGain();
      reverbGain.gain.value = 0.24;

      reverbNode = ctx.createConvolver();
      reverbNode.buffer = buildWarmRoomIR(ctx, 1.35);

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
        const env = Math.pow(1 - t, 2.8);
        const white = (Math.random() * 2 - 1) * env;
        lp = lp * 0.72 + white * 0.28; // warm wood-paneled room absorption
        data[i] = lp * 0.55;
      }
    }
    return ir;
  }

  function effectiveGain() {
    // Jazz trio master gain calibrated to sit comfortably alongside classic MP3s
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
    const hold = Math.max(0.14, Math.min(3.4, durSec));
    const peak = (isComp ? 0.072 : 0.175) * vel;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const startCut = isComp ? 1150 + vel * 650 : 1750 + vel * 2000;
    const endCut = isComp ? 620 : 880;
    filter.frequency.setValueAtTime(startCut, when);
    filter.frequency.exponentialRampToValueAtTime(endCut, when + Math.min(hold, 0.85));
    filter.Q.value = 0.9;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, when);
    env.gain.linearRampToValueAtTime(peak, when + 0.011);
    env.gain.exponentialRampToValueAtTime(peak * 0.56, when + Math.min(0.24, hold * 0.45));
    env.gain.exponentialRampToValueAtTime(0.0001, when + hold + 0.24);

    // Warm fundamental sine
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, when);

    // Subtle 2nd harmonic warmth
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, when);
    osc2.detune.setValueAtTime(1.8, when);
    g2.gain.setValueAtTime(isComp ? 0.09 : 0.16, when);
    g2.gain.exponentialRampToValueAtTime(0.001, when + Math.min(0.45, hold * 0.8));

    // Iconic Rhodes tine bell transient
    const tine = ctx.createOscillator();
    const gTine = ctx.createGain();
    tine.type = 'sine';
    tine.frequency.setValueAtTime(freq * 4, when);
    gTine.gain.setValueAtTime((isComp ? 0.04 : 0.12) * vel, when);
    gTine.gain.exponentialRampToValueAtTime(0.0001, when + 0.075);

    osc1.connect(filter);
    osc2.connect(g2);
    g2.connect(filter);
    tine.connect(gTine);
    gTine.connect(filter);

    filter.connect(env);
    // Natural piano stereo spread (lower notes slightly left, upper right)
    const pan = isComp ? -0.18 : Math.max(-0.25, Math.min(0.32, (midi - 66) * 0.025));
    connectVoice(env, pan, true);

    const stopAt = when + hold + 0.28;
    osc1.start(when);
    osc2.start(when);
    tine.start(when);
    osc1.stop(stopAt);
    osc2.stop(stopAt);
    tine.stop(when + 0.09);
  }

  function playCompChord(notes, when, durSec, vel = 0.65) {
    if (!Array.isArray(notes) || !notes.length) return;
    // Gentle pianist roll across chord voicing (12-16ms per finger)
    notes.forEach((midi, idx) => {
      playRhodesNote(midi, when + idx * 0.014, durSec, vel * (0.92 + (idx % 2) * 0.08), true);
    });
  }

  // ---- Instrument 2: Plucked Acoustic Upright Bass ----
  function playUprightBass(midi, when, durSec, vel = 0.82) {
    const freq = midiToHz(midi);
    const hold = Math.max(0.18, Math.min(2.2, durSec));
    const peak = 0.34 * vel;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(580, when);
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
    connectVoice(env, -0.08, false);

    const stopAt = when + hold + 0.2;
    body.start(when);
    string.start(when);
    body.stop(stopAt);
    string.stop(stopAt);
  }

  // ---- Instrument 3: Brushed Jazz Drum Kit ----
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
    connectVoice(env, 0.26, true);

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
    connectVoice(env, 0.12, true);
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

  // ---- Swing & Timing Math ----
  function totalBeats(chart) {
    return chart.bars * chart.timeSig * CHORUSES_PER_TRACK;
  }

  function durationSeconds(chart) {
    if (!chart) return 0;
    return (totalBeats(chart) * 60) / chart.bpm;
  }

  function applySwingOffset(beatInBar, swingRatio) {
    if (!swingRatio || swingRatio <= 0.5) return beatInBar;
    const whole = Math.floor(beatInBar);
    const frac = beatInBar - whole;
    // Map straight offbeat 0.5 -> swingRatio (e.g. 0.60) smoothly
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
  function scheduleBarDrums(chart, chorusIdx, barInChorus, winStartBeat, winEndBeat) {
    const ts = chart.timeSig;
    const baseBeat = (chorusIdx * chart.bars + barInChorus) * ts;
    const groove = chart.groove || 'swing';
    const intensity = chorusIdx === 1 ? 1.08 : 0.92; // slightly livelier during Rhodes solo

    const events = [];
    if (groove === 'bossa') {
      // Crisp 8th-note ride/shaker + woody clave rim-click + soft bossa kick
      for (let b = 0; b < ts; b += 0.5) {
        events.push({ b, fn: (t) => playRide(t, (b % 1 === 0 ? 0.52 : 0.36) * intensity, b === 0) });
      }
      events.push({ b: 0, fn: (t) => playFeatherKick(t, 0.58) });
      events.push({ b: 1.5, fn: (t) => playFeatherKick(t, 0.42) });
      events.push({ b: 2, fn: (t) => playFeatherKick(t, 0.52) });
      events.push({ b: 3.5, fn: (t) => playFeatherKick(t, 0.38) });
      const clave = barInChorus % 2 === 0 ? [0, 1.5, 3] : [0.5, 2];
      for (const cb of clave) {
        events.push({ b: cb, fn: (t) => playRimClick(t, 0.62 * intensity) });
      }
    } else if (groove === 'waltz') {
      // 3/4 Jazz Waltz: ride 1, 2, 3, 3-and + hi-hat chick on beat 2 + gentle brush
      events.push({ b: 0, fn: (t) => playRide(t, 0.66 * intensity, true) });
      events.push({ b: 1, fn: (t) => { playRide(t, 0.46 * intensity, false); playHatChick(t, 0.52); } });
      events.push({ b: 2, fn: (t) => playRide(t, 0.58 * intensity, false) });
      events.push({ b: 2.5, fn: (t) => playRide(t, 0.42 * intensity, false) });
      events.push({ b: 0, fn: (t) => playFeatherKick(t, 0.42) });
      if (barInChorus % 2 === 1) {
        events.push({ b: 1.5, fn: (t) => playBrush(t, 0.14, 0.38 * intensity) });
      }
    } else if (groove === 'ballad') {
      // Lush soft brushes + delicate ride whisper
      events.push({ b: 0, fn: (t) => playBrush(t, 0.34, 0.45) });
      events.push({ b: 1, fn: (t) => playHatChick(t, 0.30) });
      events.push({ b: 2, fn: (t) => playRide(t, 0.38, false) });
      if (barInChorus % 2 === 1) {
        events.push({ b: 2.5, fn: (t) => playBrush(t, 0.18, 0.30) });
      }
    } else {
      // Classic 4/4 Swing: ting - ting - a - ting - ting - a
      events.push({ b: 0, fn: (t) => { playRide(t, 0.68 * intensity, true); playFeatherKick(t, 0.44); } });
      events.push({ b: 1, fn: (t) => { playRide(t, 0.54 * intensity, false); playHatChick(t, 0.62 * intensity); } });
      events.push({ b: 1.5, fn: (t) => playRide(t, 0.44 * intensity, false) });
      events.push({ b: 2, fn: (t) => playRide(t, 0.66 * intensity, true) });
      events.push({ b: 3, fn: (t) => { playRide(t, 0.54 * intensity, false); playHatChick(t, 0.62 * intensity); } });
      events.push({ b: 3.5, fn: (t) => playRide(t, 0.44 * intensity, false) });
      if (barInChorus % 2 === 1) {
        events.push({ b: 2.5, fn: (t) => playBrush(t, 0.13, 0.40 * intensity) });
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
      const ts = chart.timeSig;
      const chorusBeats = chart.bars * ts;
      const startChorus = Math.max(0, Math.floor(Math.max(0, winStart) / chorusBeats));
      const endChorus = Math.min(CHORUSES_PER_TRACK - 1, Math.floor(winEnd / chorusBeats));

      for (let cIdx = startChorus; cIdx <= endChorus; cIdx++) {
        const chorusOffset = cIdx * chorusBeats;

        // 1. Schedule Rhodes Chords (with live syncopated comping hit on Chorus 1 & 2)
        for (let i = 0; i < chart.chords.length; i++) {
          const ch = chart.chords[i];
          const absBeat = chorusOffset + ch.bar * ts + ch.beat;
          if (absBeat > winStart && absBeat <= winEnd) {
            const nextCh = chart.chords[i + 1];
            const chordDurBeats = nextCh
              ? Math.max(1, (nextCh.bar - ch.bar) * ts + (nextCh.beat - ch.beat))
              : Math.max(1, ts - ch.beat);
            const durSec = Math.min(chordDurBeats * spb * 0.92, 2.4);
            playCompChord(ch.notes, beatToCtxTime(absBeat, chart, 7), durSec, 0.64);

            // Live jazz comping push (syncopated Charleston / offbeat comp) when chord lasts >= 3 beats
            if (chordDurBeats >= 3 && cIdx >= 1 && chart.groove !== 'ballad') {
              const pushBeat = absBeat + (chart.groove === 'bossa' ? 1.5 : 2.5);
              if (pushBeat < chorusOffset + chorusBeats) {
                playCompChord(ch.notes, beatToCtxTime(pushBeat, chart, 8), spb * 0.65, 0.44);
              }
            }
          }
        }

        // 2. Schedule Walking Upright Bass
        for (const b of chart.bass) {
          const absBeat = chorusOffset + b.bar * ts + b.beat;
          if (absBeat > winStart && absBeat <= winEnd) {
            playUprightBass(b.midi, beatToCtxTime(absBeat, chart, 5), b.dur * spb, 0.84);
          }
        }

        // 3. Schedule Lead Rhodes (Chorus 0 = Head, Chorus 1 = Jazz Solo, Chorus 2 = Head Out w/ ornaments)
        const leadNotes = cIdx === 1 && chart.solo && chart.solo.length ? chart.solo : chart.melody;
        for (let i = 0; i < leadNotes.length; i++) {
          const n = leadNotes[i];
          const absBeat = chorusOffset + n.bar * ts + n.beat;
          if (absBeat > winStart && absBeat <= winEnd) {
            const when = beatToCtxTime(absBeat, chart, 6);
            // Subtle jazz chromatic grace-note scoop on Chorus 2 ("Head Out") for accented notes
            if (cIdx === 2 && n.vel >= 0.82 && i % 5 === 1 && n.dur >= 0.75) {
              playRhodesNote(n.midi - 1, Math.max(ctx.currentTime + 0.002, when - 0.036), 0.055, n.vel * 0.45, false);
            }
            playRhodesNote(n.midi, when, n.dur * spb, n.vel, false);
          }
        }

        // 4. Schedule Brushed Drums for bars intersecting [winStart, winEnd]
        const firstBar = Math.max(0, Math.floor((winStart - chorusOffset) / ts));
        const lastBar = Math.min(chart.bars - 1, Math.floor((winEnd - chorusOffset) / ts));
        for (let bIdx = firstBar; bIdx <= lastBar; bIdx++) {
          scheduleBarDrums(chart, cIdx, bIdx, winStart, winEnd);
        }
      }

      lastScheduledBeat = winEnd;
    }

    // Update live chorus & current chord symbol for UI display
    const clampedBeat = Math.max(0, Math.min(total, nowBeat));
    const chorusBeats = chart.bars * chart.timeSig;
    const cIdx = Math.min(CHORUSES_PER_TRACK - 1, Math.floor(clampedBeat / chorusBeats));
    const beatInChorus = clampedBeat - cIdx * chorusBeats;
    const curBar = Math.floor(beatInChorus / chart.timeSig);
    const curBeatInBar = beatInChorus - curBar * chart.timeSig;

    let sym = lastChordSymbol;
    for (let i = chart.chords.length - 1; i >= 0; i--) {
      const ch = chart.chords[i];
      if (ch.bar < curBar || (ch.bar === curBar && ch.beat <= curBeatInBar + 0.05)) {
        sym = ch.symbol;
        break;
      }
    }

    const metaChanged = sym !== lastChordSymbol || cIdx !== lastChorusIndex;
    lastChordSymbol = sym;
    lastChorusIndex = cIdx;

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
    pausedAtBeat = 0;
    lastScheduledBeat = -0.001;
    lastChorusIndex = 0;
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
      chorusLabel: CHORUS_LABELS[lastChorusIndex] || 'Head'
    };
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
