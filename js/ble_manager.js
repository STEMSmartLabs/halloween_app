/**
 * @file ble_manager.js
 * @brief Web Bluetooth API Manager for Magic Wand & BBC micro:bit
 *
 * Referenced from STEMSmartLabs/plushpal-twa framework
 */

class BLEWandManager {
  constructor() {
    this.device = null;
    this.server = null;
    this.deviceType = 'unknown'; // 'custom_wand' | 'microbit'

    // Custom Nordic Wand Characteristics
    this.wandService = null;
    this.accelChar = null;
    this.gestureChar = null;
    this.commandChar = null;
    this.batteryChar = null;

    // micro:bit Characteristics
    this.mbAccelChar = null;
    this.mbButtonAChar = null;
    this.mbButtonBChar = null;
    this.mbLedChar = null;

    this.isConnected = false;
    this.batteryLevel = 100;
    this.deviceName = 'Not Connected';

    // 1. Custom Nordic nRF51822 Wand UUIDs
    this.SERVICE_UUID = '19b10000-e8f2-537e-4f6c-d104768a1214';
    this.ACCEL_CHAR_UUID = '19b10001-e8f2-537e-4f6c-d104768a1214';
    this.GESTURE_CHAR_UUID = '19b10002-e8f2-537e-4f6c-d104768a1214';
    this.COMMAND_CHAR_UUID = '19b10003-e8f2-537e-4f6c-d104768a1214';
    this.BATTERY_SERVICE_UUID = 'battery_service';
    this.BATTERY_CHAR_UUID = 'battery_level';

    // 2. BBC micro:bit Standard BLE UUIDs (STEMSmartLabs plushpal-twa specification)
    this.MB_ACCEL_SERVICE = 'e95d0753-251d-470a-a062-fa1922dfa9a8';
    this.MB_ACCEL_DATA_CHAR = 'e95dca4b-251d-470a-a062-fa1922dfa9a8'; // 4B is required
    this.MB_ACCEL_PERIOD_CHAR = 'e95dfb24-251d-470a-a062-fa1922dfa9a8';

    this.MB_BUTTON_SERVICE = 'e95d9882-251d-470a-a062-fa1922dfa9a8';
    this.MB_BUTTON_A_CHAR = 'e95dda90-251d-470a-a062-fa1922dfa9a8';
    this.MB_BUTTON_B_CHAR = 'e95dda91-251d-470a-a062-fa1922dfa9a8';

    this.MB_LED_SERVICE = 'e95dd91d-251d-470a-a062-fa1922dfa9a8';
    this.MB_LED_MATRIX_CHAR = 'e95d7b77-251d-470a-a062-fa1922dfa9a8';
    this.MB_LED_TEXT_CHAR = 'e95d93ee-251d-470a-a062-fa1922dfa9a8';

    // Event Callbacks
    this.listeners = {
      connection: [],
      gesture: [],
      accel: [],
      battery: []
    };
  }

