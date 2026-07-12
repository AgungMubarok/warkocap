import { type FirebaseApp } from "firebase/app";
import { type Firestore, connectFirestoreEmulator } from "firebase/firestore";

let emulatorsInitialized = false;

export function setupEmulators(app: FirebaseApp, db: Firestore) {
  if (emulatorsInitialized) {
    return;
  }

  // Connect to Firestore Emulator
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  
  console.log("🔥 Connected to Firebase Firestore Emulator!");
  emulatorsInitialized = true;
}
