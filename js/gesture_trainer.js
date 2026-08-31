/**
 * @file gesture_trainer.js
 * @brief DTW-based Gesture Classifier & Interactive Wand Trainer
 *
 * Implements PlushPal TWA Dynamic Time Warping multi-sample matcher
 */

class GestureTrainer {
  constructor() {
    this.storageKey = 'magic_wand_trained_gestures_v9';
    this.gestureSamples = []; // Array of { label, id, data: [ {x, y, z} ] }
    this.isRecording = false;
    this.recordingBuffer = [];
    this.recordingLabel = null;
    this.recordingDuration = 1200; // 1.2s per recording

    // Recognition Parameters
    this.classifyFrequency = 200; // ms between checks
    this.distThreshold = 190; // Distance cutoff for match
    this.minEnergyThreshold = 0.35; // Dynamic motion threshold to filter static holding/resting
    this.lastRecognizedGesture = 'none';
    this.lastRecognizedConfidence = 100;

    // Load Default Predefined Gestures
    this.loadInitialGestures();
  }

  loadInitialGestures() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        this.gestureSamples = JSON.parse(saved);
        console.log(`[GestureTrainer] Loaded ${this.gestureSamples.length} saved gesture samples.`);
        return;
      } catch (e) {
        console.warn("[GestureTrainer] Failed parsing saved gestures, loading defaults:", e);
      }
    }

    this.gestureSamples = this.generatePredefinedGestures();
    console.log(`[GestureTrainer] Initialized ${this.gestureSamples.length} calibrated gesture templates.`);
  }

  saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.gestureSamples));
    } catch (e) {
      console.warn("[GestureTrainer] Storage save error:", e);
    }
  }

  resetToDefaults() {
    localStorage.removeItem(this.storageKey);
    this.gestureSamples = this.generatePredefinedGestures();
    this.saveToStorage();
    console.log("[GestureTrainer] Reset model to default gestures.");
  }

  // =========================================================================
  // PREDEFINED SYNTHETIC GESTURE TEMPLATES
  // =========================================================================
  generatePredefinedGestures() {
    const samples = [];
    const sampleCount = 35; // ~700ms at 50Hz

    // 0. IDLE / NONE STATE (Resting wand, 1g earth gravity)
    for (let s = 0; s < 3; s++) {
      const data = [];
      for (let i = 0; i < sampleCount; i++) {
        data.push({
          x: (Math.random() - 0.5) * 0.03,
          y: (Math.random() - 0.5) * 0.03,
          z: 0.98 + (Math.random() - 0.5) * 0.03
        });
      }
      samples.push({ label: 'none', id: `predef_none_${s}`, data });
    }

    // 1. STIR CAULDRON (Clockwise & Counter-Clockwise Circles in X/Y plane)
    for (let s = 0; s < 3; s++) {
      const dataCW = [];
      const dataCCW = [];
      const phaseOffset = (s * Math.PI) / 2;
      for (let i = 0; i < sampleCount; i++) {
        const t = (i / sampleCount) * Math.PI * 2 * 1.5 + phaseOffset;
        // Clockwise: Top -> Right -> Bottom -> Left
        dataCW.push({
          x: Math.sin(t) * 0.75 + (Math.random() - 0.5) * 0.04,
          y: -Math.cos(t) * 0.75 + (Math.random() - 0.5) * 0.04,
          z: 0.95 + (Math.random() - 0.5) * 0.06
        });
        // Counter-Clockwise: Top -> Left -> Bottom -> Right
        dataCCW.push({
          x: -Math.sin(t) * 0.75 + (Math.random() - 0.5) * 0.04,
          y: -Math.cos(t) * 0.75 + (Math.random() - 0.5) * 0.04,
          z: 0.95 + (Math.random() - 0.5) * 0.06
        });
      }
      samples.push({ label: 'stir', id: `predef_stir_cw_${s}`, data: dataCW });
      samples.push({ label: 'stir', id: `predef_stir_ccw_${s}`, data: dataCCW });
    }

    // 2. UP: 🍊 ORANGE (Sharp upward flick/swipe along -Y axis in device coordinates)
    for (let s = 0; s < 4; s++) {
      const data = [];
      const peakPos = 0.28 + s * 0.08;
      for (let i = 0; i < sampleCount; i++) {
        const progress = i / sampleCount;
        let impulse = 0;
        if (progress > peakPos && progress < peakPos + 0.3) {
          impulse = Math.sin(((progress - peakPos) / 0.3) * Math.PI) * 1.5;
        }
        data.push({
          x: (Math.random() - 0.5) * 0.06,
          y: 0.85 - impulse * 1.7 + (Math.random() - 0.5) * 0.05,
          z: 0.3 - impulse * 0.3 + (Math.random() - 0.5) * 0.05
        });
      }
      samples.push({ label: 'up', id: `predef_up_${s}`, data });
    }

    // 3. DOWN: 🎃 PUMPKIN (Sharp downward slash/swipe along +Y axis in device coordinates)
    for (let s = 0; s < 4; s++) {
      const data = [];
      const peakPos = 0.28 + s * 0.08;
      for (let i = 0; i < sampleCount; i++) {
        const progress = i / sampleCount;
        let impulse = 0;
        if (progress > peakPos && progress < peakPos + 0.3) {
          impulse = Math.sin(((progress - peakPos) / 0.3) * Math.PI) * 1.5;
        }
        data.push({
          x: (Math.random() - 0.5) * 0.06,
          y: 0.2 + impulse * 1.6 + (Math.random() - 0.5) * 0.05,
          z: 0.9 - impulse * 0.5 + (Math.random() - 0.5) * 0.05
        });
      }
      samples.push({ label: 'down', id: `predef_down_${s}`, data });
    }

    // 4. LEFT: 🍎 APPLE (Sharp swipe/flick to the left along -X axis)
    for (let s = 0; s < 4; s++) {
      const data = [];
      const peakPos = 0.28 + s * 0.08;
      for (let i = 0; i < sampleCount; i++) {
        const progress = i / sampleCount;
        let impulse = 0;
        if (progress > peakPos && progress < peakPos + 0.3) {
          impulse = Math.sin(((progress - peakPos) / 0.3) * Math.PI) * 1.5;
        }
        data.push({
          x: -impulse * 1.6 + (Math.random() - 0.5) * 0.06,
          y: 0.1 + (Math.random() - 0.5) * 0.06,
          z: 0.9 + (Math.random() - 0.5) * 0.05
        });
      }
      samples.push({ label: 'left', id: `predef_left_${s}`, data });
    }

    // 5. RIGHT: 🍓 STRAWBERRY (Sharp swipe/flick to the right along +X axis)
    for (let s = 0; s < 4; s++) {
      const data = [];
      const peakPos = 0.28 + s * 0.08;
      for (let i = 0; i < sampleCount; i++) {
        const progress = i / sampleCount;
        let impulse = 0;
        if (progress > peakPos && progress < peakPos + 0.3) {
          impulse = Math.sin(((progress - peakPos) / 0.3) * Math.PI) * 1.5;
        }
        data.push({
          x: impulse * 1.6 + (Math.random() - 0.5) * 0.06,
          y: 0.1 + (Math.random() - 0.5) * 0.06,
          z: 0.9 + (Math.random() - 0.5) * 0.05
        });
      }
      samples.push({ label: 'right', id: `predef_right_${s}`, data });
    }

    return samples;
  }

  // =========================================================================
  // RECORDING & USER TRAINING
  // =========================================================================
  startRecording(gestureLabel, onComplete) {
    if (this.isRecording) return;
    this.isRecording = true;
    this.recordingLabel = gestureLabel;
    this.recordingBuffer = [];

    console.log(`[GestureTrainer] Recording gesture '${gestureLabel}'...`);

    setTimeout(() => {
      this.isRecording = false;
      if (this.recordingBuffer.length >= 10) {
        const newSample = {
          label: this.recordingLabel,
          id: `custom_${this.recordingLabel}_${Date.now()}`,
          data: [...this.recordingBuffer]
        };
        this.gestureSamples.push(newSample);
        this.saveToStorage();
        console.log(`[GestureTrainer] Saved recording with ${this.recordingBuffer.length} frames.`);
        if (onComplete) onComplete(true, newSample);
      } else {
        console.warn("[GestureTrainer] Recording too short, ignored.");
        if (onComplete) onComplete(false, null);
      }
      this.recordingBuffer = [];
      this.recordingLabel = null;
    }, this.recordingDuration);
  }

  feedAccel(gx, gy, gz) {
    if (this.isRecording) {
      this.recordingBuffer.push({ x: gx, y: gy, z: gz });
    }
  }

  // =========================================================================
  // DTW REAL-TIME CLASSIFICATION
  // =========================================================================
  classify(liveBuffer) {
    if (!liveBuffer || liveBuffer.length < 10 || this.gestureSamples.length === 0) {
      return { gesture: 'none', confidence: 100, isIdle: true };
    }

    const len = liveBuffer.length;

    // 1. Dynamic Energy Gate (Variance from Mean)
    let sumX = 0, sumY = 0, sumZ = 0;
    for (let i = 0; i < len; i++) {
      sumX += liveBuffer[i].x;
      sumY += liveBuffer[i].y;
      sumZ += liveBuffer[i].z;
    }
    const meanX = sumX / len;
    const meanY = sumY / len;
    const meanZ = sumZ / len;

    let totalVariance = 0;
    for (let i = 0; i < len; i++) {
      const dx = liveBuffer[i].x - meanX;
      const dy = liveBuffer[i].y - meanY;
      const dz = liveBuffer[i].z - meanZ;
      totalVariance += Math.hypot(dx, dy, dz);
    }
    const dynamicEnergy = totalVariance / len;

    // If wand is resting/idle, instantly return 'none'
    if (dynamicEnergy < this.minEnergyThreshold) {
      this.lastRecognizedGesture = 'none';
      this.lastRecognizedConfidence = 100;
      return { gesture: 'none', confidence: 100, isIdle: true, dynamicEnergy };
    }

    // 2. DTW Distance to all gesture templates
    let bestMatch = 'none';
    let minDistance = Infinity;

    const input = this.resampleBuffer(liveBuffer, 30);

    for (let i = 0; i < this.gestureSamples.length; i++) {
      const sample = this.gestureSamples[i];
      const target = this.resampleBuffer(sample.data, 30);

      const dtw = new DynamicTimeWarping(input, target);
      const dist = dtw.getDistance();

      if (dist < minDistance) {
        minDistance = dist;
        bestMatch = sample.label;
      }
    }

    if (bestMatch === 'none' || minDistance >= this.distThreshold) {
      this.lastRecognizedGesture = 'none';
      this.lastRecognizedConfidence = 100;
      return { gesture: 'none', confidence: 100, isIdle: true, distance: minDistance, dynamicEnergy };
    }

    const confidence = Math.round(Math.max(50, Math.min(100, (1 - minDistance / this.distThreshold) * 100)));
    this.lastRecognizedGesture = bestMatch;
    this.lastRecognizedConfidence = confidence;
    return { gesture: bestMatch, confidence, isIdle: false, distance: minDistance, dynamicEnergy };
  }

  resampleBuffer(buffer, targetLength) {
    if (buffer.length === targetLength) return buffer;
    if (buffer.length < 2) return buffer;

    const result = [];
    const step = (buffer.length - 1) / (targetLength - 1);

    for (let i = 0; i < targetLength; i++) {
      const index = i * step;
      const lower = Math.floor(index);
      const upper = Math.min(buffer.length - 1, lower + 1);
      const frac = index - lower;

      result.push({
        x: buffer[lower].x + (buffer[upper].x - buffer[lower].x) * frac,
        y: buffer[lower].y + (buffer[upper].y - buffer[lower].y) * frac,
        z: buffer[lower].z + (buffer[upper].z - buffer[lower].z) * frac
      });
    }
    return result;
  }
}

window.gestureTrainer = new GestureTrainer();
