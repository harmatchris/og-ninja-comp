// ── BUZZER SERVICE ─────────────────────────────────────────
// Verwaltet Bluetooth-LE (via @capacitor-community/bluetooth-le)
// und WebSocket-Verbindungen zu Hardware-Startgebern.
//
// Unterstützte Buzzer-Hardware:
//   • Jedes BLE-Gerät das den "Ninja Buzzer" Service (UUID unten) anbietet
//   • Jedes Gerät mit HTTP/WebSocket-Server im WLAN (z.B. ESP32, Raspberry Pi)
//
// Protokoll WebSocket:
//   Server sendet: {"type":"signal","stage":1,"ts":1234567890}
//   Client kann senden: {"type":"test","stage":1}

// ── BLE KONSTANTEN ────────────────────────────────────────
// Service UUID für Ninja-Buzzer-Hardware (anpassbar)
export const BLE_SERVICE_UUID = '12345678-1234-1234-1234-123456789abc';
// Characteristic UUID für Buzzer-Signal
export const BLE_SIGNAL_CHAR_UUID = '12345678-1234-1234-1234-123456789001';
// Characteristic UUID für Stage-Assignment (Buzzer erkennt seine Stage)
export const BLE_STAGE_CHAR_UUID = '12345678-1234-1234-1234-123456789002';

// ── WEBSOCKET KONSTANTEN ──────────────────────────────────
export const WS_DEFAULT_PORT = 8765;
export const WS_TIMEOUT_MS = 5000;
export const WS_RECONNECT_DELAY_MS = 3000;

// ── BUZZER-TYP DEFINITIONEN ──────────────────────────────
/**
 * @typedef {Object} BuzzerConfig
 * @property {string} id          – Eindeutige ID
 * @property {string} name        – Anzeigename (z.B. "Stage 1 Buzzer")
 * @property {number} stageNum    – Zugewiesene Stage-Nummer (1-basiert)
 * @property {'ble'|'wifi'} mode  – Verbindungsart
 * @property {string} [deviceId]  – BLE Device ID (für BLE-Modus)
 * @property {string} [ipAddress] – IP-Adresse des Buzzers (für WLAN-Modus)
 * @property {number} [port]      – WebSocket-Port (für WLAN-Modus, default 8765)
 * @property {'disconnected'|'connecting'|'connected'|'signal'} status
 * @property {number|null} lastSignal  – Timestamp des letzten Signals (ms)
 */

// ── BLE-BUZZER-KLASSE ─────────────────────────────────────
export class BleBuzzer {
  constructor(config, onStatusChange, onSignal) {
    this.config = config;
    this.onStatusChange = onStatusChange; // callback(id, status)
    this.onSignal = onSignal;            // callback(id, timestamp)
    this._BleClient = null;
    this._connected = false;
  }

  // BLE initialisieren und initialisierte BleClient-Instanz laden
  async _getBleClient() {
    if (this._BleClient) return this._BleClient;
    try {
      const { BleClient } = await import('@capacitor-community/bluetooth-le');
      await BleClient.initialize({ androidNeverForLocation: true });
      this._BleClient = BleClient;
      return BleClient;
    } catch (e) {
      console.error('[BleBuzzer] BleClient init fehlgeschlagen:', e);
      throw e;
    }
  }

  // BLE-Scan starten und Ergebnisse zurückgeben
  async scan(timeoutMs = 8000) {
    const BleClient = await this._getBleClient();
    const devices = [];
    await BleClient.requestLEScan(
      { services: [BLE_SERVICE_UUID] },
      (result) => {
        if (!devices.find(d => d.deviceId === result.device.deviceId)) {
          devices.push({
            deviceId: result.device.deviceId,
            name: result.device.name || 'Unbekannter Buzzer',
            rssi: result.rssi,
          });
        }
      }
    );
    return new Promise((resolve) => {
      setTimeout(async () => {
        await BleClient.stopLEScan();
        resolve(devices);
      }, timeoutMs);
    });
  }

  // Verbindung zu einem BLE-Buzzer herstellen
  async connect() {
    const BleClient = await this._getBleClient();
    const deviceId = this.config.deviceId;
    if (!deviceId) throw new Error('Keine Device-ID konfiguriert');

    this.onStatusChange(this.config.id, 'connecting');
    try {
      await BleClient.connect(deviceId, (id) => {
        // Disconnekt-Callback
        console.log('[BleBuzzer] Verbindung getrennt:', id);
        this._connected = false;
        this.onStatusChange(this.config.id, 'disconnected');
      });

      // Stage-Nummer auf den Buzzer schreiben
      const stageBytes = new Uint8Array([this.config.stageNum]);
      await BleClient.write(deviceId, BLE_SERVICE_UUID, BLE_STAGE_CHAR_UUID, {
        value: btoa(String.fromCharCode(...stageBytes)),
      });

      // Signal-Characteristic abonnieren
      await BleClient.startNotifications(
        deviceId,
        BLE_SERVICE_UUID,
        BLE_SIGNAL_CHAR_UUID,
        (value) => {
          // Signal empfangen!
          console.log('[BleBuzzer] Signal empfangen von', deviceId);
          this.onSignal(this.config.id, Date.now());
          this.onStatusChange(this.config.id, 'signal');
          // Nach 500ms zurück auf "connected"
          setTimeout(() => this.onStatusChange(this.config.id, 'connected'), 500);
        }
      );

      this._connected = true;
      this.onStatusChange(this.config.id, 'connected');
    } catch (e) {
      console.error('[BleBuzzer] Verbindungsfehler:', e);
      this.onStatusChange(this.config.id, 'disconnected');
      throw e;
    }
  }

