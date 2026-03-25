// ── FIREBASE KONFIGURATION ─────────────────────────────────
// Modular Firebase SDK v10 (kein compat-Layer mehr).
// Projekt: ninja-hq-chris, Pfad: ogn/
import { initializeApp, getApps } from 'firebase/app';
import {
  getDatabase,
  ref,
  set,
  update,
  remove,
  onValue,
  get,
} from 'firebase/database';

// Firebase-Projektkonfiguration
const FB_CFG = {
  apiKey: 'AIzaSyBQPi4f2qWg3xA65hLL7IpxOiq3kzVk5ls',
  authDomain: 'ninja-hq-chris.firebaseapp.com',
  databaseURL: 'https://ninja-hq-chris-default-rtdb.firebaseio.com',
  projectId: 'ninja-hq-chris',
  storageBucket: 'ninja-hq-chris.firebasestorage.app',
  messagingSenderId: '811964168411',
  appId: '1:811964168411:web:f49a87b1bdcb6aaebf74fe',
};

// App nur einmal initialisieren (wichtig für HMR in Vite)
const app = getApps().length === 0 ? initializeApp(FB_CFG) : getApps()[0];
export const db = getDatabase(app);

// ── FIREBASE HELPER-FUNKTIONEN ─────────────────────────────
// Schreibt einen Wert an einem Pfad
export const fbSet = (path, value) => set(ref(db, path), value);

// Aktualisiert mehrere Felder an einem Pfad
export const fbUpdate = (path, value) => update(ref(db, path), value);

// Löscht einen Pfad
export const fbRemove = (path) => remove(ref(db, path));

// Batch-Update an Root-Ebene (für Multi-Pfad-Writes)
export const fbRootUpdate = (updates) => update(ref(db), updates);

// Einmaliges Lesen eines Werts
export const fbGet = async (path) => {
  const snap = await get(ref(db, path));
  return snap.val();
};

// Echtzeit-Listener (gibt unsubscribe-Funktion zurück)
export const fbListen = (path, callback) => {
  if (!path) return () => {};
  return onValue(ref(db, path), (snap) => callback(snap.val()));
};

export { ref, onValue };
