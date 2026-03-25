// ── BUZZER MANAGER KOMPONENTE ─────────────────────────────
// UI zur Verwaltung aller Buzzer-Verbindungen.
// Zeigt Verbindungsstatus, ermöglicht Scannen, Hinzufügen,
// Bearbeiten, Testen und Löschen von Buzzern.
import React, { useState } from 'react';
import { useBuzzer } from './useBuzzer.js';

// ── STATUS-FARBEN ─────────────────────────────────────────
const STATUS_COLOR = {
  disconnected: 'rgba(255,255,255,.3)',
  connecting: '#FF9F0A',
  connected: '#34C759',
  signal: '#34C759',
};

const STATUS_LABEL_DE = {
  disconnected: 'Getrennt',
  connecting: 'Verbinde…',
  connected: 'Verbunden',
  signal: '⚡ Signal!',
};

// ── BUZZER STATUS BADGE (für TopBar) ─────────────────────
/**
 * Kleines Status-Badge das den Buzzer-Status für eine Stage anzeigt.
 * Wird im JuryApp-TopBar eingeblendet.
 */
export const BuzzerStatusBadge = ({ stageNum, buzzers }) => {
  if (!buzzers || buzzers.length === 0) return null;
  const stageBuzzer = buzzers.find(b => b.stageNum === stageNum);
  if (!stageBuzzer) return null;
  const status = stageBuzzer.status || 'disconnected';
  if (status === 'disconnected') return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px',
      borderRadius: 8,
      background: status === 'signal'
        ? 'rgba(52,199,89,.3)'
        : 'rgba(52,199,89,.12)',
      border: `1px solid ${STATUS_COLOR[status]}55`,
      fontSize: 10,
      fontWeight: 800,
      color: STATUS_COLOR[status],
      animation: status === 'signal' ? 'buzzerGlow 0.5s ease' : undefined,
    }}>
      📡 {STATUS_LABEL_DE[status]}
    </div>
  );
};

