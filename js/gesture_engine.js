/**
 * @file gesture_engine.js
 * @brief Unified 3D IMU & DTW Gesture Recognition Engine
 *
 * Implements clean Dynamic Time Warping (DTW) matching from plushpal-twa
 */

class GestureEngine {
  constructor() {
    this.strokePoints = [];
    this.isDrawing = false;
    this.lastStrokeTime = 0;

    // Gesture ID mappings
    this.GESTURES = {
      NONE: 0,
      STIR_CIRCLE: 1,
      FLICK_TOSS: 2,
      SHAKE_BUBBLE: 3,
      SLASH_VERTICAL: 4,
      WAVE_HORIZONTAL: 5,
      THRUST_POKE: 6
    };

    this.GESTURE_LABEL_TO_ID = {
      none: 0,
      stir: 1,
      toss: 2,
      shake: 3,
      slash: 4,
      wave: 5,
      thrust: 6
    };

    this.listeners = [];

    // IMU Sliding Buffer for DTW
    this.accelBuffer = [];
    this.lastDTWCheck = 0;
    this.lastEmittedGesture = 0;
    this.lastEmittedTime = 0;
    this.isWandMoving = false;

    // Smoothed Cursor Position
    this.smoothedX = window.innerWidth / 2;
    this.smoothedY = window.innerHeight / 2;

    this.initHardwareListener();
    this.initTouchAndMouseListener();
  }

  onGesture(callback) {
    this.listeners.push(callback);
  }

  emitGesture(gestureId, intensity = 85, gestureLabel = '') {
    if (gestureId === this.GESTURES.NONE || gestureLabel === 'none') {
      return;
    }

    const now = performance.now();
    // Debounce duplicate gestures (400ms cooldown)
    if (now - this.lastEmittedTime < 400 && this.lastEmittedGesture === gestureId) {
      return;
    }
    this.lastEmittedTime = now;
    this.lastEmittedGesture = gestureId;

    const names = {
      1: '🔄 Stir Cauldron',
      2: '🪄 Toss / Flick',
      3: '🫧 Shake / Bubble',
      4: '🔥 Downward Slash',
      5: '💨 Mystic Wave',
      6: '⚡ Candy Thrust'
    };

    const actionName = names[gestureId] || gestureLabel || `Action #${gestureId}`;
    console.log(`[GestureEngine] ✨ MATCH: ${actionName} (Confidence: ${intensity}%)`);

    // Notify all game listeners
    this.listeners.forEach(cb => {
      try {
        cb(gestureId, intensity, actionName);
      } catch (e) {
        console.error("[GestureEngine] Error in gesture listener:", e);
      }
    });

    // Audio & Particle FX
    if (window.halloweenAudio) window.halloweenAudio.playGestureSound(gestureId);
    if (window.particleEngine) window.particleEngine.triggerSpellEffect(gestureId);
  }

  // =========================================================================
  // BLUETOOTH ACCELEROMETER STREAM & DTW CLASSIFICATION
  // =========================================================================
  initHardwareListener() {
    if (window.bleWand) {
      // 1. Direct gesture packet (Custom Nordic Wand)
      window.bleWand.on('gesture', (gestureId, intensity) => {
        if (gestureId > 0) {
          this.emitGesture(gestureId, intensity);
        }
      });

      // 2. Continuous 3D Accelerometer stream (BBC micro:bit & Nordic IMU)
      window.bleWand.on('accel', (data) => {
        this.processHardwareAccel(data);
      });
    }
  }

  processHardwareAccel({ x, y, z, gx, gy, gz }) {
    const now = performance.now();

    const gX = gx !== undefined ? gx : x / 1000.0;
    const gY = gy !== undefined ? gy : y / 1000.0;
    const gZ = gz !== undefined ? gz : z / 1000.0;

    // Feed to interactive trainer if recording
    if (window.gestureTrainer) {
      window.gestureTrainer.feedAccel(gX, gY, gZ);
    }

    // Keep sliding window buffer (last 30 samples ~ 600ms at 50Hz)
    this.accelBuffer.push({ x: gX, y: gY, z: gZ, time: now });
    if (this.accelBuffer.length > 30) {
      this.accelBuffer.shift();
    }

    // 1. Move Wand Cursor
    const targetScreenX = (window.innerWidth / 2) + (gX / 0.8) * (window.innerWidth * 0.42);
    const targetScreenY = (window.innerHeight / 2) + (-gY / 0.8) * (window.innerHeight * 0.42);

    const dist = Math.hypot(targetScreenX - this.smoothedX, targetScreenY - this.smoothedY);

    if (dist > 3) {
      this.smoothedX += (targetScreenX - this.smoothedX) * 0.35;
      this.smoothedY += (targetScreenY - this.smoothedY) * 0.35;
      this.smoothedX = Math.max(40, Math.min(window.innerWidth - 40, this.smoothedX));
      this.smoothedY = Math.max(40, Math.min(window.innerHeight - 40, this.smoothedY));

      if (window.particleEngine) {
        window.particleEngine.updateWandPosition(this.smoothedX, this.smoothedY);
      }
    }

    // 2. Perform Dynamic Time Warping (DTW) Recognition every 200ms
    if (now - this.lastDTWCheck > 200 && this.accelBuffer.length >= 12) {
      this.lastDTWCheck = now;
      this.runDTWClassification();
    }
  }

