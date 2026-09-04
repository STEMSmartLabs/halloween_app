/**
 * @file particle_engine.js
 * @brief Ultra-Realistic 60FPS Physics, Dynamic Fluid Simulation & VFX Engine
 *
 * Features:
 * 1. Dynamic Viscous Cauldron Fluid Surface Wave Simulation (Spring-Mass Mesh)
 * 2. High-Fidelity Wand Ribbon with Evolution Levels (Apprentice -> Candy Mage -> Master Choco-Sorcerer)
 * 3. Real-Time Motion Audio Synthesizer Integration
 * 4. Glowing Spellcasting Target Rings & Visual Beat Metronome
 * 5. 3D Tumbling Ingredient Ballistics with Fluid Crown Splash & Surface Ripples
 * 6. Volumetric Multi-Layer Green Fog, Swirling Toxic Mist & Floating Harvest Plume Items
 * 7. Arcane Spell Summon Circles & Visceral Screen Shake Shockwaves
 */

class HalloweenParticleEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    // Simulation Data Structures
    this.wandTrail = [];
    this.sparks = [];
    this.bubbles = [];
    this.droplets = [];
    this.steamPuffs = [];
    this.greenMistParticles = [];
    this.flames = [];
    this.embers = [];
    this.flyingIngredients = [];
    this.confetti = [];
    this.shockwaves = [];
    this.runes = [];

    // Wand Level Progression (Idea 2)
    this.wandLevel = 1; // 1: Apprentice, 2: Candy Mage, 3: Master Choco-Sorcerer
    this.rainbowHue = 0;

    // Spellcasting Target & Visual Rhythm Metronome (Idea 2)
    this.activeSpellTarget = null;
    this.metronomePhase = 0;
    this.metronomeBeat = 0;

    // Floating Items in Vapor Cloud above Cauldron (Matching Concept Art)
    this.plumeItems = [
      { emoji: '🍎', offsetX: -75, offsetY: -40, size: 28, phase: 0, speed: 0.035, amp: 5, rot: -0.15, glow: '#c084fc' },
      { emoji: '🍇', offsetX: -30, offsetY: -55, size: 28, phase: 1.5, speed: 0.04, amp: 6, rot: 0.2, glow: '#38bdf8' },
      { emoji: '🌽', offsetX: -5, offsetY: -30, size: 24, phase: 3.1, speed: 0.038, amp: 4, rot: 0.35, glow: '#f59e0b' },
      { emoji: '👻', offsetX: 55, offsetY: -45, size: 36, phase: 2.2, speed: 0.028, amp: 7, rot: 0.1, glow: '#4ade80' },
      { emoji: '🎃', offsetX: 35, offsetY: -60, size: 28, phase: 4.0, speed: 0.032, amp: 5, rot: -0.1, glow: '#ff7518' },
      { emoji: '🥕', offsetX: 15, offsetY: -38, size: 26, phase: 5.2, speed: 0.042, amp: 4, rot: -0.25, glow: '#22c55e' }
    ];

    // Screen Shake state
    this.screenShakeTrauma = 0;

    // Wand state
    this.wandPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.lastWandPos = { x: this.wandPos.x, y: this.wandPos.y };
    this.wandVelocity = 0;

    // Cauldron Geometry & Fluid Physics
    this.cauldronCenter = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.cauldronRadiusX = 140;
    this.cauldronRadiusY = 32;
    this.liquidColor = '#22c55e';
    this.liquidGlow = 'rgba(34, 197, 94, 0.9)';

    // Fluid Wave Spring-Mass Simulation
    this.waveNodesCount = 36;
    this.waveNodes = [];
    this.initFluidMesh();

    // Stirring Vortex State
    this.vortexAngularSpeed = 0;
    this.vortexAngle = 0;
    this.fireIntensity = 1.0;
    this.cauldronHeight = 240;

    this.isMobile = (typeof window !== 'undefined') && (window.innerWidth <= 768 || ('ontouchstart' in window && window.innerWidth <= 1024));
    this.isRunning = false;
    this.resizeCanvas();

    window.addEventListener('resize', () => {
      this.isMobile = window.innerWidth <= 768 || ('ontouchstart' in window && window.innerWidth <= 1024);
      this.resizeCanvas();
    }, { passive: true });

    let scrollThrottle = false;
    window.addEventListener('scroll', () => {
      if (!scrollThrottle) {
        scrollThrottle = true;
        requestAnimationFrame(() => {
          this.updateCauldronCenter();
          scrollThrottle = false;
        });
      }
    }, { passive: true });
  }

  setShadow(color, blur) {
    if (!this.isMobile) {
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = blur;
    } else {
      this.ctx.shadowColor = 'transparent';
      this.ctx.shadowBlur = 0;
    }
  }

  initFluidMesh() {
    this.waveNodes = [];
    for (let i = 0; i < this.waveNodesCount; i++) {
      this.waveNodes.push({
        y: 0,
        vy: 0,
        targetY: 0
      });
    }
  }

  resizeCanvas() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.updateCauldronCenter();
  }

  updateCauldronCenter() {
    const cauldronEl = document.querySelector('.cauldron-container');
    if (cauldronEl) {
      const rect = cauldronEl.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        this.cauldronHeight = rect.height;
        this.cauldronCenter = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height * 0.40
        };
        this.cauldronRadiusX = rect.width * 0.35;
        this.cauldronRadiusY = rect.height * 0.088;
      }
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.loop();
  }

  setLiquidColor(color, glow) {
    this.liquidColor = color;
    this.liquidGlow = glow;
  }

  setWandLevel(level) {
    this.wandLevel = Math.max(1, Math.min(3, level));
    if (window.halloweenAudio) {
      window.halloweenAudio.playWandLevelUpFanfare();
    }
  }

  // =========================================================================
  // SPELLCASTING TARGET RINGS & VISUAL BEAT METRONOME (IDEA 2)
  // =========================================================================
  setSpellTarget(type, name, icon, remaining = 1) {
    this.activeSpellTarget = {
      type, // 'stir', 'slash', 'bubble', 'thrust', 'toss'
      name,
      icon,
      remaining,
      pulse: 0
    };
  }

  clearSpellTarget() {
    this.activeSpellTarget = null;
  }

  // =========================================================================
  // 1. WAND MOTION & PLASMA RIBBON TRACKING WITH REAL-TIME AUDIO
  // =========================================================================
  updateWandPosition(x, y) {
    const now = performance.now();
    const dx = x - this.wandPos.x;
    const dy = y - this.wandPos.y;
    const dist = Math.hypot(dx, dy);

    this.lastWandPos = { ...this.wandPos };
    this.wandPos = { x, y };
    this.wandVelocity = dist;

    // If wand is resting/idle, quickly clear ribbon trail and do not spawn particles
    if (dist < 8) {
      if (this.wandTrail.length > 0) {
        this.wandTrail.shift();
      }
      return;
    }

    // Add to ribbon history with max capacity
    this.wandTrail.push({
      x,
      y,
      vx: dx * 0.2,
      vy: dy * 0.2,
      time: now,
      age: 0
    });

    if (this.wandTrail.length > 8) {
      this.wandTrail.shift();
    }

    // 1. Trigger Real-Time Procedural Motion Soundscape (only on active swing)
    if (window.halloweenAudio && dist > 14) {
      window.halloweenAudio.playWandMotionSound(dist);
    }

    // 2. Spawn Wand Level Sparks (only during active motion)
    let sparkPalette = ['#c084fc', '#e879f9', '#ffffff'];
    if (this.wandLevel === 2) sparkPalette = ['#ff7518', '#facc15', '#ffffff', '#fb923c'];
    if (this.wandLevel === 3) sparkPalette = ['#38bdf8', '#4ade80', '#facc15', '#f43f5e', '#ffffff'];

    const sparkCount = Math.min(Math.floor(dist / 5) + 1, 4);

    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * (dist * 0.14) + 1.0;
      this.sparks.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(angle) * speed + dx * 0.08,
        vy: Math.sin(angle) * speed + dy * 0.08 - 0.6,
        gravity: 0.12,
        size: Math.random() * 2.8 + (this.wandLevel * 0.8),
        color: sparkPalette[Math.floor(Math.random() * sparkPalette.length)],
        alpha: 1.0,
        decay: Math.random() * 0.05 + 0.04
      });
    }

    // Check if wand is interacting directly over cauldron surface
    const cDistX = (x - this.cauldronCenter.x) / this.cauldronRadiusX;
    const cDistY = (y - this.cauldronCenter.y) / this.cauldronRadiusY;
    if (cDistX * cDistX + cDistY * cDistY <= 1.2) {
      this.disturbFluid(Math.atan2(y - this.cauldronCenter.y, x - this.cauldronCenter.x), dist * 0.22);
    }
  }

  // =========================================================================
  // SPARKLE BURST ON MOUSE CLICK / TAP
  // =========================================================================
  spawnClickSparks(x, y) {
    let sparkPalette = ['#ffe066', '#ffb703', '#facc15', '#ffffff', '#c084fc'];
    if (this.wandLevel === 2) sparkPalette = ['#ff7518', '#facc15', '#ffe066', '#ffffff', '#fb923c'];
    if (this.wandLevel === 3) sparkPalette = ['#38bdf8', '#4ade80', '#facc15', '#f43f5e', '#ffffff'];

    const count = 16 + this.wandLevel * 4;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = Math.random() * 6.5 + 2.5;
      this.sparks.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2,
        gravity: 0.16,
        size: Math.random() * 5 + 2,
        color: sparkPalette[Math.floor(Math.random() * sparkPalette.length)],
        alpha: 1.0,
        decay: Math.random() * 0.03 + 0.02
      });
    }

    // Expanding soft click shockwave
    this.shockwaves.push({
      x,
      y,
      radius: 4,
      maxRadius: 36,
      color: sparkPalette[0],
      alpha: 0.85,
      decay: 0.06
    });

    if (window.halloweenAudio) {
      window.halloweenAudio.playSparkleChime();
    }
  }

  // =========================================================================
  // 2. FLUID SURFACE WAVE SIMULATION (SPRING-MASS MATRIX)
  // =========================================================================
  disturbFluid(angle, intensity) {
    let normAngle = (angle + Math.PI) / (Math.PI * 2);
    let nodeIdx = Math.floor(normAngle * this.waveNodesCount) % this.waveNodesCount;

    const clampedIntensity = Math.min(intensity, 20);
    this.waveNodes[nodeIdx].vy += clampedIntensity;

    const left = (nodeIdx - 1 + this.waveNodesCount) % this.waveNodesCount;
    const right = (nodeIdx + 1) % this.waveNodesCount;
    this.waveNodes[left].vy += clampedIntensity * 0.5;
    this.waveNodes[right].vy += clampedIntensity * 0.5;
  }

  updateFluidPhysics() {
    const k = 0.035;
    const damping = 0.045;
    const spread = 0.22;

    for (let i = 0; i < this.waveNodesCount; i++) {
      const node = this.waveNodes[i];
      const force = -k * (node.y - node.targetY) - damping * node.vy;
      node.vy += force;
      node.y += node.vy;
    }

    const leftDeltas = new Float32Array(this.waveNodesCount);
    const rightDeltas = new Float32Array(this.waveNodesCount);

    for (let j = 0; j < 4; j++) {
      for (let i = 0; i < this.waveNodesCount; i++) {
        const left = (i - 1 + this.waveNodesCount) % this.waveNodesCount;
        const right = (i + 1) % this.waveNodesCount;
        leftDeltas[i] = spread * (this.waveNodes[i].y - this.waveNodes[left].y);
        rightDeltas[i] = spread * (this.waveNodes[i].y - this.waveNodes[right].y);
      }

      for (let i = 0; i < this.waveNodesCount; i++) {
        const left = (i - 1 + this.waveNodesCount) % this.waveNodesCount;
        const right = (i + 1) % this.waveNodesCount;
        this.waveNodes[left].y += leftDeltas[i] * 0.5;
        this.waveNodes[right].y += rightDeltas[i] * 0.5;
      }
    }

    this.vortexAngularSpeed *= 0.985;
    this.vortexAngle += this.vortexAngularSpeed;

    if (this.fireIntensity > 1.0) {
      this.fireIntensity -= 0.008;
    }
  }

  // =========================================================================
  // 3. CAULDRON BUBBLES WITH 3D OSCILLATION & BURST SPLATTERS
  // =========================================================================
  spawnCauldronBubble(color = null) {
    const maxBubbles = this.isMobile ? 6 : 14;
    if (this.bubbles.length >= maxBubbles) return;

    const angle = Math.random() * Math.PI * 2;
    const radFactor = Math.sqrt(Math.random()) * 0.85;
    const bx = this.cauldronCenter.x + Math.cos(angle) * (this.cauldronRadiusX * radFactor);
    const by = this.cauldronCenter.y + Math.sin(angle) * (this.cauldronRadiusY * radFactor) + 4;

    this.bubbles.push({
      x: bx,
      y: by,
      baseY: by,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -Math.random() * 1.2 - 0.6,
      radius: Math.random() * 9 + 5,
      wobbleSpeed: Math.random() * 0.15 + 0.08,
      wobblePhase: Math.random() * Math.PI * 2,
      color: color || this.liquidColor,
      alpha: 0.95,
      life: 0,
      maxLife: Math.random() * 80 + 50
    });
  }

  popBubble(b) {
    const count = this.isMobile ? 3 : (Math.floor(Math.random() * 5) + 5);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3.5 + 1.2;
      this.droplets.push({
        x: b.x,
        y: b.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        gravity: 0.18,
        radius: Math.random() * 2.5 + 1.0,
        color: b.color,
        alpha: 1.0,
        decay: 0.04
      });
    }
    if (Math.random() < 0.3 && window.halloweenAudio) {
      window.halloweenAudio.playBubblePop();
    }
  }

  // =========================================================================
  // 4. VOLUMETRIC GREEN STEAM & BASE FLAME SIMULATION
  // =========================================================================
  spawnSteam() {
    const maxSteam = this.isMobile ? 8 : 22;
    if (this.steamPuffs.length >= maxSteam) return;

    const angle = Math.random() * Math.PI * 2;
    const rx = Math.random() * this.cauldronRadiusX * 0.8;
    const ry = Math.random() * this.cauldronRadiusY * 0.8;

    this.steamPuffs.push({
      x: this.cauldronCenter.x + Math.cos(angle) * rx,
      y: this.cauldronCenter.y + Math.sin(angle) * ry - 5,
      vx: (Math.random() - 0.5) * 0.8,
      vy: -Math.random() * 1.6 - 0.9,
      radius: Math.random() * 18 + 14,
      maxRadius: Math.random() * 65 + 45,
      alpha: 0.45,
      decay: 0.007
    });

    if (Math.random() < (this.isMobile ? 0.3 : 0.6)) {
      this.greenMistParticles.push({
        x: this.cauldronCenter.x + (Math.random() - 0.5) * (this.cauldronRadiusX * 1.6),
        y: this.cauldronCenter.y - Math.random() * 40,
        vx: (Math.random() - 0.5) * 0.9,
        vy: -Math.random() * 1.2 - 0.4,
        size: Math.random() * 4 + 1.5,
        alpha: 0.85,
        decay: 0.009,
        color: Math.random() > 0.4 ? '#4ade80' : '#86efac'
      });
    }
  }

  spawnFlames() {
    const maxFlames = this.isMobile ? 10 : 25;
    if (this.flames.length >= maxFlames) return;

    // Anchor flame origins directly under cauldron feet using cached dimensions
    const baseY = this.cauldronCenter.y + ((this.cauldronHeight || 240) * 0.38);
    const count = this.isMobile ? 1 : (Math.floor(Math.random() * 2 * this.fireIntensity) + 1);

    for (let i = 0; i < count; i++) {
      const spreadX = (Math.random() - 0.5) * (this.cauldronRadiusX * 1.3);
      this.flames.push({
        x: this.cauldronCenter.x + spreadX,
        y: baseY + Math.random() * 8,
        vx: (Math.random() - 0.5) * 1.2,
        vy: -Math.random() * (2.8 * this.fireIntensity) - 1.6,
        radius: Math.random() * 12 + 8,
        colorType: Math.random() > 0.4 ? 'yellow' : 'orange',
        alpha: 0.85,
        decay: 0.045
      });
    }

    const maxEmbers = this.isMobile ? 6 : 20;
    if (this.embers.length < maxEmbers && Math.random() < (this.isMobile ? 0.15 : 0.3) * this.fireIntensity) {
      this.embers.push({
        x: this.cauldronCenter.x + (Math.random() - 0.5) * (this.cauldronRadiusX * 1.2),
        y: baseY,
        vx: (Math.random() - 0.5) * 2.0,
        vy: -Math.random() * 4.0 - 2.5,
        gravity: 0.05,
        radius: Math.random() * 2.5 + 1.2,
        alpha: 1.0,
        decay: Math.random() * 0.02 + 0.015
      });
    }
  }

  // =========================================================================
  // 5. INGREDIENT THROW ANIMATION & HIGH-VISCOSITY SPLASH (IDEA 1)
  // =========================================================================
  throwIngredient(fromEl, emoji, targetColor = null, isValid = true) {
    this.updateCauldronCenter();
    let startX = 140;
    let startY = 350;

    if (fromEl && typeof fromEl.getBoundingClientRect === 'function') {
      const rect = fromEl.getBoundingClientRect();
      startX = rect.left + rect.width / 2;
      startY = rect.top + rect.height / 2;
    }

    const tColor = targetColor || this.liquidColor;

    // Cap simultaneous flying items to prevent CPU lag
    if (this.flyingIngredients.length >= 3) {
      this.flyingIngredients.shift();
    }

    this.flyingIngredients.push({
      x: startX,
      y: startY,
      startX,
      startY,
      targetX: this.cauldronCenter.x + (Math.random() - 0.5) * 40,
      targetY: this.cauldronCenter.y,
      progress: 0,
      speed: 0.038, // Fast, punchy arc
      emoji,
      color: tColor,
      arcHeight: 120 + Math.random() * 30,
      rotation: 0,
      rotSpeed: (Math.random() - 0.5) * 0.35,
      scale: 1.0,
      isValid: isValid !== false
    });
  }

  triggerMidairBurst(x, y, emoji, color) {
    if (window.halloweenAudio) {
      window.halloweenAudio.playInvalidBust();
    }

    this.screenShakeTrauma = 0.22;

    // 1. Pop Shockwave
    this.shockwaves.push({
      x,
      y,
      radius: 6,
      maxRadius: 52,
      color: '#ef4444',
      alpha: 0.95,
      decay: 0.05
    });

    // 2. Poof Spark & Smoke Burst
    for (let j = 0; j < 12; j++) {
      const angle = (j / 12) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const speed = Math.random() * 5 + 3;
      this.droplets.push({
        x: x + Math.cos(angle) * 6,
        y: y + Math.sin(angle) * 6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2,
        gravity: 0.22,
        radius: Math.random() * 3.5 + 2,
        color: j % 2 === 0 ? '#ef4444' : '#f97316',
        alpha: 1.0,
        decay: 0.045
      });
    }
  }

  triggerCrownSplash(x, y, color) {
    this.disturbFluid(Math.atan2(y - this.cauldronCenter.y, x - this.cauldronCenter.x), 12);

    if (this.droplets.length > 25) {
      this.droplets.splice(0, this.droplets.length - 20);
    }

    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
      const speed = Math.random() * 5 + 3;
      this.droplets.push({
        x: x + Math.cos(angle) * 8,
        y: y + Math.sin(angle) * 4,
        vx: Math.cos(angle) * speed * 0.6,
        vy: -Math.random() * 4.5 - 2.5,
        gravity: 0.32,
        radius: Math.random() * 3 + 1.5,
        color,
        alpha: 1.0,
        decay: 0.035
      });
    }

    if (this.shockwaves.length > 4) {
      this.shockwaves.shift();
    }

    this.shockwaves.push({
      x,
      y,
      radius: 5,
      maxRadius: 55,
      color,
      alpha: 0.85,
      decay: 0.04
    });
  }

  // =========================================================================
  // 6. ARCANE SPELL CIRCLE & VISCERAL SCREEN SHAKE
  // =========================================================================
  triggerSpellEffect(gestureId) {
    switch (gestureId) {
      case 1: // Stir / Circle
        this.vortexAngularSpeed = 0.25;
        for (let i = 0; i < 14; i++) {
          this.disturbFluid((i / 14) * Math.PI * 2, 10);
        }
        if (window.halloweenAudio) window.halloweenAudio.playCauldronStir();
        break;

      case 2: // Up: 🍊 Orange
        this.fireIntensity = 2.5;
        this.spawnCauldronBubble('#f97316');
        this.screenShakeTrauma = 0.25;
        if (window.halloweenAudio) window.halloweenAudio.playOrangeChime();
        break;

      case 3: // Down: 🎃 Pumpkin
        this.spawnCauldronBubble('#ff7518');
        this.spawnCauldronBubble('#facc15');
        this.screenShakeTrauma = 0.35;
        if (window.halloweenAudio) window.halloweenAudio.playPumpkinChime();
        break;

      case 4: // Left: 🍎 Apple
        this.spawnCauldronBubble('#ef4444');
        this.spawnCauldronBubble('#22c55e');
        this.screenShakeTrauma = 0.25;
        if (window.halloweenAudio) window.halloweenAudio.playAppleChime();
        break;

      case 5: // Right: 🍓 Strawberry
        this.spawnCauldronBubble('#f43f5e');
        this.spawnCauldronBubble('#ec4899');
        this.screenShakeTrauma = 0.25;
        if (window.halloweenAudio) window.halloweenAudio.playStrawberryChime();
        break;

      case 6: // Spell Thrust / Blast
        this.screenShakeTrauma = 0.85;
        this.runes.push({
          x: this.cauldronCenter.x,
          y: this.cauldronCenter.y - 40,
          radius: 20,
          maxRadius: 180,
          alpha: 1.0,
          color: '#4ade80',
          symbols: ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ']
        });
        if (window.halloweenAudio) window.halloweenAudio.playSpellCast();
        break;
    }
  }

  triggerInvalidBust(fromEl = null) {
    let x = this.cauldronCenter.x;
    let y = this.cauldronCenter.y - 30;

    if (fromEl && typeof fromEl.getBoundingClientRect === 'function') {
      const rect = fromEl.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }

    this.screenShakeTrauma = 0.3;
    
    // Red Fizzle Shockwave
    this.shockwaves.push({
      x,
      y,
      radius: 5,
      maxRadius: 65,
      color: '#ef4444',
      alpha: 0.9,
      decay: 0.045
    });

    // Gray Smoke/Red Fizzle Droplets
    for (let i = 0; i < 6; i++) {
      this.droplets.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 15,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 3.5 - 1.5,
        gravity: 0.2,
        radius: Math.random() * 3 + 2,
        color: i % 2 === 0 ? '#ef4444' : '#64748b',
        alpha: 0.9,
        decay: 0.04
      });
    }
  }

  spawnCelebrationBurst() {
    const candies = ['🍫', '🍬', '🍭', '🍫', '✨', '🎃', '🍎', '🍇', '🌽'];
    const count = this.isMobile ? 22 : 50;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 14 + 6;
      this.confetti.push({
        x: this.cauldronCenter.x,
        y: this.cauldronCenter.y - 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 7,
        gravity: 0.28,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.25,
        emoji: candies[Math.floor(Math.random() * candies.length)],
        size: Math.random() * 16 + 20,
        color: '#facc15',
        alpha: 1.0,
        decay: 0.012
      });
    }
  }

  // =========================================================================
  // 7. MASTER RENDER LOOP
  // =========================================================================
  loop() {
    if (!this.isRunning) return;

    this.frameCount = (this.frameCount || 0) + 1;
    if (this.frameCount % 60 === 0 || this.frameCount < 5) {
      this.updateCauldronCenter();
    }

    this.updateFluidPhysics();

    if (Math.random() < 0.45) this.spawnCauldronBubble();
    if (Math.random() < 0.85) this.spawnSteam();
    this.spawnFlames();

    this.render();

    requestAnimationFrame(() => this.loop());
  }

  render() {
    if (!this.ctx) return;
    const width = this.canvas.width;
    const height = this.canvas.height;

    this.ctx.save();

    // Apply Screen Shake
    if (this.screenShakeTrauma > 0) {
      const shakeMag = this.screenShakeTrauma * this.screenShakeTrauma * 16;
      const ox = (Math.random() - 0.5) * shakeMag;
      const oy = (Math.random() - 0.5) * shakeMag;
      this.ctx.translate(ox, oy);
      this.screenShakeTrauma = Math.max(0, this.screenShakeTrauma - 0.035);
    }

    this.ctx.clearRect(0, 0, width, height);

    // 1. Render Base Flames Under Cauldron
    this.renderFlames();

    // 2. Render Cauldron Fluid Surface with Dynamic Wave Mesh
    this.renderFluidSurface();

    // 3. Render Bubbles & Splashes
    this.renderBubblesAndDroplets();

    // 4. Render Volumetric Green Mist Clouds & Floating Plume Harvest Items
    this.renderSteamVapors();
    this.renderFloatingPlumeItems();

    // 5. Render Glowing Spellcasting Target Rings & Metronome (Idea 2)
    this.renderSpellTargetMetronome();

    // 6. Render Shockwave Rings & Arcane Rune Circles
    this.renderShockwavesAndRunes();

    // 7. Render 3D Tumbling Flying Ingredients
    this.renderFlyingIngredients();

    // 8. Render Wand Glowing Spline Plasma Ribbon (Level-Evolved) & Sparks
    this.renderWandRibbon();

    // 9. Render Celebration Confetti
    this.renderConfetti();

    this.ctx.restore();
  }

  renderFlames() {
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';

    for (let i = this.flames.length - 1; i >= 0; i--) {
      const f = this.flames[i];
      f.x += f.vx;
      f.y += f.vy;
      f.radius *= 0.96;
      f.alpha -= f.decay;

      if (f.alpha <= 0 || f.radius < 1) {
        this.flames.splice(i, 1);
        continue;
      }

      const grad = this.ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius);
      if (f.colorType === 'yellow') {
        grad.addColorStop(0, `rgba(254, 240, 138, ${f.alpha})`);
        grad.addColorStop(0.6, `rgba(245, 158, 11, ${f.alpha * 0.8})`);
        grad.addColorStop(1, 'transparent');
      } else {
        grad.addColorStop(0, `rgba(249, 115, 22, ${f.alpha})`);
        grad.addColorStop(0.7, `rgba(220, 38, 38, ${f.alpha * 0.6})`);
        grad.addColorStop(1, 'transparent');
      }

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    for (let i = this.embers.length - 1; i >= 0; i--) {
      const e = this.embers[i];
      e.x += e.vx + Math.sin(e.y * 0.05) * 0.8;
      e.y += e.vy;
      e.vy += e.gravity;
      e.alpha -= e.decay;

      if (e.alpha <= 0) {
        this.embers.splice(i, 1);
        continue;
      }

      this.ctx.fillStyle = `rgba(254, 215, 170, ${e.alpha})`;
      this.setShadow('#ea580c', 6);
      this.ctx.beginPath();
      this.ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  renderFluidSurface() {
    this.ctx.save();
    const cx = this.cauldronCenter.x;
    const cy = this.cauldronCenter.y;
    const rx = this.cauldronRadiusX;
    const ry = this.cauldronRadiusY;

    this.ctx.beginPath();
    for (let i = 0; i <= this.waveNodesCount; i++) {
      const idx = i % this.waveNodesCount;
      const angle = (idx / this.waveNodesCount) * Math.PI * 2 + this.vortexAngle;
      const waveOffset = this.waveNodes[idx].y;

      const px = cx + Math.cos(angle) * (rx + waveOffset * 0.3);
      const py = cy + Math.sin(angle) * (ry + waveOffset * 0.2);

      if (i === 0) {
        this.ctx.moveTo(px, py);
      } else {
        this.ctx.lineTo(px, py);
      }
    }
    this.ctx.closePath();

    const fluidGrad = this.ctx.createRadialGradient(cx, cy, 5, cx, cy, rx);
    fluidGrad.addColorStop(0, '#ffffff');
    fluidGrad.addColorStop(0.3, '#4ade80');
    fluidGrad.addColorStop(0.7, '#16a34a');
    fluidGrad.addColorStop(0.95, '#052e16');
    fluidGrad.addColorStop(1, '#02160a');

    this.ctx.fillStyle = fluidGrad;
    this.setShadow('#4ade80', 28);
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    this.ctx.ellipse(cx, cy - ry * 0.3, rx * 0.7, ry * 0.4, 0, Math.PI * 0.8, Math.PI * 1.2);
    this.ctx.stroke();

    this.ctx.restore();
  }

  renderBubblesAndDroplets() {
    this.ctx.save();

    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.life++;
      b.wobblePhase += b.wobbleSpeed;

      b.x += b.vx + Math.sin(b.wobblePhase) * 0.6;
      b.y += b.vy;

      if (b.life >= b.maxLife || b.y < this.cauldronCenter.y - this.cauldronRadiusY * 0.6) {
        this.popBubble(b);
        this.bubbles.splice(i, 1);
        continue;
      }

      const wobbleR = b.radius + Math.sin(b.wobblePhase * 2) * 0.8;
      const bGrad = this.ctx.createRadialGradient(
        b.x - wobbleR * 0.3, b.y - wobbleR * 0.3, wobbleR * 0.1,
        b.x, b.y, wobbleR
      );
      bGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      bGrad.addColorStop(0.4, '#4ade80');
      bGrad.addColorStop(0.9, 'rgba(10, 40, 20, 0.7)');
      bGrad.addColorStop(1, 'rgba(255, 255, 255, 0.3)');

      this.ctx.fillStyle = bGrad;
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, wobbleR, 0, Math.PI * 2);
      this.ctx.fill();
    }

    for (let i = this.droplets.length - 1; i >= 0; i--) {
      const d = this.droplets[i];
      d.x += d.vx;
      d.y += d.vy;
      d.vy += d.gravity;
      d.alpha -= d.decay;

      if (d.alpha <= 0) {
        this.droplets.splice(i, 1);
        continue;
      }

      this.ctx.fillStyle = d.color;
      this.setShadow(d.color, 8);
      this.ctx.globalAlpha = Math.max(0, d.alpha);
      this.ctx.beginPath();
      this.ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  renderSteamVapors() {
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen';

    for (let i = this.steamPuffs.length - 1; i >= 0; i--) {
      const s = this.steamPuffs[i];
      s.x += s.vx + Math.sin(s.y * 0.02) * 1.1;
      s.y += s.vy;
      s.radius += (s.maxRadius - s.radius) * 0.025;
      s.alpha -= s.decay;

      if (s.alpha <= 0) {
        this.steamPuffs.splice(i, 1);
        continue;
      }

      const grad = this.ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.radius);
      grad.addColorStop(0, `rgba(187, 247, 208, ${s.alpha * 0.85})`);
      grad.addColorStop(0.4, `rgba(74, 222, 128, ${s.alpha * 0.6})`);
      grad.addColorStop(0.8, `rgba(22, 163, 74, ${s.alpha * 0.3})`);
      grad.addColorStop(1, 'transparent');

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    for (let i = this.greenMistParticles.length - 1; i >= 0; i--) {
      const p = this.greenMistParticles[i];
      p.x += p.vx + Math.sin(p.y * 0.05) * 0.6;
      p.y += p.vy;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        this.greenMistParticles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.fillStyle = p.color;
      this.setShadow(p.color, 8);
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    this.ctx.restore();
  }

  renderFloatingPlumeItems() {
    this.ctx.save();
    const cx = this.cauldronCenter.x;
    const cy = this.cauldronCenter.y;
    // Scale items down if cauldron is scaled down on mobile/tablet
    const scale = Math.min(1.0, Math.max(0.55, this.cauldronRadiusX / 140.0));

    for (let i = 0; i < this.plumeItems.length; i++) {
      const item = this.plumeItems[i];
      item.phase += item.speed;

      const bobY = Math.sin(item.phase) * (item.amp * scale);
      const posX = cx + item.offsetX * scale;
      const posY = cy + (item.offsetY * scale) + bobY;

      this.ctx.save();
      this.ctx.translate(posX, posY);
      this.ctx.rotate(item.rot + Math.sin(item.phase * 0.7) * 0.08);

      this.setShadow(item.glow, Math.round(15 * scale));

      this.ctx.font = `${Math.round(item.size * scale)}px sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(item.emoji, 0, 0);

      this.ctx.restore();
    }

    this.ctx.restore();
  }

  // =========================================================================
  // 8. GLOWING SPELLCASTING TARGET RINGS & BEAT METRONOME (IDEA 2)
  // =========================================================================
  renderSpellTargetMetronome() {
    if (!this.activeSpellTarget) return;

    this.ctx.save();
    const cx = this.cauldronCenter.x;
    const cy = this.cauldronCenter.y - 10;
    const st = this.activeSpellTarget;

    this.metronomePhase += 0.055;
    const pulseScale = 1.0 + Math.sin(this.metronomePhase) * 0.12;

    // Metronome beat chime on expansion peak
    if (Math.sin(this.metronomePhase) > 0.98 && this.frameCount % 20 === 0) {
      if (window.halloweenAudio) window.halloweenAudio.playSpellTargetBeat();
    }

    // Outer Mystic Rune Target Ring (Flat Horizontal Rim Ellipse)
    this.ctx.save();
    this.ctx.strokeStyle = '#facc15';
    this.setShadow('#facc15', 18);
    this.ctx.lineWidth = 2.5;
    this.ctx.setLineDash([10, 8]);
    this.ctx.lineDashOffset = -this.metronomePhase * 25;

    this.ctx.beginPath();
    this.ctx.ellipse(cx, cy, (this.cauldronRadiusX + 16) * pulseScale, (this.cauldronRadiusY + 12) * pulseScale, 0, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.restore();

    // Directional Gesture Cues
    if (st.type === 'stir') {
      // Rotating directional arrow around rim
      const arrowAngle = this.metronomePhase * 1.5;
      const ax = cx + Math.cos(arrowAngle) * (this.cauldronRadiusX + 10);
      const ay = cy + Math.sin(arrowAngle) * (this.cauldronRadiusY + 10);

      this.ctx.save();
      this.ctx.translate(ax, ay);
      this.ctx.rotate(arrowAngle + Math.PI / 2);
      this.ctx.font = '24px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.setShadow('#4ade80', 15);
      this.ctx.fillText('🔄', 0, 0);
      this.ctx.restore();
    } else if (st.type === 'slash') {
      // Downward flame arrow
      const arrowY = cy - 40 + (this.metronomePhase * 20) % 60;
      this.ctx.save();
      this.ctx.font = '28px sans-serif';
      this.ctx.textAlign = 'center';
      this.setShadow('#ff7518', 20);
      this.ctx.fillText('⬇️🔥', cx, arrowY);
      this.ctx.restore();
    } else if (st.type === 'thrust') {
      // Crosshair spell target
      this.ctx.save();
      this.ctx.strokeStyle = '#38bdf8';
      this.setShadow('#38bdf8', 22);
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy - 20, 32 * pulseScale, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.font = '28px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('⚡', cx, cy - 10);
      this.ctx.restore();
    }

    this.ctx.restore();
  }

  renderShockwavesAndRunes() {
    this.ctx.save();

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += (sw.maxRadius - sw.radius) * 0.12 + 2.0;
      sw.alpha -= sw.decay;

      if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) {
        this.shockwaves.splice(i, 1);
        continue;
      }

      this.ctx.strokeStyle = sw.color;
      this.setShadow(sw.color, 15);
      this.ctx.globalAlpha = Math.max(0, sw.alpha);
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.ellipse(sw.x, sw.y, sw.radius, sw.radius * 0.35, 0, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    for (let i = this.runes.length - 1; i >= 0; i--) {
      const r = this.runes[i];
      r.radius += 1.8;
      r.alpha -= 0.015;

      if (r.alpha <= 0 || r.radius >= r.maxRadius) {
        this.runes.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, r.alpha);
      this.ctx.strokeStyle = r.color;
      this.setShadow(r.color, 18);
      this.ctx.lineWidth = 2.5;

      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      this.ctx.stroke();

      const symCount = r.symbols.length;
      for (let s = 0; s < symCount; s++) {
        const sAngle = (s / symCount) * Math.PI * 2 + (1 - r.alpha);
        const sx = r.x + Math.cos(sAngle) * r.radius;
        const sy = r.y + Math.sin(sAngle) * r.radius;

        this.ctx.font = '16px serif';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(r.symbols[s], sx, sy);
      }
      this.ctx.restore();
    }

    this.ctx.restore();
  }

  renderFlyingIngredients() {
    if (this.flyingIngredients.length === 0) return;

    this.ctx.save();

    for (let i = this.flyingIngredients.length - 1; i >= 0; i--) {
      const item = this.flyingIngredients[i];
      item.progress += item.speed;
      item.rotation += item.rotSpeed;

      const t = Math.min(1.0, item.progress);
      const arc = Math.sin(t * Math.PI) * item.arcHeight;

      item.x = item.startX + (item.targetX - item.startX) * t;
      item.y = item.startY + (item.targetY - item.startY) * t - arc;
      item.scale = 1.0 + Math.sin(t * Math.PI) * 0.45;

      const shadowY = item.startY + (item.targetY - item.startY) * t;
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      this.ctx.beginPath();
      this.ctx.ellipse(item.x, shadowY, 18 * (1 - t * 0.4), 6, 0, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();

      this.ctx.save();
      this.ctx.translate(item.x, item.y);
      this.ctx.rotate(item.rotation);
      this.ctx.scale(item.scale, item.scale);
      this.ctx.font = '36px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.setShadow(item.color, 16);
      this.ctx.fillText(item.emoji, 0, 0);
      this.ctx.restore();

      const maxSparks = this.isMobile ? 12 : 35;
      if (this.sparks.length < maxSparks) {
        this.sparks.push({
          x: item.x,
          y: item.y,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          gravity: 0.05,
          size: 3.5,
          color: item.color,
          alpha: 0.8,
          decay: 0.04
        });
      }

      // Mid-Air Burst for Invalid/Wrong Ingredient
      if (!item.isValid && item.progress >= 0.48) {
        this.triggerMidairBurst(item.x, item.y, item.emoji, item.color);
        this.flyingIngredients.splice(i, 1);
        continue;
      }

      if (item.progress >= 1.0) {
        if (window.halloweenAudio) window.halloweenAudio.playIngredientToss();
        this.triggerCrownSplash(item.targetX, item.targetY, item.color);
        this.flyingIngredients.splice(i, 1);
      }
    }

    this.ctx.restore();
  }

  // =========================================================================
  // 9. WAND GLOWING SPLINE PLASMA RIBBON WITH LEVEL-UP EVOLUTION (IDEA 2)
  // =========================================================================
  renderWandRibbon() {
    const now = performance.now();
    // Prune points older than 160ms so no persistent lines remain on screen
    while (this.wandTrail.length > 0 && (now - this.wandTrail[0].time > 160)) {
      this.wandTrail.shift();
    }

    if (this.wandTrail.length < 2) return;

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';

    const count = this.wandTrail.length;
    this.rainbowHue = (this.rainbowHue + 2) % 360;

    // Palette per Wand Level
    let outerColor = '#c084fc';
    let outerGlow = 'rgba(192, 132, 252, 0.8)';
    let ribbonWidth = 6;

    if (this.wandLevel === 2) {
      outerColor = '#ff7518';
      outerGlow = 'rgba(255, 117, 24, 0.9)';
      ribbonWidth = 8;
    } else if (this.wandLevel === 3) {
      outerColor = `hsl(${this.rainbowHue}, 95%, 60%)`;
      outerGlow = `hsl(${this.rainbowHue}, 100%, 70%)`;
      ribbonWidth = 10;
    }

    for (let pass = 0; pass < 2; pass++) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.wandTrail[0].x, this.wandTrail[0].y);

      for (let i = 1; i < count - 1; i++) {
        const xc = (this.wandTrail[i].x + this.wandTrail[i + 1].x) / 2;
        const yc = (this.wandTrail[i].y + this.wandTrail[i + 1].y) / 2;
        this.ctx.quadraticCurveTo(this.wandTrail[i].x, this.wandTrail[i].y, xc, yc);
      }

      if (pass === 0) {
        this.ctx.strokeStyle = outerColor;
        this.setShadow(outerGlow, 28);
        this.ctx.lineWidth = ribbonWidth;
        this.ctx.globalAlpha = 0.6;
        this.ctx.stroke();
      } else {
        this.ctx.strokeStyle = '#ffffff';
        this.setShadow('#ffffff', 14);
        this.ctx.lineWidth = 3.5;
        this.ctx.globalAlpha = 0.95;
        this.ctx.stroke();
      }
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.x += sp.vx;
      sp.y += sp.vy;
      sp.vy += sp.gravity;
      sp.alpha -= sp.decay;

      if (sp.alpha <= 0) {
        this.sparks.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, sp.alpha);
      this.ctx.fillStyle = sp.color;
      this.setShadow(sp.color, 12);
      this.ctx.beginPath();
      this.ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    this.ctx.restore();
  }

  renderConfetti() {
    if (this.confetti.length === 0) return;

    this.ctx.save();
    for (let i = this.confetti.length - 1; i >= 0; i--) {
      const c = this.confetti[i];
      c.x += c.vx;
      c.y += c.vy;
      c.vy += c.gravity;
      c.rotation += c.rotSpeed;
      c.alpha -= c.decay;

      if (c.alpha <= 0) {
        this.confetti.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, c.alpha);
      this.ctx.translate(c.x, c.y);
      this.ctx.rotate(c.rotation);
      this.ctx.font = `${c.size}px sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.setShadow(c.color, 10);
      this.ctx.fillText(c.emoji, 0, 0);
      this.ctx.restore();
    }
    this.ctx.restore();
  }
}

// Global Particle Engine instance
window.particleEngine = null;
