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

    // Gesture ID mappings:
    // 1: Circle -> Stir Cauldron
    // 2: Up -> 🍊 Orange
    // 3: Down -> 🎃 Pumpkin
    // 4: Left -> 🍎 Apple
    // 5: Right -> 🍓 Strawberry
    this.GESTURES = {
      NONE: 0,
      STIR_CIRCLE: 1,
      UP: 2,
      DOWN: 3,
      LEFT: 4,
      RIGHT: 5
    };

    this.GESTURE_LABEL_TO_ID = {
      none: 0,
      stir: 1,
      circle: 1,
      up: 2,
      orange: 2,
      down: 3,
      pumpkin: 3,
      left: 4,
      apple: 4,
      right: 5,
      strawberry: 5
    };

    this.listeners = [];

    // IMU Sliding Buffer for DTW & Stroke Detection
    this.accelBuffer = [];
    this.lastDTWCheck = 0;
    this.lastEmittedGesture = 0;
    this.lastEmittedTime = 0;

    // High-Pass Filter for Dynamic Motion vs Static Tilt
    this.gravity = { x: 0, y: 0, z: 1.0 };
    this.isMotionArmed = true;
    this.isWandMoving = false;

    // Dynamic Circular Motion & Winding Accumulator
    this.cumulativeWinding = 0;
    this.lastDynAngle = null;
    this.lastDynTime = 0;

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
    // 650ms debounce cooldown to guarantee 1 physical motion = 1 action
    if (now - this.lastEmittedTime < 650) {
      return;
    }
    this.lastEmittedTime = now;
    this.lastEmittedGesture = gestureId;
    this.isMotionArmed = false;

    const names = {
      1: '🔄 Stir Cauldron (Circle)',
      2: '🍊 Orange (Up ⬆️)',
      3: '🎃 Pumpkin (Down ⬇️)',
      4: '🍎 Apple (Left ⬅️)',
      5: '🍓 Strawberry (Right ➡️)'
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
  // BLUETOOTH ACCELEROMETER STREAM & DYNAMIC JERK GESTURE ENGINE
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

    // Keep sliding window buffer (last 25 samples ~ 500ms at 50Hz)
    this.accelBuffer.push({ x: gX, y: gY, z: gZ, time: now });
    if (this.accelBuffer.length > 25) {
      this.accelBuffer.shift();
    }

    // 1. Move Wand Cursor (Uses raw gravity tilt smoothly)
    const targetScreenX = (window.innerWidth / 2) + (gX / 0.8) * (window.innerWidth * 0.42);
    const targetScreenY = (window.innerHeight / 2) + (gY / 0.8) * (window.innerHeight * 0.42);

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

    // 2. High-Pass Filter: Subtract static tilt/gravity to isolate dynamic swing jerk
    const alpha = 0.84;
    this.gravity.x = this.gravity.x * alpha + gX * (1 - alpha);
    this.gravity.y = this.gravity.y * alpha + gY * (1 - alpha);
    this.gravity.z = this.gravity.z * alpha + gZ * (1 - alpha);

    // Dynamic (AC) acceleration vector due to motion only (0 when holding still)
    const dynX = gX - this.gravity.x;
    const dynY = gY - this.gravity.y;
    const dynMag = Math.hypot(dynX, dynY);

    // Dynamic Angle and Continuous Winding Accumulator (Calculated on Dynamic AC motion!)
    if (dynMag > 0.15) {
      const curAngle = Math.atan2(dynY, dynX);
      if (this.lastDynAngle !== null) {
        let da = curAngle - this.lastDynAngle;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;

        // Valid human angular speed range
        if (Math.abs(da) < Math.PI * 0.75) {
          this.cumulativeWinding += da;
        }
      }
      this.lastDynAngle = curAngle;
      this.lastDynTime = now;
    } else {
      // Wand held still: decay winding rapidly
      this.cumulativeWinding *= 0.82;
      if (Math.abs(this.cumulativeWinding) < 0.15) {
        this.cumulativeWinding = 0;
        this.lastDynAngle = null;
      }
      this.isMotionArmed = true;
    }

    const absWinding = Math.abs(this.cumulativeWinding);

    // 3. Circle / Stir Winding Check (HIGHEST PRIORITY)
    // Trigger when cumulative dynamic circular winding reaches ~170 degrees (Math.PI * 0.95)
    if (absWinding >= Math.PI * 0.95 && (now - this.lastEmittedTime > 550)) {
      this.emitGesture(this.GESTURES.STIR_CIRCLE, 98, 'stir');
      this.cumulativeWinding = 0;
      this.lastDynAngle = null;
      this.isMotionArmed = false;
      this.accelBuffer = [];
      return;
    }

    // Secondary Check: Buffer Winding on recent dynamic frames
    if (this.accelBuffer.length >= 10 && (now - this.lastEmittedTime > 550)) {
      let bufWinding = 0;
      for (let i = 1; i < this.accelBuffer.length; i++) {
        const p1 = this.accelBuffer[i - 1];
        const p2 = this.accelBuffer[i];
        const dX1 = p1.x - this.gravity.x;
        const dY1 = p1.y - this.gravity.y;
        const dX2 = p2.x - this.gravity.x;
        const dY2 = p2.y - this.gravity.y;
        if (Math.hypot(dX1, dY1) > 0.14 && Math.hypot(dX2, dY2) > 0.14) {
          let da = Math.atan2(dY2, dX2) - Math.atan2(dY1, dX1);
          while (da > Math.PI) da -= Math.PI * 2;
          while (da < -Math.PI) da += Math.PI * 2;
          bufWinding += da;
        }
      }
      if (Math.abs(bufWinding) >= Math.PI * 1.05) {
        this.emitGesture(this.GESTURES.STIR_CIRCLE, 95, 'stir');
        this.cumulativeWinding = 0;
        this.lastDynAngle = null;
        this.isMotionArmed = false;
        this.accelBuffer = [];
        return;
      }
    }

    // 4. Directional Dynamic Jerk Spike (Left, Right, Up, Down)
    // CRITICAL: ONLY allow linear gestures if the wand is moving strictly in a straight line!
    // If absWinding >= 0.40 rad (~23 deg), the wand is curving/circling, so block linear flicks!
    if (this.isMotionArmed && absWinding < 0.40 && (now - this.lastEmittedTime > 650)) {
      const absDynX = Math.abs(dynX);
      const absDynY = Math.abs(dynY);

      // A. Vertical Jerks (Up: Orange, Down: Pumpkin) - Require strong vertical dominance
      if (absDynY > absDynX * 1.35) {
        if (dynY < -0.28) {
          this.emitGesture(this.GESTURES.UP, 92, 'up'); // 🍊 Orange (Up ⬆️)
          this.isMotionArmed = false;
          this.cumulativeWinding = 0;
        } else if (dynY > 0.28) {
          this.emitGesture(this.GESTURES.DOWN, 92, 'down'); // 🎃 Pumpkin (Down ⬇️)
          this.isMotionArmed = false;
          this.cumulativeWinding = 0;
        }
      } 
      // B. Horizontal Jerks (Left: Apple, Right: Strawberry) - Require strong horizontal dominance
      else if (absDynX > absDynY * 1.35) {
        if (dynX < -0.32) {
          this.emitGesture(this.GESTURES.LEFT, 92, 'left'); // 🍎 Apple (Left ⬅️)
          this.isMotionArmed = false;
          this.cumulativeWinding = 0;
        } else if (dynX > 0.32) {
          this.emitGesture(this.GESTURES.RIGHT, 92, 'right'); // 🍓 Strawberry (Right ➡️)
          this.isMotionArmed = false;
          this.cumulativeWinding = 0;
        }
      }
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
        stir: '🔄 Stir Cauldron (Circle)',
        up: '🍊 Orange (Up ⬆️)',
        down: '🎃 Pumpkin (Down ⬇️)',
        left: '🍎 Apple (Left ⬅️)',
        right: '🍓 Strawberry (Right ➡️)'
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

    if (totalPathLength < 45) return;

    const width = maxX - minX;
    const height = maxY - minY;
    const startEndDist = Math.hypot(points[points.length - 1].x - points[0].x, points[points.length - 1].y - points[0].y);
    const dx = points[points.length - 1].x - points[0].x;
    const dy = points[points.length - 1].y - points[0].y; // Screen coordinates: down is +dy, up is -dy

    // 1. Circle / Stir
    if (startEndDist < Math.max(width, height) * 0.55 && totalPathLength > 100) {
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
      if (Math.abs(totalAngle) > Math.PI * 1.1) {
        this.emitGesture(this.GESTURES.STIR_CIRCLE, 95, 'stir');
        return;
      }
    }

    // 2. Horizontal vs Vertical Swipes
    if (width > height * 1.25 && width > 45) {
      if (dx < 0) {
        this.emitGesture(this.GESTURES.LEFT, 90, 'left'); // 🍎 Apple
      } else {
        this.emitGesture(this.GESTURES.RIGHT, 90, 'right'); // 🍓 Strawberry
      }
      return;
    }

    if (height > width * 1.25 && height > 45) {
      if (dy < 0) {
        this.emitGesture(this.GESTURES.UP, 90, 'up'); // 🍊 Orange (Screen Up is -dy)
      } else {
        this.emitGesture(this.GESTURES.DOWN, 90, 'down'); // 🎃 Pumpkin (Screen Down is +dy)
      }
      return;
    }
  }
}

window.gestureEngine = new GestureEngine();
