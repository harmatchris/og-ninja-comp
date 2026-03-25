import { CapacitorConfig } from '@capacitor/cli';

// Capacitor-Konfiguration für OG Ninja Comp
const config: CapacitorConfig = {
  appId: 'com.ogninjacomp.app',
  appName: 'OG Ninja Comp',
  webDir: 'dist',
  // Server-Konfiguration (für Live-Reload bei Entwicklung)
  server: {
    androidScheme: 'https',
    // Für Dev: URL des lokalen Vite-Servers einkommentieren
    // url: 'http://192.168.1.x:3000',
    // cleartext: true,
  },
  // iOS-spezifische Einstellungen
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0B0B14',
    scrollEnabled: false,
  },
  // Android-spezifische Einstellungen
  android: {
    backgroundColor: '#0B0B14',
  },
  // Plugin-Konfigurationen
  plugins: {
    // StatusBar: Transluzentes Statusbar für iOS (Dark Mode)
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0B0B14',
      overlaysWebView: true,
    },
    // Bluetooth LE: Berechtigungen für BLE-Scanner
    BluetoothLe: {
      displayStrings: {
        scanning: 'Suche Buzzer...',
        cancel: 'Abbrechen',
        availableDevices: 'Verfügbare Geräte',
        noDeviceFound: 'Kein Buzzer gefunden',
      },
    },
  },
};

export default config;
