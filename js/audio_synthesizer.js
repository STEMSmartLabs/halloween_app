/**
 * @file audio_synthesizer.js
 * @brief Procedural Web Audio API Sound Engine (100% Offline, Zero External MP3s)
 *
 * Synthesizes spooky Halloween soundscapes, bubbling cauldron liquid, real-time wand whooshes,
 * rhythm metronome pulses, spell combos, and wand level-up fanfares directly using Web Audio oscillators.
 */

class HalloweenAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.ambientGain = null;
    this.sfxGain = null;
    this.isMuted = false;
    this.ambientRunning = false;
    this.bubbleTimer = null;
    this.emberTimer = null;
    this.lastMotionSoundTime = 0;
  }

  /**
   * @brief Initialize or resume AudioContext after user interaction
   */
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Ambient Bus
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.ambientGain.connect(this.masterGain);

      // SFX Bus
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.startAmbientSoundscape();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    if (!this.masterGain) return true;
    this.isMuted = !this.isMuted;
    const targetGain = this.isMuted ? 0 : 0.7;
    this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    return this.isMuted;
  }

  /**
   * @brief Ambient soundscape: Spooky wind, gentle fire crackle, and periodic bubbling
   */
  startAmbientSoundscape() {
    if (this.ambientRunning || !this.ctx) return;
    this.ambientRunning = true;

    // 1. Spooky Low Wind (Brownian noise through bandpass)
    this.startWindSynth();

    // 2. Cauldron Bubbling Scheduler
    this.scheduleCauldronBubbles();
  }

  startWindSynth() {
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }

    const windSource = this.ctx.createBufferSource();
    windSource.buffer = noiseBuffer;
    windSource.loop = true;

    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.setValueAtTime(140, this.ctx.currentTime);
    windFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    // LFO for wind gust swelling
    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.15, this.ctx.currentTime);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(60, this.ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(windFilter.frequency);
    windSource.connect(windFilter);
    windFilter.connect(this.ambientGain);

    windSource.start(0);
    lfo.start(0);
  }

  scheduleCauldronBubbles() {
    const scheduleNext = () => {
      if (this.ambientRunning && this.ctx && !this.isMuted) {
        this.playSingleBubblePop();
      }
      const delay = Math.random() * 1200 + 400;
      this.bubbleTimer = setTimeout(scheduleNext, delay);
    };
    scheduleNext();
  }

  // =========================================================================
  // REAL-TIME WAND MOTION & WHOOSH SOUNDSCAPES (IDEA 2)
  // =========================================================================
  playWandMotionSound(velocity) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    if (now - this.lastMotionSoundTime < 0.08) return; // Throttle to prevent audio buffer congestion
    this.lastMotionSoundTime = now;

    const speed = Math.min(Math.max(velocity, 2), 35);
    const normSpeed = speed / 35; // 0.0 to 1.0

    // Dynamic pitch-shifted magical FM whoosh
    const osc = this.ctx.createOscillator();
    const mod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    const baseFreq = 260 + normSpeed * 480;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.3, now + 0.12);

    mod.type = 'triangle';
    mod.frequency.setValueAtTime(14 + normSpeed * 22, now);
    modGain.gain.setValueAtTime(60 * normSpeed, now);
    mod.connect(modGain);
    modGain.connect(osc.frequency);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(baseFreq * 1.5, now);
    filter.Q.setValueAtTime(4.0, now);

    const targetVol = 0.08 + normSpeed * 0.22;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(targetVol, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    mod.start(now);
    osc.stop(now + 0.2);
    mod.stop(now + 0.2);
  }

  playSpellTargetBeat() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now); // A5
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  playComboJingle(comboCount) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notesByCombo = {
      1: [523.25, 659.25], // C5, E5
      2: [523.25, 659.25, 783.99], // C5, E5, G5
      3: [523.25, 659.25, 783.99, 1046.50], // C5, E5, G5, C6 (Perfect!)
      4: [659.25, 783.99, 1046.50, 1318.51] // E5, G5, C6, E6 (Super Max!)
    };

    const notes = notesByCombo[Math.min(comboCount, 4)] || notesByCombo[2];
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.06;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  playWandLevelUpFanfare() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const melody = [
      { f: 440, d: 0.1 },
      { f: 554.37, d: 0.1 },
      { f: 659.25, d: 0.12 },
      { f: 880, d: 0.15 },
      { f: 1108.73, d: 0.35 }
    ];

    let t = now;
    melody.forEach((note) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.f, t);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.d);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + note.d + 0.05);
      t += note.d * 0.85;
    });
  }

  // =========================================================================
  // GAMEPLAY SOUND EFFECTS
  // =========================================================================
  playSingleBubblePop() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const startFreq = Math.random() * 400 + 500;
    const endFreq = startFreq + Math.random() * 300 + 200;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.06);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(this.ambientGain);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  playBubblePop() {
    this.playSingleBubblePop();
  }

  playIngredientToss() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.18);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  playCauldronStir() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(280, now + 0.15);
    osc.frequency.linearRampToValueAtTime(200, now + 0.35);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  playBubbleFroth() {
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        this.playSingleBubblePop();
      }, i * 40);
    }
  }

  playFlameIgnite() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.35);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.45);
  }

  playSpellCast() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = now + idx * 0.05;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.25, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(noteTime);
      osc.stop(noteTime + 0.45);
    });
  }

  playRecipeCompleteFanfare() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const melody = [
      { f: 440.00, d: 0.12 },
      { f: 523.25, d: 0.12 },
      { f: 659.25, d: 0.15 },
      { f: 880.00, d: 0.35 }
    ];

    let t = now;
    melody.forEach((note) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, t);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.d);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + note.d + 0.05);
      t += note.d * 0.9;
    });
  }

  playMistSweep() {
    this.playWandMotionSound(25);
  }

  playSparkleChime() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1174.66, now);
    osc.frequency.exponentialRampToValueAtTime(1760.00, now + 0.2);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  playDigitUnlockSound() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;

      // 1. Mechanical tumbler click
      const clickOsc = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(300, now);
      clickOsc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
      clickGain.gain.setValueAtTime(0.35, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      clickOsc.connect(clickGain);
      clickGain.connect(this.sfxGain || this.ctx.destination);
      clickOsc.start(now);
      clickOsc.stop(now + 0.09);

      // 2. Shimmering Golden Unlock Chimes
      const chord = [739.99, 932.33, 1108.73, 1479.98]; // F#5, A#5, C#6, F#6
      chord.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + 0.06 + idx * 0.07;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.28, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        osc.connect(gain);
        gain.connect(this.sfxGain || this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.48);
      });
    } catch (e) {
      console.warn("Audio playDigitUnlockSound error:", e);
    }
  }

  playGrandLockUnlockedFanfare() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      // Majestic triumphant arpeggio
      const notes = [
        { f: 523.25, d: 0.15 }, // C5
        { f: 659.25, d: 0.15 }, // E5
        { f: 783.99, d: 0.15 }, // G5
        { f: 1046.50, d: 0.22 }, // C6
        { f: 1318.51, d: 0.22 }, // E6
        { f: 1567.98, d: 0.55 }  // G6
      ];
      let t = now;
      notes.forEach(n => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.f, t);
        gain.gain.setValueAtTime(0.38, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + n.d);
        osc.connect(gain);
        gain.connect(this.sfxGain || this.ctx.destination);
        osc.start(t);
        osc.stop(t + n.d + 0.05);
        t += n.d * 0.85;
      });
    } catch (e) {
      console.warn("Audio playGrandLockUnlockedFanfare error:", e);
    }
  }

  playRestartSound() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.25);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(this.sfxGain || this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.32);
    } catch (e) {
      console.warn("Audio playRestartSound error:", e);
    }
  }

  playInvalidBust() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.25);

      gain.gain.setValueAtTime(this.masterVolume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.26);
    } catch (e) {
      console.warn("Audio playInvalidBust error:", e);
    }
  }

  playGestureSound(gestureId) {
    switch (gestureId) {
      case 1: this.playCauldronStir(); break;
      case 2: this.playIngredientToss(); break;
      case 3: this.playBubbleFroth(); break;
      case 4: this.playFlameIgnite(); break;
      case 5: this.playMistSweep(); break;
      case 6: this.playSpellCast(); break;
      default: this.playSparkleChime(); break;
    }
  }
}

// Global Audio Engine Instance
window.halloweenAudio = new HalloweenAudioEngine();
