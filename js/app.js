/**
 * @file app.js
 * @brief Main Application Coordinator with DTW Wand Training System
 *
 * Implements STEMSmartLabs/plushpal-twa wand training and classification framework
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log("🎃 Initializing Halloween Candy Brew PWA...");

  // 1. Initialize Particle Engine
  window.particleEngine = new HalloweenParticleEngine('particle-canvas');
  window.particleEngine.start();

  // 2. Initialize Candy Brew Game
  window.candyGame = new CandyBrewGame();

  // 3. Register Service Worker for Offline PWA support
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('[PWA] ServiceWorker registered successfully:', reg.scope))
      .catch((err) => console.warn('[PWA] ServiceWorker registration failed:', err));
  }

  // 4. Setup Audio Start on first interaction
  const unlockAudio = () => {
    if (window.halloweenAudio) {
      window.halloweenAudio.init();
    }
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('click', unlockAudio);
  window.addEventListener('touchstart', unlockAudio);

  // 5. Connect Bluetooth Wand Button
  const wandWidget = document.getElementById('wand-status-widget');
  const wandStatusText = document.getElementById('wand-status-text');
  const wandBatteryFill = document.getElementById('battery-level-fill');
  const wandBatteryText = document.getElementById('battery-percentage-text');

  if (wandWidget && window.bleWand) {
    wandWidget.addEventListener('click', async (e) => {
      // Don't trigger pair if clicking the Train Movements button
      if (e.target.closest('#open-trainer-btn')) return;

      if (window.bleWand.isConnected) {
        window.bleWand.disconnect();
      } else {
        if (wandStatusText) wandStatusText.textContent = "Pairing...";
        const success = await window.bleWand.connect();
        if (!success && wandStatusText) {
          wandStatusText.textContent = "Click to Pair";
        }
      }
    });

    window.bleWand.on('connection', (connected, deviceName) => {
      if (connected) {
        wandWidget.classList.add('connected');
        wandWidget.classList.remove('disconnected');
        if (wandStatusText) wandStatusText.textContent = deviceName || 'Connected';
        if (window.candyGame) window.candyGame.showFloatingFeedback("🪄 Magic Wand Connected!");
      } else {
        wandWidget.classList.remove('connected');
        wandWidget.classList.add('disconnected');
        if (wandStatusText) wandStatusText.textContent = 'Disconnected';
      }
    });

    window.bleWand.on('battery', (level) => {
      if (wandBatteryFill) wandBatteryFill.style.width = `${level}%`;
      if (wandBatteryText) wandBatteryText.textContent = `${level}%`;
    });
  }

  // 6. Bind Ingredient Shelf Clicks
  const ingredientCards = document.querySelectorAll('.ingredient-card');
  ingredientCards.forEach((card) => {
    card.addEventListener('click', () => {
      const itemType = card.dataset.ingredient;
      console.log(`[App] Ingredient clicked: ${itemType}`);
      if (window.candyGame) {
        window.candyGame.addIngredient(itemType, card);
      }
    });
  });

  // 7. Bind Quick Gesture Buttons (Virtual Wand Bar)
  const quickBtns = document.querySelectorAll('.quick-gesture-btn');
  quickBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const gestureId = parseInt(btn.dataset.gesture, 10);
      const gestureName = btn.dataset.name || 'Spell';
      console.log(`[App] Quick Gesture clicked: ${gestureName} (ID: ${gestureId})`);
      if (window.virtualWand) {
        window.virtualWand.triggerGesture(gestureId, gestureName);
      }
    });
  });

  // 8. Stir & Brew Action Button
  const stirActionBtn = document.getElementById('stir-action-btn');
  if (stirActionBtn) {
    stirActionBtn.addEventListener('click', () => {
      console.log('[App] STIR & BREW button clicked!');
      if (window.virtualWand) {
        window.virtualWand.triggerGesture(1, 'Stir Cauldron');
      }
    });
  }

  // 9. Real-Time Pointer & Touch Wand Motion Tracking
  window.addEventListener('pointermove', (e) => {
    if (window.particleEngine) {
      window.particleEngine.updateWandPosition(e.clientX, e.clientY);
    }
  });

  // 10. Mouse Click / Tap Magical Sparkle Bursts
  window.addEventListener('pointerdown', (e) => {
    if (window.particleEngine) {
      window.particleEngine.spawnClickSparks(e.clientX, e.clientY);
    }
  });

  // =========================================================================
  // 11. WAND GESTURE TRAINER MODAL CONTROLLER (STEMSmartLabs DTW FRAMEWORK)
  // =========================================================================
  const trainerModal = document.getElementById('wand-trainer-modal');
  const openTrainerBtn = document.getElementById('open-trainer-btn');
  const closeTrainerBtn = document.getElementById('close-trainer-btn');
  const doneTrainerBtn = document.getElementById('done-trainer-btn');
  const resetTrainerBtn = document.getElementById('reset-trainer-btn');

  const imuXFill = document.getElementById('imu-x-fill');
  const imuYFill = document.getElementById('imu-y-fill');
  const imuZFill = document.getElementById('imu-z-fill');
  const imuXVal = document.getElementById('imu-x-val');
  const imuYVal = document.getElementById('imu-y-val');
  const imuZVal = document.getElementById('imu-z-val');
  const livePredictionBadge = document.getElementById('live-dtw-prediction');

  const countdownOverlay = document.getElementById('recording-countdown-overlay');
  const countdownDisplay = document.getElementById('countdown-display');
  const countdownInstruction = document.getElementById('countdown-instruction');

  function updateSampleCounters() {
    if (!window.gestureTrainer) return;
    const gestures = ['stir', 'toss', 'slash', 'shake', 'thrust'];
    gestures.forEach((g) => {
      const count = window.gestureTrainer.gestureSamples.filter(s => s.label === g).length;
      const el = document.getElementById(`samples-count-${g}`);
      if (el) {
        el.textContent = `${count} Trained Samples`;
      }
    });
  }

  if (openTrainerBtn && trainerModal) {
    openTrainerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      trainerModal.style.display = 'flex';
      updateSampleCounters();
    });

    const closeModal = () => {
      trainerModal.style.display = 'none';
    };

    if (closeTrainerBtn) closeTrainerBtn.addEventListener('click', closeModal);
    if (doneTrainerBtn) doneTrainerBtn.addEventListener('click', closeModal);

    if (resetTrainerBtn) {
      resetTrainerBtn.addEventListener('click', () => {
        if (confirm("Reset wand movements to default predefined gestures?")) {
          if (window.gestureTrainer) {
            window.gestureTrainer.resetToDefaults();
            updateSampleCounters();
            if (window.candyGame) window.candyGame.showFloatingFeedback("🔄 Wand gestures reset to default!");
          }
        }
      });
    }

    // Live IMU Motion & Prediction Updates
    if (window.bleWand) {
      window.bleWand.on('accel', ({ gx, gy, gz }) => {
        if (trainerModal.style.display !== 'none') {
          // Normalize to percentage (range -2g to +2g)
          const normX = Math.max(0, Math.min(100, (gx + 2) / 4 * 100));
          const normY = Math.max(0, Math.min(100, (gy + 2) / 4 * 100));
          const normZ = Math.max(0, Math.min(100, (gz + 2) / 4 * 100));

          if (imuXFill) imuXFill.style.width = `${normX}%`;
          if (imuYFill) imuYFill.style.width = `${normY}%`;
          if (imuZFill) imuZFill.style.width = `${normZ}%`;

          if (imuXVal) imuXVal.textContent = `${gx >= 0 ? '+' : ''}${gx.toFixed(2)}g`;
          if (imuYVal) imuYVal.textContent = `${gy >= 0 ? '+' : ''}${gy.toFixed(2)}g`;
          if (imuZVal) imuZVal.textContent = `${gz >= 0 ? '+' : ''}${gz.toFixed(2)}g`;
        }
      });
    }

    // Live Prediction Listener
    if (window.gestureEngine) {
      window.gestureEngine.onGesture((gestureId, intensity, actionName) => {
        if (livePredictionBadge && trainerModal.style.display !== 'none') {
          livePredictionBadge.textContent = `🟢 Match: ${actionName} (${intensity}%)`;
          livePredictionBadge.style.background = 'rgba(34, 197, 94, 0.4)';
          setTimeout(() => {
            if (livePredictionBadge) {
              livePredictionBadge.style.background = 'rgba(34, 197, 94, 0.2)';
            }
          }, 800);
        }
      });
    }

    // Record Gesture Buttons (3-2-1 Countdown)
    document.querySelectorAll('.record-gesture-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const gesture = btn.dataset.gesture;
        if (!window.gestureTrainer) return;

        if (!window.bleWand || !window.bleWand.isConnected) {
          alert("Please connect your BBC micro:bit or Magic Wand before training!");
          return;
        }

        // Run 3-2-1 Countdown
        let count = 3;
        if (countdownOverlay && countdownDisplay && countdownInstruction) {
          countdownOverlay.style.display = 'flex';
          countdownDisplay.textContent = count;
          countdownInstruction.textContent = `Get ready to perform: ${gesture.toUpperCase()}`;

          const interval = setInterval(() => {
            count--;
            if (count > 0) {
              countdownDisplay.textContent = count;
            } else if (count === 0) {
              countdownDisplay.textContent = "GO!";
              countdownInstruction.textContent = `Now perform ${gesture.toUpperCase()} with your wand!`;
              
              // Start Recording
              window.gestureTrainer.startRecording(gesture, (success, newSample) => {
                clearInterval(interval);
                countdownOverlay.style.display = 'none';
                if (success) {
                  updateSampleCounters();
                  if (window.candyGame) window.candyGame.showFloatingFeedback(`✨ Saved training for ${gesture}!`);
                } else {
                  alert("Recording was too short. Try again!");
                }
              });
            }
          }, 1000);
        }
      });
    });
  }

  console.log("🍬 Halloween Candy Brew PWA Ready with DTW Gesture Training & micro:bit Support!");
});
