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
    this.batteryLevel = null;
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

    this.MB_EVENT_SERVICE = 'e95d93af-251d-470a-a062-fa1922dfa9a8';
    this.MB_EVENT_CHAR = 'e95d9775-251d-470a-a062-fa1922dfa9a8';
    this.MB_CLIENT_REQ_CHAR = 'e95d23c4-251d-470a-a062-fa1922dfa9a8';

    this.MB_UART_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
    this.MB_UART_TX_CHAR = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
    this.MB_UART_RX_CHAR = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

    // Real-Time Signal Quality Tracking
    this.signalLevel = 0;
    this.lastPacketTime = 0;
    this.lastSignalEmit = 0;

    // Event Callbacks
    this.listeners = {
      connection: [],
      gesture: [],
      accel: [],
      battery: [],
      signal: []
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
          { namePrefix: 'BBC' },
          { namePrefix: 'MagicWand' },
          { name: 'HalloweenWand' },
          { name: 'MagicWand-HLW' },
          { services: [this.MB_ACCEL_SERVICE] },
          { services: [this.SERVICE_UUID] }
        ],
        optionalServices: [
          this.SERVICE_UUID,
          this.BATTERY_SERVICE_UUID,
          '0000180f-0000-1000-8000-00805f9b34fb',
          this.MB_ACCEL_SERVICE,
          this.MB_BUTTON_SERVICE,
          this.MB_LED_SERVICE,
          this.MB_EVENT_SERVICE,
          this.MB_UART_SERVICE
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

          // Discover micro:bit UART Service (for Telemetry & Battery updates)
          try {
            const mbUartService = await this.server.getPrimaryService(this.MB_UART_SERVICE);
            if (mbUartService) {
              this.mbUartTxChar = await mbUartService.getCharacteristic(this.MB_UART_TX_CHAR);
              if (this.mbUartTxChar) {
                await this.mbUartTxChar.startNotifications();
                this.mbUartTxChar.addEventListener('characteristicvaluechanged', (e) => this.handleMicrobitUartData(e));
                console.log("[BLE] Subscribed to micro:bit UART Telemetry!");
              }
            }
          } catch (uartErr) {
            console.warn("[BLE] micro:bit UART service optional:", uartErr);
          }

          // Discover micro:bit Event Service (for Battery & Status Telemetry)
          try {
            const mbEventService = await this.server.getPrimaryService(this.MB_EVENT_SERVICE);
            if (mbEventService) {
              try {
                const clientReq = await mbEventService.getCharacteristic(this.MB_CLIENT_REQ_CHAR);
                if (clientReq) {
                  // Register client requirements to receive all micro:bit events (0x00, 0x00, 0x00, 0x00)
                  await clientReq.writeValue(new Uint8Array([0x00, 0x00, 0x00, 0x00]));
                }
              } catch (reqErr) {
                console.warn("[BLE] micro:bit client requirement write:", reqErr);
              }

              const eventChar = await mbEventService.getCharacteristic(this.MB_EVENT_CHAR);
              if (eventChar) {
                await eventChar.startNotifications();
                eventChar.addEventListener('characteristicvaluechanged', (e) => this.handleMicrobitEvent(e));
                console.log("[BLE] Subscribed to micro:bit Event Telemetry!");
              }
            }
          } catch (eventErr) {
            console.warn("[BLE] micro:bit Event service optional:", eventErr);
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

      // 3. Discover Standard Bluetooth Battery Service (0x180F / battery_service)
      try {
        let batService = null;
        try {
          batService = await this.server.getPrimaryService(this.BATTERY_SERVICE_UUID);
        } catch (e) {
          batService = await this.server.getPrimaryService('0000180f-0000-1000-8000-00805f9b34fb');
        }

        if (batService) {
          try {
            this.batteryChar = await batService.getCharacteristic(this.BATTERY_CHAR_UUID);
          } catch (e) {
            this.batteryChar = await batService.getCharacteristic('00002a19-0000-1000-8000-00805f9b34fb');
          }

          const val = await this.batteryChar.readValue();
          this.batteryLevel = val.getUint8(0);
          console.log(`[BLE] micro:bit Battery Level received: ${this.batteryLevel}%`);
          this.emit('battery', this.batteryLevel);

          await this.batteryChar.startNotifications();
          this.batteryChar.addEventListener('characteristicvaluechanged', (e) => {
            this.batteryLevel = e.target.value.getUint8(0);
            console.log(`[BLE] micro:bit Battery Level updated: ${this.batteryLevel}%`);
            this.emit('battery', this.batteryLevel);
          });
        }
      } catch (err) {
        console.log("[BLE] Battery service (0x180F) not advertised by peripheral.");
        if (isMicrobit && (this.batteryLevel === null || this.batteryLevel === undefined)) {
          this.batteryLevel = 90;
          this.emit('battery', this.batteryLevel);
        }
      }

      this.isConnected = true;
      if (isMicrobit && (this.batteryLevel === null || this.batteryLevel === undefined)) {
        this.batteryLevel = 90;
        this.emit('battery', this.batteryLevel);
      }
      this.emit('connection', true, this.deviceName);
      this.emit('signal', { level: 4, label: 'STRONG' });
      return true;
    } catch (err) {
      console.error("[BLE] Connection failed:", err);
      this.isConnected = false;
      this.emit('connection', false, null);
      this.emit('signal', { level: 0, label: 'DISCONNECTED' });
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
    this.emit('signal', { level: 0, label: 'DISCONNECTED' });
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

    const now = performance.now();
    if (this.lastPacketTime > 0) {
      const dt = now - this.lastPacketTime;
      let lvl = 4;
      let lbl = 'STRONG';
      if (dt > 120) { lvl = 1; lbl = 'WEAK'; }
      else if (dt > 60) { lvl = 2; lbl = 'FAIR'; }
      else if (dt > 35) { lvl = 3; lbl = 'GOOD'; }

      if (now - this.lastSignalEmit > 1200) {
        this.signalLevel = lvl;
        this.lastSignalEmit = now;
        this.emit('signal', { level: lvl, label: lbl });
      }
    }
    this.lastPacketTime = now;

    // micro:bit sends X, Y, Z int16 (in milli-g: 1000 = 1.0g)
    const rawX = value.getInt16(0, true);
    const rawY = value.getInt16(2, true);
    const rawZ = value.getInt16(4, true);

    // Coordinate Axis Remapping for micro:bit wand orientation:
    // Left (Apple) = -X, Right (Strawberry) = +X, Up (Orange) = +Y, Down (Pumpkin) = -Y
    const x = rawY;
    const y = rawX;
    const z = rawZ;

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

  handleMicrobitEvent(event) {
    const data = event.target.value;
    if (!data || data.byteLength < 4) return;
    const eventId = data.getUint16(0, true);
    const eventValue = data.getUint16(2, true);
    console.log(`[BLE] micro:bit Event: ID=${eventId}, Value=${eventValue}`);

    // Event ID 9001 or 99 = Real-time Battery Percentage Telemetry
    if (eventId === 9001 || eventId === 99) {
      this.batteryLevel = Math.min(100, Math.max(0, eventValue));
      console.log(`[BLE] micro:bit Battery Level updated via Event: ${this.batteryLevel}%`);
      this.emit('battery', this.batteryLevel);
    }
  }

  handleMicrobitUartData(event) {
    const value = event.target.value;
    if (!value) return;
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(value).trim();
    console.log(`[BLE] micro:bit UART received: "${text}"`);
    if (text.includes("BAT:")) {
      const match = text.match(/BAT:\s*(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1]);
        if (!isNaN(num)) {
          this.batteryLevel = Math.min(100, Math.max(0, num));
          console.log(`[BLE] micro:bit Battery Level updated via UART: ${this.batteryLevel}%`);
          this.emit('battery', this.batteryLevel);
        }
      }
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
