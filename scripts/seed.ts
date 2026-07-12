import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, doc, setDoc } from "firebase/firestore";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV;
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (APP_ENV !== "emulator") {
  console.error("❌ ERROR: Refusing to seed non-emulator environment.");
  console.error("Set NEXT_PUBLIC_APP_ENV=emulator to seed.");
  process.exit(1);
}

if (PROJECT_ID !== "demo-warkocap") {
  console.error(`❌ ERROR: Safety guard triggered.`);
  console.error(`Expected project ID demo-warkocap but got ${PROJECT_ID}.`);
  console.error("Refusing to seed to prevent accidental production writes.");
  process.exit(1);
}

console.log(`🚀 Starting seed for project: ${PROJECT_ID}`);

const firebaseConfig = {
  projectId: PROJECT_ID,
  apiKey: "demo-key",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

connectFirestoreEmulator(db, "127.0.0.1", 8080);

const mockProducts = [
  { id: "PROD_001", namaProduk: "Kopi Hitam", namaProduk_lowercase: "kopi hitam", hargaModal: 3000, hargaJual: 5000, stok: 100 },
  { id: "PROD_002", namaProduk: "Es Teh Manis", namaProduk_lowercase: "es teh manis", hargaModal: 2000, hargaJual: 4000, stok: null },
  { id: "PROD_003", namaProduk: "Indomie Telur", namaProduk_lowercase: "indomie telur", hargaModal: 5000, hargaJual: 10000, stok: 50 },
];

const mockTransactions = [
  {
    id: "TX_001",
    paymentMethod: "cash",
    timestamp: new Date(),
    totalBelanja: 15000,
    totalModal: 8000,
    items: [
      { productId: "PROD_001", namaProduk: "Kopi Hitam", hargaSatuan: 5000, hargaModal: 3000, quantity: 1 },
      { productId: "PROD_003", namaProduk: "Indomie Telur", hargaSatuan: 10000, hargaModal: 5000, quantity: 1 },
    ],
  },
];

const mockExpenses = [
  {
    id: "EXP_001",
    description: "Beli Es Batu",
    amount: 15000,
    timestamp: new Date(),
  },
];

async function seed() {
  console.log("Seeding products...");
  for (const product of mockProducts) {
    await setDoc(doc(db, "products", product.id), product);
  }

  console.log("Seeding transactions...");
  for (const tx of mockTransactions) {
    await setDoc(doc(db, "transactions", tx.id), tx);
  }

  console.log("Seeding expenses...");
  for (const exp of mockExpenses) {
    await setDoc(doc(db, "expenses", exp.id), exp);
  }

  console.log("✅ Seeding complete!");
  process.exit(0);
}

seed().catch(console.error);
