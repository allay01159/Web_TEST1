'use strict';

window.NoirCircus = window.NoirCircus || {};

(function (NC) {
  class SoundEngine {
    constructor() {
      this.ac = null;
      this.muted = false;
      this.noiseBuffer = null;
    }

    init() {
      try {
        if (!this.ac) {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          this.ac = new AudioCtx();
          this._buildNoiseBuffer();
        }
        if (this.ac.state === 'suspended') {
          this.ac.resume().catch(() => {});
        }
      } catch (e) {
        // AudioContext blocked or unavailable
      }
    }

    _buildNoiseBuffer() {
      if (!this.ac) return;
      const sr = this.ac.sampleRate;
      const len = sr * 1.2;
      const buf = this.ac.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buf;
    }

    toggleMute() {
      this.muted = !this.muted;
      this.init();
      if (!this.muted) {
        this.tone(440, 0.12, 0.04, 520, 'sine', 0);
      }
      return this.muted;
    }

    tone(freq, dur = 0.15, vol = 0.05, toFreq = freq, type = 'sine', delay = 0) {
      if (this.muted || !this.ac) return;
      const t = this.ac.currentTime + delay;
      const osc = this.ac.createOscillator();
      const gain = this.ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(15, freq), t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(15, toFreq), t + dur);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      osc.connect(gain).connect(this.ac.destination);
      osc.start(t);
      osc.stop(t + dur + 0.03);
    }

    noise(dur = 0.25, vol = 0.04, filterFreq = 800, filterType = 'bandpass', delay = 0) {
      if (this.muted || !this.ac || !this.noiseBuffer) return;
      const t = this.ac.currentTime + delay;
      const src = this.ac.createBufferSource();
      src.buffer = this.noiseBuffer;

      const filter = this.ac.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.setValueAtTime(filterFreq, t);
      filter.Q.setValueAtTime(1.8, t);

      const gain = this.ac.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      src.connect(filter).connect(gain).connect(this.ac.destination);
      src.start(t);
      src.stop(t + dur + 0.03);
    }

    playFootstep(running) {
      this.tone(running ? 112 : 94, 0.075, running ? 0.042 : 0.028, 38, 'sine');
      this.noise(0.04, running ? 0.015 : 0.008, 650, 'bandpass');
    }

    playEnemyStep(dist, aggro) {
      const att = NC.clamp(1 - dist / 8.5, 0, 1);
      if (att <= 0.01) return;
      this.tone(aggro ? 84 : 70, 0.21, 0.085 * att, 30, 'triangle');
      this.noise(0.09, 0.025 * att, 340, 'lowpass');
    }

    playHeartbeat(intensity) {
      const vol = 0.065 * NC.clamp(intensity, 0.1, 1);
      this.tone(58, 0.11, vol, 34, 'sine', 0);
      this.tone(52, 0.14, vol * 0.8, 30, 'sine', 0.16);
    }

    playHide(entering, spotType) {
      if (spotType === 'booth') {
        // Heavy velvet curtain rustle
        this.noise(0.32, 0.045, entering ? 950 : 1200, 'bandpass', 0);
        this.tone(entering ? 190 : 230, 0.14, 0.02, entering ? 140 : 280, 'sine', 0.04);
      } else {
        // Wooden wardrobe door creak & latch
        this.tone(entering ? 240 : 290, 0.24, 0.032, entering ? 175 : 340, 'sawtooth', 0);
        this.tone(130, 0.07, 0.03, 75, 'triangle', 0.2);
      }
    }

    playKeyPickup() {
      this.tone(587.33, 0.34, 0.065, 587.33, 'sine', 0);
      this.tone(880, 0.45, 0.04, 880, 'sine', 0.11);
      this.tone(1174.66, 0.5, 0.025, 1174.66, 'triangle', 0.22);
    }

    playToyMelody() {
      const notes = [523.25, 659.25, 587.33, 440, 493.88, 392];
      notes.forEach((f, i) => {
        this.tone(f, 0.38, 0.042, f * 0.995, 'sine', i * 0.18);
      });
    }

    playSpotted() {
      this.tone(145, 0.48, 0.07, 52, 'sawtooth', 0);
      this.tone(310, 0.36, 0.045, 195, 'triangle', 0.03);
      this.noise(0.35, 0.04, 1400, 'bandpass', 0);
    }

    playUnlock() {
      this.tone(180, 0.15, 0.06, 95, 'square', 0);
      this.tone(330, 0.65, 0.06, 330, 'sine', 0.15);
      this.tone(495, 0.75, 0.055, 495, 'sine', 0.32);
      this.tone(660, 0.9, 0.045, 660, 'triangle', 0.48);
    }

    playCapture() {
      this.tone(115, 0.75, 0.095, 32, 'sawtooth', 0);
      this.tone(82, 0.8, 0.08, 28, 'square', 0.04);
      this.noise(0.55, 0.06, 900, 'lowpass', 0);
    }
  }

  NC.SoundEngine = SoundEngine;
})(window.NoirCircus);