// ── BUZZER CARD ───────────────────────────────────────────
const BuzzerCard = ({ buzzer, onConnect, onDisconnect, onTest, onEdit, onDelete, numStages }) => {
  const status = buzzer.status || 'disconnected';
  const isConnected = status === 'connected' || status === 'signal';

  return (
    <div style={{
      background: 'var(--card)',
      border: `1px solid ${isConnected ? STATUS_COLOR[status] + '55' : 'var(--border)'}`,
      borderRadius: 14,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      transition: 'border-color .2s',
    }}>
      {/* Header: Name + Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: STATUS_COLOR[status],
          boxShadow: isConnected ? `0 0 8px ${STATUS_COLOR[status]}` : 'none',
          flexShrink: 0,
          transition: 'all .3s',
        }}/>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{buzzer.name}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
            {buzzer.mode === 'ble' ? '🔵 Bluetooth' : `📶 WLAN · ${buzzer.ipAddress || '—'}:${buzzer.port || 8765}`}
            {' · '}Stage {buzzer.stageNum}
          </div>
        </div>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: STATUS_COLOR[status],
          padding: '2px 8px',
          borderRadius: 6,
          background: STATUS_COLOR[status] + '15',
        }}>
          {STATUS_LABEL_DE[status]}
        </div>
      </div>

      {/* Letztes Signal */}
      {buzzer.lastSignal && (
        <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'JetBrains Mono' }}>
          Letztes Signal: {new Date(buzzer.lastSignal).toLocaleTimeString('de')}
        </div>
      )}

      {/* Aktions-Buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        {!isConnected ? (
          <button
            className="btn btn-coral"
            style={{ flex: 1, padding: '8px 12px', fontSize: 13 }}
            onClick={() => onConnect(buzzer.id)}
          >
            {status === 'connecting' ? '⏳ Verbinde…' : '🔗 Verbinden'}
          </button>
        ) : (
          <>
            <button
              className="btn btn-ghost"
              style={{ flex: 1, padding: '8px 12px', fontSize: 12 }}
              onClick={() => onTest(buzzer.id)}
            >
              🧪 Testen
            </button>
            <button
              className="btn btn-ghost"
              style={{ flex: 1, padding: '8px 12px', fontSize: 12, color: 'var(--red)' }}
              onClick={() => onDisconnect(buzzer.id)}
            >
              ✕ Trennen
            </button>
          </>
        )}
        <button
          className="btn btn-ghost"
          style={{ padding: '8px 10px', fontSize: 13 }}
          onClick={() => onEdit(buzzer)}
        >
          ✏️
        </button>
        <button
          className="btn btn-ghost"
          style={{ padding: '8px 10px', fontSize: 13, color: 'rgba(255,59,48,.7)' }}
          onClick={() => onDelete(buzzer.id)}
        >
          🗑
        </button>
      </div>
    </div>
  );
};

// ── BUZZER HINZUFÜGEN / BEARBEITEN MODAL ─────────────────
const BuzzerEditModal = ({ buzzer, numStages, onSave, onClose }) => {
  const [form, setForm] = useState(buzzer || {
    name: '',
    stageNum: 1,
    mode: 'wifi',
    ipAddress: '',
    port: 8765,
    deviceId: '',
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,.8)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--card)',
        borderRadius: '22px 22px 0 0',
        width: '100%',
        maxWidth: 520,
        padding: '24px 20px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>
          {buzzer ? '✏️ Buzzer bearbeiten' : '➕ Neuer Buzzer'}
        </div>

        {/* Name */}
        <div>
          <div className="lbl" style={{ marginBottom: 6 }}>Name</div>
          <input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="z.B. Stage 1 Buzzer"
          />
        </div>

        {/* Stage */}
        <div>
          <div className="lbl" style={{ marginBottom: 6 }}>Stage zuweisen</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Array.from({ length: Math.max(numStages || 4, 4) }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                className={`chip${form.stageNum === n ? ' active' : ''}`}
                onClick={() => set('stageNum', n)}
              >
                Stage {n}
              </button>
            ))}
          </div>
        </div>

        {/* Verbindungsart */}
        <div>
          <div className="lbl" style={{ marginBottom: 6 }}>Verbindungsart</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ id: 'wifi', label: '📶 WLAN' }, { id: 'ble', label: '🔵 Bluetooth' }].map(m => (
              <button
                key={m.id}
                className={`chip${form.mode === m.id ? ' active' : ''}`}
                onClick={() => set('mode', m.id)}
                style={{ flex: 1 }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* WLAN-Einstellungen */}
        {form.mode === 'wifi' && (
          <>
            <div>
              <div className="lbl" style={{ marginBottom: 6 }}>IP-Adresse des Buzzers</div>
              <input
                value={form.ipAddress}
                onChange={e => set('ipAddress', e.target.value)}
                placeholder="z.B. 192.168.1.100"
                type="text"
                inputMode="decimal"
              />
            </div>
            <div>
              <div className="lbl" style={{ marginBottom: 6 }}>WebSocket-Port</div>
              <input
                value={form.port}
                onChange={e => set('port', Number(e.target.value))}
                type="number"
                placeholder="8765"
              />
            </div>
          </>
        )}

        {/* BLE: Device ID (wird durch Scan gefüllt) */}
        {form.mode === 'ble' && (
          <div>
            <div className="lbl" style={{ marginBottom: 6 }}>Bluetooth-Gerät-ID</div>
            <input
              value={form.deviceId || ''}
              onChange={e => set('deviceId', e.target.value)}
              placeholder="Wird durch BLE-Scan ausgefüllt"
              readOnly
            />
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <button className="btn btn-ghost" style={{ flex: 1, padding: 14 }} onClick={onClose}>
            Abbrechen
          </button>
          <button
            className="btn btn-coral"
            style={{ flex: 1, padding: 14 }}
            onClick={() => onSave(form)}
            disabled={!form.name.trim()}
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
};

// ── HAUPT-BUZZER-MANAGER ──────────────────────────────────
/**
 * Buzzer-Verwaltungs-Tab im JuryApp.
 * Zeigt alle konfigurierten Buzzer mit Status und Aktionen.
 */
export const BuzzerManager = ({ stageNum, buzzers = [], onConnect, onDisconnect, onTest, numStages = 4 }) => {
  const { addBuzzer, removeBuzzer, scanBle, scanning, scanResults } = useBuzzer({ stageNum });
  const [editBuzzer, setEditBuzzer] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showBleScan, setShowBleScan] = useState(false);

  const handleSave = (form) => {
    addBuzzer(form);
    setEditBuzzer(null);
    setShowAdd(false);
  };

  const handleStartBleScan = async () => {
    setShowBleScan(true);
    await scanBle(8000);
  };

  const handleBlePick = (device) => {
    setShowBleScan(false);
    setShowAdd(true);
    setEditBuzzer({
      name: device.name || 'BLE Buzzer',
      stageNum,
      mode: 'ble',
      deviceId: device.deviceId,
    });
  };

  return (
    <div style={{ padding: '0 16px 100px' }}>
      {/* Header */}
      <div style={{
        padding: '16px 0 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>📡 Buzzer</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            {buzzers.filter(b => b.status === 'connected' || b.status === 'signal').length} verbunden
            {' / '}{buzzers.length} konfiguriert
          </div>
        </div>
        <button className="btn btn-coral" style={{ padding: '8px 14px', fontSize: 13 }}
          onClick={() => { setEditBuzzer(null); setShowAdd(true); }}>
          ＋ Neu
        </button>
      </div>

      {/* Info-Box: Protokoll-Hinweis */}
      <div style={{
        background: 'rgba(255,159,10,.08)',
        border: '1px solid rgba(255,159,10,.2)',
        borderRadius: 12,
        padding: '10px 14px',
        marginBottom: 14,
        fontSize: 12,
        color: 'rgba(255,200,100,.9)',
      }}>
        <strong>📋 Buzzer-Protokoll (WebSocket):</strong> Der Buzzer-Server muss JSON senden:
        {' '}<code style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>
          {'{'}«type»:«signal»,«stage»:N{'}'}
        </code>
        <br />
        Hardware: ESP32 oder Raspberry Pi im selben WLAN.
      </div>

      {/* BLE-Scan Button */}
      <button
        className="btn btn-ghost"
        style={{ width: '100%', padding: '10px', marginBottom: 14, fontSize: 13 }}
        onClick={handleStartBleScan}
        disabled={scanning}
      >
        {scanning ? '🔍 Suche BLE-Geräte…' : '🔵 BLE-Buzzer suchen'}
      </button>

      {/* BLE-Scan-Ergebnisse */}
      {showBleScan && scanResults.length > 0 && (
        <div style={{
          background: 'var(--card2)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          marginBottom: 14,
          overflow: 'hidden',
        }}>
          <div className="lbl" style={{ padding: '10px 14px 6px' }}>Gefundene Geräte</div>
          {scanResults.map(d => (
            <button
              key={d.deviceId}
              className="btn btn-ghost"
              style={{ width: '100%', borderRadius: 0, padding: '10px 14px', justifyContent: 'space-between' }}
              onClick={() => handleBlePick(d)}
            >
              <span style={{ fontWeight: 600 }}>{d.name}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'JetBrains Mono' }}>
                RSSI: {d.rssi} dBm
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Buzzer-Liste */}
      {buzzers.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 24px',
          color: 'var(--muted)',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📡</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Kein Buzzer konfiguriert</div>
          <div style={{ fontSize: 12 }}>
            Füge einen WLAN- oder Bluetooth-Buzzer hinzu um Läufe automatisch zu stoppen.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {buzzers.map(b => (
            <BuzzerCard
              key={b.id}
              buzzer={b}
              onConnect={onConnect}
              onDisconnect={onDisconnect}
              onTest={onTest}
              onEdit={(bz) => { setEditBuzzer(bz); setShowAdd(true); }}
              onDelete={removeBuzzer}
              numStages={numStages}
            />
          ))}
        </div>
      )}

      {/* Buzzer Hinzufügen/Bearbeiten Modal */}
      {showAdd && (
        <BuzzerEditModal
          buzzer={editBuzzer}
          numStages={numStages}
          onSave={handleSave}
          onClose={() => { setShowAdd(false); setEditBuzzer(null); }}
        />
      )}
    </div>
  );
};

export default BuzzerManager;
