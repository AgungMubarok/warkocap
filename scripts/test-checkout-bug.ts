import { initializeApp } from "firebase/app";
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
  runTransaction,
  type DocumentReference,
  type DocumentData,
} from "firebase/firestore";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

const firebaseConfig = {
  projectId: PROJECT_ID,
  apiKey: "demo-key",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

connectFirestoreEmulator(db, "127.0.0.1", 8080);

interface TestCartItem {
  id: string;
  quantity: number;
  namaProduk: string;
  stok?: number | null | "";
}

function isTrackedProduct(item: TestCartItem): item is TestCartItem & { stok: number } {
  return typeof item.stok === "number";
}

interface PendingUpdate {
  ref: DocumentReference<DocumentData, DocumentData>;
  nextStock: number;
}

async function testTransaction(name: string, cart: TestCartItem[]) {
  console.log(`\n--- Running Test: ${name} ---`);
  
  try {
    await runTransaction(db, async (transaction) => {
      // Phase 1: READ
      const trackedItems = cart.filter(isTrackedProduct);
      const snapshots = await Promise.all(
        trackedItems.map((item) => transaction.get(doc(db, "products", item.id)))
      );

      // Phase 2: VALIDATE
      const pendingUpdates: PendingUpdate[] = [];
      for (let i = 0; i < trackedItems.length; i++) {
        const item = trackedItems[i];
        const snapshot = snapshots[i];
        if (!snapshot.exists()) throw new Error(`Produk ${item.namaProduk} tidak ditemukan.`);
        
        const productData = snapshot.data();
        if (typeof productData?.stok === "number") {
          const currentStock = Number(productData.stok);
          if (currentStock < item.quantity) throw new Error(`Stok kurang`);
          pendingUpdates.push({ ref: snapshot.ref, nextStock: currentStock - item.quantity });
        }
      }

      // Phase 3: WRITE
      for (const update of pendingUpdates) {
        transaction.update(update.ref, { stok: update.nextStock });
      }
      
      const transactionRef = doc(db, "transactions", `test_${Date.now()}`);
      transaction.set(transactionRef, { test: name });
    });
    console.log(`✅ Success: ${name}`);
  } catch (err: unknown) {
    console.error(`❌ Failed: ${name} - ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function main() {
  console.log("Setting up mock products...");
  
  // Tracked
  await setDoc(doc(db, "products", "TRACKED"), { namaProduk: "Tracked", stok: 100 });
  await setDoc(doc(db, "products", "TRACKED2"), { namaProduk: "Tracked 2", stok: 100 });
  
  // Untracked varieties
  await setDoc(doc(db, "products", "UNTRACKED_MISSING"), { namaProduk: "Missing" });
  await setDoc(doc(db, "products", "UNTRACKED_NULL"), { namaProduk: "Null", stok: null });
  await setDoc(doc(db, "products", "UNTRACKED_EMPTY_STR"), { namaProduk: "Empty", stok: "" });
  
  // Tests
  await testTransaction("A. Untracked (Missing) then Tracked", [
    { id: "UNTRACKED_MISSING", quantity: 1, namaProduk: "Missing" },
    { id: "TRACKED", quantity: 1, namaProduk: "Tracked", stok: 100 }
  ]);
  
  await testTransaction("B. Tracked then Untracked (Missing)", [
    { id: "TRACKED", quantity: 1, namaProduk: "Tracked", stok: 100 },
    { id: "UNTRACKED_MISSING", quantity: 1, namaProduk: "Missing" }
  ]);
  
  await testTransaction("C. Two tracked products", [
    { id: "TRACKED", quantity: 1, namaProduk: "Tracked", stok: 100 },
    { id: "TRACKED2", quantity: 1, namaProduk: "Tracked 2", stok: 100 }
  ]);
  
  await testTransaction("D. Two untracked products (Missing)", [
    { id: "UNTRACKED_MISSING", quantity: 1, namaProduk: "Missing" },
    { id: "UNTRACKED_MISSING", quantity: 1, namaProduk: "Missing" }
  ]);
  
  await testTransaction("E. Untracked (Missing) then Tracked", [
    { id: "UNTRACKED_MISSING", quantity: 1, namaProduk: "Missing" },
    { id: "TRACKED", quantity: 1, namaProduk: "Tracked", stok: 100 }
  ]);

  await testTransaction("F. Untracked (Null) then Tracked", [
    { id: "UNTRACKED_NULL", quantity: 1, namaProduk: "Null", stok: null },
    { id: "TRACKED", quantity: 1, namaProduk: "Tracked", stok: 100 }
  ]);
  
  await testTransaction("G. Untracked (Empty String) then Tracked", [
    { id: "UNTRACKED_EMPTY_STR", quantity: 1, namaProduk: "Empty", stok: "" },
    { id: "TRACKED", quantity: 1, namaProduk: "Tracked", stok: 100 }
  ]);

  console.log("Done");
  process.exit(0);
}

main().catch(console.error);
