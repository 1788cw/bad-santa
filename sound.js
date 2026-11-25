// Lightweight synthesized festive audio using Web Audio API (no external audio assets needed)
(function initBadSantaSound() {
  let ctx = null;
  let enabled = localStorage.getItem('badsanta_sound') !== 'off';

  function getContext() {
    if (!enabled) return null;
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      ctx = new AudioCtx();
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function tone(freq, startOffset, duration, type = 'sine', gainVal = 0.08) {
    const audio = getContext();
    if (!audio) return;
    const now = audio.currentTime + startOffset;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainVal, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  const SoundFX = {
    isEnabled() {
      return enabled;
    },
    toggle() {
      enabled = !enabled;
      localStorage.setItem('badsanta_sound', enabled ? 'on' : 'off');
      if (enabled) this.chime();
      return enabled;
    },
    chime() {
      tone(523.25, 0, 0.16, 'triangle', 0.08);
      tone(659.25, 0.08, 0.18, 'triangle', 0.08);
      tone(783.99, 0.16, 0.28, 'triangle', 0.09);
    },
    unwrap() {
      tone(440, 0, 0.12, 'triangle', 0.07);
      tone(554.37, 0.07, 0.14, 'triangle', 0.08);
      tone(659.25, 0.14, 0.16, 'triangle', 0.09);
      tone(880, 0.22, 0.34, 'sine', 0.09);
    },
    steal() {
      tone(392, 0, 0.14, 'sawtooth', 0.055);
      tone(369.99, 0.12, 0.14, 'sawtooth', 0.055);
      tone(311.13, 0.24, 0.28, 'sawtooth', 0.065);
    },
    freeze() {
      tone(1046.5, 0, 0.22, 'sine', 0.07);
      tone(1318.5, 0.08, 0.25, 'sine', 0.07);
      tone(1567.98, 0.16, 0.38, 'sine', 0.08);
    },
    fanfare() {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((n, idx) => tone(n, idx * 0.1, 0.32, 'triangle', 0.09));
    }
  };

  window.BadSantaSound = SoundFX;
})();