  // Verbindung trennen
  async disconnect() {
    if (!this._BleClient || !this.config.deviceId) return;
    try {
      await this._BleClient.disconnect(this.config.deviceId);
    } catch (e) {
      console.warn('[BleBuzzer] Trennung fehlgeschlagen:', e);
    }
    this._connected = false;
    this.onStatusChange(this.config.id, 'disconnected');
  }

  // Test-Signal senden (Buzzer piept/leuchtet kurz)
  async sendTest() {
    if (!this._connected || !this._BleClient) return;
    try {
      const testBytes = new Uint8Array([0xFF]); // Test-Byte
      await this._BleClient.write(
        this.config.deviceId,
        BLE_SERVICE_UUID,
        BLE_SIGNAL_CHAR_UUID,
        { value: btoa(String.fromCharCode(...testBytes)) }
      );
    } catch (e) {
      console.warn('[BleBuzzer] Test-Signal fehlgeschlagen:', e);
    }
  }
}

// ── WEBSOCKET-BUZZER-KLASSE ───────────────────────────────
export class WifiBuzzer {
  constructor(config, onStatusChange, onSignal) {
    this.config = config;
    this.onStatusChange = onStatusChange;
    this.onSignal = onSignal;
    this._ws = null;
    this._reconnectTimer = null;
    this._shouldReconnect = false;
  }

  // WebSocket-Verbindung aufbauen
  connect() {
    const ip = this.config.ipAddress;
    const port = this.config.port || WS_DEFAULT_PORT;
    if (!ip) {
      console.error('[WifiBuzzer] Keine IP-Adresse konfiguriert');
      return;
    }

    this._shouldReconnect = true;
    this.onStatusChange(this.config.id, 'connecting');
    this._createWs(ip, port);
  }

  _createWs(ip, port) {
    const url = `ws://${ip}:${port}`;
    console.log('[WifiBuzzer] Verbinde mit', url);

    try {
      this._ws = new WebSocket(url);
    } catch (e) {
      console.error('[WifiBuzzer] WebSocket-Fehler:', e);
      this.onStatusChange(this.config.id, 'disconnected');
      this._scheduleReconnect(ip, port);
      return;
    }

    // Verbindungsaufbau-Timeout
    const connectTimeout = setTimeout(() => {
      if (this._ws?.readyState !== WebSocket.OPEN) {
        console.warn('[WifiBuzzer] Verbindungs-Timeout');
        this._ws?.close();
      }
    }, WS_TIMEOUT_MS);

    this._ws.onopen = () => {
      clearTimeout(connectTimeout);
      console.log('[WifiBuzzer] Verbunden mit', url);
      this.onStatusChange(this.config.id, 'connected');
      // Stage-Nummer an den Buzzer-Server senden
      this._send({ type: 'register', stage: this.config.stageNum });
    };

    this._ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'signal') {
          console.log('[WifiBuzzer] Signal empfangen von Stage', msg.stage);
          this.onSignal(this.config.id, Date.now());
          this.onStatusChange(this.config.id, 'signal');
          setTimeout(() => this.onStatusChange(this.config.id, 'connected'), 500);
        } else if (msg.type === 'pong') {
          // Heartbeat-Antwort (optional)
        }
      } catch (e) {
        console.warn('[WifiBuzzer] Unbekannte Nachricht:', event.data);
      }
    };

    this._ws.onerror = (e) => {
      clearTimeout(connectTimeout);
      console.error('[WifiBuzzer] Fehler:', e);
    };

    this._ws.onclose = () => {
      clearTimeout(connectTimeout);
      console.log('[WifiBuzzer] Verbindung geschlossen');
      this.onStatusChange(this.config.id, 'disconnected');
      if (this._shouldReconnect) {
        this._scheduleReconnect(ip, port);
      }
    };
  }

  _scheduleReconnect(ip, port) {
    if (!this._shouldReconnect) return;
    console.log(`[WifiBuzzer] Reconnect in ${WS_RECONNECT_DELAY_MS}ms...`);
    this._reconnectTimer = setTimeout(() => {
      if (this._shouldReconnect) this._createWs(ip, port);
    }, WS_RECONNECT_DELAY_MS);
  }

  _send(data) {
    if (this._ws?.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(data));
    }
  }

  // Verbindung trennen
  disconnect() {
    this._shouldReconnect = false;
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
    this.onStatusChange(this.config.id, 'disconnected');
  }

  // Test-Signal senden (Buzzer leuchtet/piept kurz)
  sendTest() {
    this._send({ type: 'test', stage: this.config.stageNum });
  }
}

