// ── useBuzzer HOOK ─────────────────────────────────────────
// React-Hook für Buzzer-Verwaltung in Komponenten.
// Verwendet den BuzzerManagerService-Singleton.
// Ermöglicht reaktives State-Management für Buzzer-Status.
import { useState, useEffect, useCallback } from 'react';
import { getBuzzerService } from './BuzzerService.js';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

// Haptisches Feedback auslösen (native auf iOS/Android)
const haptic = async (style = ImpactStyle.Medium) => {
  try {
    await Haptics.impact({ style });
  } catch {
    // Im Web ignorieren (Haptics nur nativ verfügbar)
  }
};

/**
 * Verwaltet alle Buzzer-Verbindungen.
 * @param {object} options
 * @param {number} [options.stageNum]  – Aktuell aktive Stage-Nummer
 * @returns {{ buzzers, connectBuzzer, disconnectBuzzer, sendTestSignal, addBuzzer, removeBuzzer, scanBle }}
 */
export function useBuzzer({ stageNum } = {}) {
  const service = getBuzzerService();
  const [buzzers, setBuzzers] = useState(() => service.getBuzzers());
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState([]);

  // Auf Status-Änderungen reagieren (aktualisiert den React-State)
  useEffect(() => {
    const unsubStatus = service.onStatusChange((id, status) => {
      setBuzzers(service.getBuzzers());
    });
    const unsubSignal = service.onSignal((id, ts) => {
      // Haptisches Feedback bei Buzzer-Signal (starke Vibration)
      haptic(ImpactStyle.Heavy);
      setBuzzers(service.getBuzzers());
    });
    return () => {
      unsubStatus();
      unsubSignal();
    };
  }, []);

  // Verbindung zu einem Buzzer herstellen
  const connectBuzzer = useCallback(async (id) => {
    try {
      await haptic(ImpactStyle.Light);
      await service.connect(id);
      setBuzzers(service.getBuzzers());
    } catch (e) {
      console.error('[useBuzzer] Verbindungsfehler:', e);
    }
  }, []);

  // Verbindung zu einem Buzzer trennen
  const disconnectBuzzer = useCallback(async (id) => {
    await service.disconnect(id);
    setBuzzers(service.getBuzzers());
  }, []);

  // Test-Signal senden (Buzzer piept/leuchtet)
  const sendTestSignal = useCallback(async (id) => {
    await service.sendTest(id);
    await haptic(ImpactStyle.Light);
  }, []);

  // Neuen Buzzer zur Konfiguration hinzufügen
  const addBuzzer = useCallback((config) => {
    // Eindeutige ID generieren falls nicht vorhanden
    const fullConfig = {
      id: config.id || Math.random().toString(36).slice(2, 8).toUpperCase(),
      name: config.name || `Buzzer ${buzzers.length + 1}`,
      stageNum: config.stageNum || 1,
      mode: config.mode || 'wifi',
      ipAddress: config.ipAddress || '',
      port: config.port || 8765,
      deviceId: config.deviceId || null,
      status: 'disconnected',
      lastSignal: null,
      ...config,
    };
    service.saveBuzzer(fullConfig);
    setBuzzers(service.getBuzzers());
    return fullConfig.id;
  }, [buzzers.length]);

  // Buzzer entfernen
  const removeBuzzer = useCallback((id) => {
    service.removeBuzzer(id);
    setBuzzers(service.getBuzzers());
  }, []);

  // BLE-Scan starten
  const scanBle = useCallback(async () => {
    setScanning(true);
    setScanResults([]);
    try {
      const devices = await service.scanBle(8000);
      setScanResults(devices);
    } catch (e) {
      console.error('[useBuzzer] BLE-Scan fehlgeschlagen:', e);
    } finally {
      setScanning(false);
    }
  }, []);

  // Buzzer-Status für die aktuelle Stage ermitteln
  const buzzerStatus = stageNum
    ? buzzers.find(b => b.stageNum === stageNum)?.status || 'disconnected'
    : 'disconnected';

  // Ist mindestens 1 Buzzer verbunden?
  const isConnected = buzzers.some(b => b.status === 'connected' || b.status === 'signal');

  return {
    buzzers,
    buzzerStatus,
    isConnected,
    scanning,
    scanResults,
    connectBuzzer,
    disconnectBuzzer,
    sendTestSignal,
    addBuzzer,
    removeBuzzer,
    scanBle,
  };
}
