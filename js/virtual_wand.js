/**
 * @file virtual_wand.js
 * @brief Virtual Wand Simulator for instant play and testing without hardware
 */

class VirtualWandController {
  constructor() {
    this.initKeyboardShortcuts();
    this.initMotionSensor();
  }

  initKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Don't trigger if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const key = e.key.toUpperCase();
      switch (key) {
        case 'C': // Circle / Stir
          this.triggerGesture(1, 'Circle Stir');
          break;
        case 'U': // Up / Orange
        case 'O':
          this.triggerGesture(2, 'Up Orange');
          break;
        case 'D': // Down / Pumpkin
        case 'P':
          this.triggerGesture(3, 'Down Pumpkin');
          break;
        case 'L': // Left / Apple
        case 'A':
          this.triggerGesture(4, 'Left Apple');
          break;
        case 'R': // Right / Strawberry
        case 'S':
          this.triggerGesture(5, 'Right Strawberry');
          break;
        case 'M': // Mute / Unmute
          if (window.halloweenAudio) {
            const isMuted = window.halloweenAudio.toggleMute();
            const btn = document.getElementById('audio-toggle-btn');
            if (btn) btn.textContent = isMuted ? '🔇' : '🔊';
          }
          break;
      }
    });
  }

  triggerGesture(gestureId, name) {
    console.log(`[VirtualWand] Triggered: ${name} (ID: ${gestureId})`);
    if (window.gestureEngine) {
      window.gestureEngine.emitGesture(gestureId, 95);
    }
  }

  initMotionSensor() {
    // Check if device supports DeviceMotionEvent (Mobile phone test wand)
    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', (event) => {
        const acc = event.accelerationIncludingGravity;
        if (!acc || acc.x === null) return;

        // Detect severe shake on phone
        const mag = Math.hypot(acc.x, acc.y, acc.z);
        if (mag > 25) {
          this.triggerGesture(3, 'Device Shake');
        }
      }, { passive: true });
    }
  }
}

window.virtualWand = new VirtualWandController();