  isSupported() {
    return !!(navigator.bluetooth && navigator.bluetooth.requestDevice);
  }

  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  emit(event, ...args) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => {
        try {
          cb(...args);
        } catch (e) {
          console.error(`[BLE] Error in listener '${event}':`, e);
        }
      });
    }
  }

  async connect() {
    if (!this.isSupported()) {
      alert("Web Bluetooth is not supported in this browser. Please use Google Chrome, Edge, or Bluefy on iOS.");
      return false;
    }

    try {
      console.log("[BLE] Scanning for Magic Wand / BBC micro:bit...");
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'BBC micro:bit' },
          { namePrefix: 'micro:bit' },
          { name: 'HalloweenWand' },
          { name: 'MagicWand-HLW' },
          { namePrefix: 'MagicWand' }
        ],
        optionalServices: [
          this.SERVICE_UUID,
          this.BATTERY_SERVICE_UUID,
          this.MB_ACCEL_SERVICE,
          this.MB_BUTTON_SERVICE,
          this.MB_LED_SERVICE
        ]
      });

      this.deviceName = this.device.name || 'Magic Wand';
      this.device.addEventListener('gattserverdisconnected', () => this.handleDisconnected());

      console.log(`[BLE] Connecting to GATT Server (${this.deviceName})...`);
      this.server = await this.device.gatt.connect();

      let isMicrobit = false;

      // 1. Discover BBC micro:bit Accelerometer Service
      try {
        const mbAccelService = await this.server.getPrimaryService(this.MB_ACCEL_SERVICE);
        if (mbAccelService) {
          isMicrobit = true;
          this.deviceType = 'microbit';
          console.log("[BLE] Successfully found BBC micro:bit Accelerometer Service!");

          // Accelerometer Data Characteristic (e95dca4b-...)
          this.mbAccelChar = await mbAccelService.getCharacteristic(this.MB_ACCEL_DATA_CHAR);
          await this.mbAccelChar.startNotifications();
          this.mbAccelChar.addEventListener('characteristicvaluechanged', (e) => this.handleMicrobitAccelData(e));
          console.log("[BLE] Subscribed to micro:bit Accelerometer Data stream!");

          // Set 20ms update period
          try {
            const periodChar = await mbAccelService.getCharacteristic(this.MB_ACCEL_PERIOD_CHAR);
            if (periodChar) {
              await periodChar.writeValue(new Uint8Array([20, 0]));
              console.log("[BLE] micro:bit Accelerometer period set to 20ms (50Hz)");
            }
          } catch (e) {
            console.warn("[BLE] micro:bit period config optional:", e);
          }

          // Discover micro:bit Button Service
          try {
            const mbBtnService = await this.server.getPrimaryService(this.MB_BUTTON_SERVICE);
            if (mbBtnService) {
              this.mbButtonAChar = await mbBtnService.getCharacteristic(this.MB_BUTTON_A_CHAR);
              await this.mbButtonAChar.startNotifications();
              this.mbButtonAChar.addEventListener('characteristicvaluechanged', (e) => this.handleMicrobitButtonA(e));

              this.mbButtonBChar = await mbBtnService.getCharacteristic(this.MB_BUTTON_B_CHAR);
              await this.mbButtonBChar.startNotifications();
              this.mbButtonBChar.addEventListener('characteristicvaluechanged', (e) => this.handleMicrobitButtonB(e));
              console.log("[BLE] Subscribed to micro:bit Buttons A & B!");
            }
          } catch (btnErr) {
            console.warn("[BLE] micro:bit Button service optional:", btnErr);
          }

          // Discover micro:bit LED Service
          try {
            const mbLedService = await this.server.getPrimaryService(this.MB_LED_SERVICE);
            if (mbLedService) {
              this.mbLedChar = await mbLedService.getCharacteristic(this.MB_LED_TEXT_CHAR);
            }
          } catch (ledErr) {
            console.warn("[BLE] micro:bit LED service optional:", ledErr);
          }
        }
      } catch (mbErr) {
        console.log("[BLE] micro:bit service not present, checking for Custom Nordic Wand...");
      }

      // 2. Discover Custom Nordic Wand Service
      if (!isMicrobit) {
        try {
          this.wandService = await this.server.getPrimaryService(this.SERVICE_UUID);
          this.deviceType = 'custom_wand';

          this.accelChar = await this.wandService.getCharacteristic(this.ACCEL_CHAR_UUID);
          this.gestureChar = await this.wandService.getCharacteristic(this.GESTURE_CHAR_UUID);
          this.commandChar = await this.wandService.getCharacteristic(this.COMMAND_CHAR_UUID);

          await this.accelChar.startNotifications();
          this.accelChar.addEventListener('characteristicvaluechanged', (e) => this.handleAccelData(e));

          await this.gestureChar.startNotifications();
          this.gestureChar.addEventListener('characteristicvaluechanged', (e) => this.handleGestureData(e));

          console.log("[BLE] Subscribed to Custom Nordic Wand stream!");
        } catch (err) {
          console.warn("[BLE] Custom Wand Service discovery:", err);
        }
      }

      // 3. Discover Standard Battery Service
      try {
        const batService = await this.server.getPrimaryService(this.BATTERY_SERVICE_UUID);
        this.batteryChar = await batService.getCharacteristic(this.BATTERY_CHAR_UUID);
        const val = await this.batteryChar.readValue();
        this.batteryLevel = val.getUint8(0);
        this.emit('battery', this.batteryLevel);

        await this.batteryChar.startNotifications();
        this.batteryChar.addEventListener('characteristicvaluechanged', (e) => {
          this.batteryLevel = e.target.value.getUint8(0);
          this.emit('battery', this.batteryLevel);
        });
      } catch (err) {
        this.batteryLevel = 95;
        this.emit('battery', this.batteryLevel);
      }

      this.isConnected = true;
      this.emit('connection', true, this.deviceName);
      return true;
    } catch (err) {
      console.error("[BLE] Connection failed:", err);
      this.isConnected = false;
      this.emit('connection', false, null);
      return false;
    }
  }

  disconnect() {
    if (this.device && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
    this.handleDisconnected();
  }

  handleDisconnected() {
    this.isConnected = false;
    this.server = null;
    this.wandService = null;
    this.mbAccelChar = null;
    this.mbButtonAChar = null;
    this.mbButtonBChar = null;
    this.mbLedChar = null;
    console.log("[BLE] Wand Device disconnected.");
    this.emit('connection', false, null);
  }

  // =========================================================================
  // NORDIC WAND DATA HANDLERS
  // =========================================================================
  handleAccelData(event) {
    const value = event.target.value;
    if (value.byteLength < 6) return;

    const x = value.getInt16(0, true);
    const y = value.getInt16(2, true);
    const z = value.getInt16(4, true);

    this.emit('accel', { x, y, z, gx: x / 1000.0, gy: y / 1000.0, gz: z / 1000.0 });
  }

  handleGestureData(event) {
    const value = event.target.value;
    if (value.byteLength < 2) return;

    const gestureId = value.getUint8(0);
    const intensity = value.getUint8(1);

    if (gestureId > 0) {
      console.log(`[BLE] Custom Wand Gesture: ${gestureId} (${intensity}%)`);
      this.emit('gesture', gestureId, intensity);
    }
  }

  // =========================================================================
  // BBC MICRO:BIT DATA HANDLERS
  // =========================================================================
  handleMicrobitAccelData(event) {
    const value = event.target.value;
    if (value.byteLength < 6) return;

    // micro:bit sends X, Y, Z int16 (in milli-g: 1000 = 1.0g)
    const x = value.getInt16(0, true);
    const y = value.getInt16(2, true);
    const z = value.getInt16(4, true);

    this.emit('accel', { x, y, z, gx: x / 1000.0, gy: y / 1000.0, gz: z / 1000.0 });
  }

  handleMicrobitButtonA(event) {
    const state = event.target.value.getUint8(0);
    if (state === 1) {
      console.log("[BLE] micro:bit Button A -> Toss / Cast Action!");
      this.emit('gesture', 2, 95); // Flick/Toss
    }
  }

  handleMicrobitButtonB(event) {
    const state = event.target.value.getUint8(0);
    if (state === 1) {
      console.log("[BLE] micro:bit Button B -> Stir Action!");
      this.emit('gesture', 1, 95); // Stir
    }
  }

  async sendCommand(commandByte) {
    if (!this.isConnected) return;

    if (this.commandChar) {
      try {
        const buffer = new Uint8Array([commandByte, 0, 0, 0]);
        await this.commandChar.writeValue(buffer);
      } catch (err) {
        console.error("[BLE] Custom Wand Send command error:", err);
      }
    }

    if (this.mbLedChar) {
      try {
        const encoder = new TextEncoder();
        await this.mbLedChar.writeValue(encoder.encode("★"));
      } catch (err) {
        console.warn("[BLE] micro:bit LED write error:", err);
      }
    }
  }
}

// Global Wand BLE Instance
window.bleWand = new BLEWandManager();