// ── BUZZER-MANAGER-SERVICE ────────────────────────────────
// Singleton-Klasse die alle Buzzer verwaltet
export class BuzzerManagerService {
  constructor() {
    this._buzzers = new Map(); // id → { config, instance }
    this._statusCallbacks = new Set();
    this._signalCallbacks = new Set();
    this._configs = this._loadConfigs();
  }

  // Persistierte Buzzer-Konfigurationen laden
  _loadConfigs() {
    try {
      return JSON.parse(localStorage.getItem('ogn-buzzers') || '[]');
    } catch {
      return [];
    }
  }

  // Konfigurationen persistieren
  _saveConfigs() {
    const configs = [...this._buzzers.values()].map(b => b.config);
    localStorage.setItem('ogn-buzzers', JSON.stringify(configs));
  }

  // Status-Callback registrieren (für React-State-Updates)
  onStatusChange(cb) {
    this._statusCallbacks.add(cb);
    return () => this._statusCallbacks.delete(cb);
  }

  // Signal-Callback registrieren
  onSignal(cb) {
    this._signalCallbacks.add(cb);
    return () => this._signalCallbacks.delete(cb);
  }

  _notifyStatus(id, status) {
    this._statusCallbacks.forEach(cb => cb(id, status));
  }

  _notifySignal(id, timestamp) {
    this._signalCallbacks.forEach(cb => cb(id, timestamp));
  }

  // Alle konfigurierten Buzzer mit aktuellem Status zurückgeben
  getBuzzers() {
    return this._configs.map(cfg => ({
      ...cfg,
      status: this._buzzers.get(cfg.id)?.status || 'disconnected',
      lastSignal: this._buzzers.get(cfg.id)?.lastSignal || null,
    }));
  }

  // Buzzer hinzufügen oder aktualisieren
  saveBuzzer(config) {
    const existing = this._buzzers.get(config.id);
    if (existing) {
      existing.config = { ...existing.config, ...config };
    } else {
      this._configs.push(config);
      this._buzzers.set(config.id, { config, status: 'disconnected', lastSignal: null });
    }
    this._saveConfigs();
  }

  // Buzzer löschen
  removeBuzzer(id) {
    const entry = this._buzzers.get(id);
    if (entry?.instance) {
      if (entry.instance.disconnect) entry.instance.disconnect();
    }
    this._buzzers.delete(id);
    this._configs = this._configs.filter(c => c.id !== id);
    this._saveConfigs();
  }

  // Verbindung zu einem Buzzer herstellen
  async connect(id) {
    const entry = this._buzzers.get(id);
    if (!entry) return;

    const onStatus = (bid, status) => {
      if (entry) entry.status = status;
      this._notifyStatus(bid, status);
    };
    const onSignal = (bid, ts) => {
      if (entry) entry.lastSignal = ts;
      this._notifySignal(bid, ts);
    };

    const cfg = entry.config;
    if (cfg.mode === 'ble') {
      entry.instance = new BleBuzzer(cfg, onStatus, onSignal);
      await entry.instance.connect();
    } else {
      entry.instance = new WifiBuzzer(cfg, onStatus, onSignal);
      entry.instance.connect();
    }
  }

  // Verbindung trennen
  async disconnect(id) {
    const entry = this._buzzers.get(id);
    if (!entry?.instance) return;
    await entry.instance.disconnect();
  }

  // Test-Signal an einen Buzzer senden
  async sendTest(id) {
    const entry = this._buzzers.get(id);
    if (!entry?.instance) return;
    await entry.instance.sendTest?.();
  }

  // BLE-Scan starten und gefundene Geräte zurückgeben
  async scanBle(timeoutMs = 8000) {
    const tempBuzzer = new BleBuzzer({}, () => {}, () => {});
    return tempBuzzer.scan(timeoutMs);
  }
}

// ── GLOBALER SERVICE-SINGLETON ────────────────────────────
let _serviceInstance = null;
export const getBuzzerService = () => {
  if (!_serviceInstance) {
    _serviceInstance = new BuzzerManagerService();
    // Beim Start: gespeicherte Konfigurationen in die Map laden
    const configs = _serviceInstance._configs;
    configs.forEach(cfg => {
      _serviceInstance._buzzers.set(cfg.id, { config: cfg, status: 'disconnected', lastSignal: null });
    });
  }
  return _serviceInstance;
};
