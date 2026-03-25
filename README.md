# OG Ninja Comp – Native App

React + Capacitor native app für iOS und Android.
Konvertiert aus der Web-App (`index.html`) mit Vite-Build-Pipeline, Firebase Modular SDK v10 und Bluetooth/WLAN-Buzzer-Feature.

---

## Voraussetzungen

| Tool | Version | Installieren |
|------|---------|--------------|
| Node.js | ≥ 18 | https://nodejs.org |
| npm | ≥ 9 | mitgeliefert mit Node |
| Xcode | ≥ 15 | App Store (nur macOS, für iOS) |
| Android Studio | ≥ Hedgehog | https://developer.android.com/studio |
| Java (JDK) | ≥ 17 | via Android Studio SDK |

---

## Projekt-Setup

```bash
# Repository klonen
git clone https://github.com/harmatchris/og-ninja-comp.git
cd og-ninja-comp
git checkout native-app

# Ins native-app-Verzeichnis wechseln
cd og-ninja-native

# Abhängigkeiten installieren
npm install
```

---

## Build & Sync

```bash
# Web-App bauen (erzeugt dist/)
npm run build

# Nativen Code mit Capacitor synchronisieren
npm run cap:sync
```

`cap sync` kopiert den `dist/`-Ordner in die nativen Projekte und installiert alle Capacitor-Plugins.

---

## iOS

### Erstmaliges Setup

```bash
# Xcode-Projekt öffnen
npm run cap:ios
```

In Xcode:
1. **Signing & Capabilities** → Team auswählen
2. **Bundle Identifier** prüfen: `com.ogninjacomp.app`
3. Bluetooth-Entitlement ist bereits in `Info.plist` eingetragen

### Auf Gerät / Simulator starten

```bash
# Direkt über CLI (Gerät muss verbunden sein)
npm run cap:run:ios
```

Oder in Xcode: **▶ Run** drücken.

---

## Android

### Erstmaliges Setup

```bash
# Android Studio öffnen
npm run cap:android
```

In Android Studio:
1. **File → Sync Project with Gradle Files** abwarten
2. **Run → Edit Configurations** → App-Modul wählen
3. Bluetooth-Berechtigungen sind bereits in `AndroidManifest.xml` eingetragen

### Auf Gerät / Emulator starten

```bash
# Direkt über CLI (ADB-Gerät muss erkannt sein)
npm run cap:run:android
```

Oder in Android Studio: **▶ Run** drücken.

---

## Entwicklung (Live Reload)

```bash
# Vite Dev-Server starten
npm run dev
```

Für Live Reload auf dem Gerät kann in `capacitor.config.ts` temporär ein `server.url` gesetzt werden:

```ts
server: {
  url: 'http://192.168.x.x:5173',  // eigene IP
  cleartext: true,
}
```

Danach `cap sync` ausführen und App neu starten.

---

## Projektstruktur

```
og-ninja-native/
├── src/
│   ├── main.jsx          # React Entry Point
│   ├── App.jsx           # Haupt-App-Komponente (JuryApp, SetupWizard, etc.)
│   ├── firebase.js       # Firebase Modular SDK v10 Wrapper
│   ├── index.css         # Globale Styles + Safe-Area-Insets
│   └── buzzer/
│       ├── BuzzerService.js    # BLE + WebSocket Buzzer-Logik
│       ├── useBuzzer.js        # React Hook für Buzzer-State
│       └── BuzzerManager.jsx   # Buzzer-Verwaltungs-UI
├── ios/                  # Xcode-Projekt (generiert von Capacitor)
├── android/              # Android Studio-Projekt (generiert von Capacitor)
├── dist/                 # Vite Build-Output (wird von cap sync genutzt)
├── capacitor.config.ts   # Capacitor-Konfiguration
├── vite.config.js        # Vite Build-Konfiguration
└── package.json
```

---

## Buzzer-Feature

### WLAN-Buzzer (WebSocket)

Der Buzzer-Server (ESP32 oder Raspberry Pi) muss im gleichen WLAN sein und JSON-Nachrichten senden:

```json
{"type": "signal", "stage": 1, "ts": 1700000000000}
```

- **Standard-Port:** `8765`
- **Protokoll:** WebSocket (`ws://`)
- Verbindung wird automatisch neu aufgebaut (3s Delay, 5s Timeout)