  runDTWClassification() {
    if (!window.gestureTrainer) return;

    const result = window.gestureTrainer.classify(this.accelBuffer);

    if (result) {
      if (result.isIdle || result.gesture === 'none') {
        this.isWandMoving = false;
        this.updateLiveMonitorBadge('none', 100);
        return;
      }

      this.isWandMoving = true;
      const gestureId = this.GESTURE_LABEL_TO_ID[result.gesture] || this.GESTURES.NONE;
      if (gestureId > 0) {
        this.emitGesture(gestureId, result.confidence, result.gesture);
        this.updateLiveMonitorBadge(result.gesture, result.confidence);
        this.accelBuffer = [];
      }
    }
  }

  updateLiveMonitorBadge(gesture, confidence) {
    const liveBadge = document.getElementById('live-dtw-prediction');
    if (!liveBadge || document.getElementById('wand-trainer-modal').style.display === 'none') return;

    if (gesture === 'none') {
      liveBadge.textContent = '💤 Wand Resting (Idle)';
      liveBadge.style.background = 'rgba(148, 163, 184, 0.18)';
      liveBadge.style.color = '#94a3b8';
      liveBadge.style.borderColor = 'rgba(148, 163, 184, 0.4)';
    } else {
      const names = {
        stir: '🔄 Stir Cauldron',
        toss: '🪄 Toss / Flick',
        slash: '🔥 Downward Slash',
        shake: '🫧 Shake / Bubble',
        thrust: '⚡ Candy Thrust'
      };
      liveBadge.textContent = `🟢 Match: ${names[gesture] || gesture} (${confidence}%)`;
      liveBadge.style.background = 'rgba(34, 197, 94, 0.35)';
      liveBadge.style.color = '#4ade80';
      liveBadge.style.borderColor = '#4ade80';
    }
  }

  // =========================================================================
  // MOUSE & TOUCH GESTURE RECOGNITION
  // =========================================================================
  initTouchAndMouseListener() {
    const handleStart = (x, y) => {
      this.isDrawing = true;
      this.strokePoints = [{ x, y, time: Date.now() }];
      if (window.particleEngine) window.particleEngine.updateWandPosition(x, y);
    };

    const handleMove = (x, y) => {
      if (!this.isDrawing) return;
      const now = Date.now();
      this.strokePoints.push({ x, y, time: now });
      if (window.particleEngine) window.particleEngine.updateWandPosition(x, y);
    };

    const handleEnd = () => {
      if (!this.isDrawing) return;
      this.isDrawing = false;
      this.classifyStroke(this.strokePoints);
      this.strokePoints = [];
    };

    window.addEventListener('mousedown', (e) => handleStart(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => handleMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', () => handleEnd());

    window.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) handleStart(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    window.addEventListener('touchend', () => handleEnd());
  }

  classifyStroke(points) {
    if (!points || points.length < 5) return;
    const duration = points[points.length - 1].time - points[0].time;
    if (duration < 60 || duration > 2500) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    let totalPathLength = 0;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
      if (i > 0) totalPathLength += Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y);
    }

    if (totalPathLength < 50) return;

    const width = maxX - minX;
    const height = maxY - minY;
    const startEndDist = Math.hypot(points[points.length - 1].x - points[0].x, points[points.length - 1].y - points[0].y);

    // 1. Circle / Stir
    if (startEndDist < Math.max(width, height) * 0.55 && totalPathLength > 120) {
      let totalAngle = 0;
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      for (let i = 1; i < points.length; i++) {
        const a1 = Math.atan2(points[i - 1].y - cy, points[i - 1].x - cx);
        const a2 = Math.atan2(points[i].y - cy, points[i].x - cx);
        let da = a2 - a1;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        totalAngle += da;
      }
      if (Math.abs(totalAngle) > Math.PI * 1.2) {
        this.emitGesture(this.GESTURES.STIR_CIRCLE, 90, 'stir');
        return;
      }
    }

    // 2. Shake
    let reversals = 0;
    for (let i = 2; i < points.length; i++) {
      const dx1 = points[i - 1].x - points[i - 2].x;
      const dx2 = points[i].x - points[i - 1].x;
      if (dx1 * dx2 < -40) reversals++;
    }
    if (reversals >= 2 && totalPathLength > 150) {
      this.emitGesture(this.GESTURES.SHAKE_BUBBLE, 85, 'shake');
      return;
    }

    // 3. Slash vs Wave
    if (height > width * 1.6 && height > 80) {
      this.emitGesture(this.GESTURES.SLASH_VERTICAL, 80, 'slash');
      return;
    }
    if (width > height * 1.6 && width > 80) {
      this.emitGesture(this.GESTURES.WAVE_HORIZONTAL, 80, 'wave');
      return;
    }

    // 4. Flick / Toss
    const avgSpeed = totalPathLength / duration;
    if (avgSpeed > 0.8 && totalPathLength > 60) {
      this.emitGesture(this.GESTURES.FLICK_TOSS, 75, 'toss');
      return;
    }
  }
}

window.gestureEngine = new GestureEngine();
