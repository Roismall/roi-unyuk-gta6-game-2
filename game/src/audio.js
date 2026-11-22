// Procedural WebAudio for Solmar Bay: three radio stations and all SFX.
// No audio files anywhere; every sound is synthesized.
const AudioSys = {
  ctx: null, master: null, radioGain: null, sfxGain: null,
  station: 0, radioOn: true, nextNoteTime: 0, step: 0,
  engineOsc: null, engineGain: null, sirenOsc: null, sirenGain: null,
  muted: false,

  init: function () {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.radioGain = this.ctx.createGain();
      this.radioGain.gain.value = 0.16;
      this.radioGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.5;
      this.sfxGain.connect(this.master);
      // Engine hum.
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 50;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start();
      // Siren wail.
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'sine';
      this.sirenOsc.frequency.value = 750;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.master);
      this.sirenOsc.start();
      this.nextNoteTime = this.ctx.currentTime + 0.1;
    } catch (e) { this.ctx = null; }
  },

  resume: function () {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  setMuted: function (m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  },

  setEngine: function (speedFrac, inCar) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(45 + speedFrac * 160, t, 0.1);
    this.engineGain.gain.setTargetAtTime(inCar ? 0.05 + speedFrac * 0.05 : 0, t, 0.1);
  },

  setSiren: function (on) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.sirenGain.gain.setTargetAtTime(on ? 0.045 : 0, t, 0.2);
    if (on) {
      // Two-tone wail via slow frequency ramp.
      const f = this.sirenOsc.frequency;
      f.cancelScheduledValues(t);
      f.setValueAtTime(700, t);
      f.linearRampToValueAtTime(1050, t + 0.45);
      f.linearRampToValueAtTime(700, t + 0.9);
    }
  },

  blip: function (freq, dur, type, vol) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + (dur || 0.12));
    o.connect(g); g.connect(this.sfxGain);
    o.start(t); o.stop(t + (dur || 0.12) + 0.02);
  },

  noise: function (dur, vol, low) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const flt = this.ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = low || 1200;
    const g = this.ctx.createGain();
    g.gain.value = vol || 0.3;
    src.connect(flt); flt.connect(g); g.connect(this.sfxGain);
    src.start(t);
  },

  shot: function () { this.noise(0.14, 0.5, 2600); this.blip(160, 0.08, 'square', 0.25); },
  pickup: function () { this.blip(880, 0.09, 'sine', 0.3); this.blip(1320, 0.12, 'sine', 0.25); },
  crash: function () { this.noise(0.25, 0.45, 500); },
  cash: function () { this.blip(1046, 0.08, 'sine', 0.3); this.blip(1568, 0.14, 'sine', 0.3); },
  busted: function () { this.blip(220, 0.5, 'sawtooth', 0.3); this.blip(165, 0.7, 'sawtooth', 0.3); },
  win: function () {
    const notes = [523, 659, 784, 1046, 1318];
    notes.forEach((f, i) => {
      setTimeout(() => this.blip(f, 0.25, 'triangle', 0.3), i * 130);
    });
  },

  // Tiny step sequencer: 16 steps, one bar per station pattern.
  tickRadio: function () {
    if (!this.ctx || !this.radioOn || this.muted) return;
    const spb = 60 / [112, 128, 96][this.station] / 4; // 16th note
    while (this.nextNoteTime < this.ctx.currentTime + 0.25) {
      this.scheduleStep(this.step, this.nextNoteTime, spb);
      this.nextNoteTime += spb;
      this.step = (this.step + 1) % 16;
    }
  },

  scheduleStep: function (step, t, spb) {
    const bassLines = [
      [0, 0, 7, 0, 5, 0, 7, 10, 0, 0, 7, 0, 5, 3, 2, 0],   // lo-fi
      [0, 0, 0, 12, 0, 0, 10, 0, 0, 0, 0, 12, 0, 10, 7, 0], // synth
      [0, 3, 0, 5, 0, 7, 0, 5, 0, 3, 0, 0, 5, 0, 7, 10]      // latin
    ];
    const roots = [110, 98, 130.8];
    const bass = bassLines[this.station][step];
    if (bass !== undefined) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = this.station === 1 ? 'sawtooth' : 'triangle';
      o.frequency.value = roots[this.station] * Math.pow(2, bass / 12);
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + spb * 1.8);
      o.connect(g); g.connect(this.radioGain);
      o.start(t); o.stop(t + spb * 2);
    }
    // Hat on off-beats for stations 1 and 2.
    if ((this.station === 1 || this.station === 2) && step % 2 === 1) {
      const len = Math.floor(this.ctx.sampleRate * 0.03);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const g = this.ctx.createGain();
      g.gain.value = 0.08;
      src.connect(g); g.connect(this.radioGain);
      src.start(t);
    }
    // Sparkle lead every bar start on the lo-fi station.
    if (this.station === 0 && step === 0) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + spb * 4);
      o.connect(g); g.connect(this.radioGain);
      o.start(t); o.stop(t + spb * 4);
    }
  },

  nextStation: function () {
    this.station = (this.station + 1) % 3;
    this.step = 0;
    if (this.ctx) this.nextNoteTime = this.ctx.currentTime + 0.05;
    return this.station;
  }
};

const STATION_NAMES = ['Bay FM 112 — Lo-Fi Sunset', 'Neon Drive 128 — Synthwave', 'Sol 96 — Latin Heat'];