### Bluetooth-Buzzer (BLE)

BLE-Service-UUID: `12345678-1234-1234-1234-123456789abc`

| Characteristic | UUID | Funktion |
|----------------|------|---------|
| Signal | `...9001` | Empfängt Signal (Notify) |
| Stage | `...9002` | Schreibt aktive Stage-Nummer |

Beim Empfang eines BLE-Signals:
- App stoppt den aktiven Lauf automatisch
- Haptisches Feedback (iOS: Taptic Engine, Android: Vibration)

### Buzzer pro Stage

- Bis zu 4 Buzzer konfigurierbar
- Jeder Buzzer wird einer Stage (1–4) zugewiesen
- WLAN und BLE können gemischt werden
- Konfiguration wird lokal gespeichert (localStorage)

---

## Firebase-Konfiguration

Die Firebase-Config befindet sich in `src/firebase.js`. Für eine andere Firebase-Instanz die Config-Werte anpassen:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  databaseURL: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
};
```

---

## Berechtigungen

### iOS (`Info.plist`)

| Schlüssel | Zweck |
|-----------|-------|
| `NSBluetoothAlwaysUsageDescription` | BLE-Buzzer verbinden |
| `NSBluetoothPeripheralUsageDescription` | BLE Legacy (iOS < 13) |
| `NSLocalNetworkUsageDescription` | WLAN-Buzzer (WebSocket) |
| `NSCameraUsageDescription` | QR-Code-Scan (optional) |

### Android (`AndroidManifest.xml`)

| Permission | Zweck |
|------------|-------|
| `BLUETOOTH_SCAN` | BLE-Geräte suchen (API 31+) |
| `BLUETOOTH_CONNECT` | BLE-Verbindung aufbauen |
| `BLUETOOTH_ADVERTISE` | BLE-Advertising |
| `BLUETOOTH` + `BLUETOOTH_ADMIN` | Legacy (API < 31) |
| `ACCESS_FINE_LOCATION` | BLE-Scan erfordert Location |
| `INTERNET` | Firebase + WebSocket |
| `ACCESS_NETWORK_STATE` | Netzwerk-Status prüfen |
| `VIBRATE` | Haptisches Feedback |

---

## Verfügbare Scripts

| Script | Beschreibung |
|--------|-------------|
| `npm run dev` | Vite Dev-Server starten |
| `npm run build` | Produktions-Build erstellen |
| `npm run preview` | Build lokal vorschauen |
| `npm run cap:sync` | Web-Build in native Projekte kopieren |
| `npm run cap:ios` | Xcode öffnen |
| `npm run cap:android` | Android Studio öffnen |
| `npm run cap:run:ios` | Auf iOS-Gerät/Simulator deployen |
| `npm run cap:run:android` | Auf Android-Gerät/Emulator deployen |

---

## Abhängigkeiten (Kern)

| Paket | Version | Zweck |
|-------|---------|-------|
| `react` | ^18.3 | UI Framework |
| `firebase` | ^10.14 | Realtime Database (Modular SDK) |
| `@capacitor/core` | ^6.2 | Native Bridge |
| `@capacitor/android` | ^6.2 | Android-Target |
| `@capacitor/ios` | ^6.2 | iOS-Target |
| `@capacitor-community/bluetooth-le` | ^6.1 | BLE-Plugin |
| `@capacitor/haptics` | ^6.0 | Haptisches Feedback |
| `@capacitor/app` | ^6.0 | App-Lifecycle-Events |
| `@capacitor/status-bar` | ^6.0 | Statusleisten-Steuerung |
| `qrcode` | ^1.5 | QR-Code-Generierung |
| `vite` | ^5.4 | Build-Tool |

---

## Bekannte Hinweise

- **Erster App-Start (iOS):** Bluetooth-Berechtigung wird beim ersten Verbindungsversuch angefragt
- **Android API < 31:** `ACCESS_FINE_LOCATION` wird für BLE-Scan benötigt — Nutzer muss Location-Berechtigung erteilen
- **Bundle-Größe:** Das Haupt-Bundle ist ~592KB (unkomprimiert). Gzip-Kompression reduziert dies auf ~170KB
- **Offline:** Firebase Realtime Database hat eingeschränkte Offline-Unterstützung; für vollständige Offline-Funktion ggf. `enableIndexedDbPersistence` hinzufügen
