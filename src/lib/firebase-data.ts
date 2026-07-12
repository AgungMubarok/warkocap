import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  readSessionCache,
  removeSessionCacheByPrefix,
  writeSessionCache,
} from "@/lib/session-cache";
import type { ExpenseRecord, Product, TransactionRecord } from "@/lib/types";

const PRODUCTS_CACHE_KEY = "kuasir:v2:products";
const EXPENSES_CACHE_PREFIX = "kuasir:v2:expenses:";
const TRANSACTIONS_CACHE_PREFIX = "kuasir:v2:transactions:";

export const PRODUCTS_CACHE_CHANGE_EVENT = "productsCacheChange";

interface SerializedExpenseRecord {
  id: string;
  description: string;
  amount: number;
  timestamp: string | null;
}

interface SerializedTransactionRecord {
  id: string;
  totalBelanja: number;
  totalModal: number;
  timestamp: string | null;
  items: TransactionRecord["items"];
  paymentMethod: "cash" | "qris";
}

function dispatchWindowEvent(eventName: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(eventName));
}

function toDate(value: unknown) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as Timestamp).toDate();
  }

  if (typeof value === "string") {
    return new Date(value);
  }

  return null;
}

function normalizeProductDoc(documentSnapshot: QueryDocumentSnapshot<DocumentData>): Product {
  const data = documentSnapshot.data();

  return {
    id: documentSnapshot.id,
    namaProduk: String(data.namaProduk ?? ""),
    namaProduk_lowercase: String(
      data.namaProduk_lowercase ?? data.namaProduk ?? ""
    ).toLowerCase(),
    hargaJual: Number(data.hargaJual ?? 0),
    hargaModal: Number(data.hargaModal ?? 0),
    stok:
      typeof data.stok === "number" && Number.isFinite(data.stok)
        ? Number(data.stok)
        : null,
  };
}

function sortProducts(products: Product[]) {
  return [...products].sort((left, right) =>
    left.namaProduk_lowercase.localeCompare(right.namaProduk_lowercase)
  );
}

function buildRangeCacheKey(prefix: string, start: Date, end: Date) {
  return `${prefix}${start.toISOString()}__${end.toISOString()}`;
}

function serializeTransactions(transactions: TransactionRecord[]): SerializedTransactionRecord[] {
  return transactions.map((transaction) => ({
    ...transaction,
    timestamp: transaction.timestamp?.toISOString() ?? null,
  }));
}

function deserializeTransactions(
  transactions: SerializedTransactionRecord[]
): TransactionRecord[] {
  return transactions.map((transaction) => ({
    ...transaction,
    timestamp: transaction.timestamp ? new Date(transaction.timestamp) : null,
  }));
}

function serializeExpenses(expenses: ExpenseRecord[]): SerializedExpenseRecord[] {
  return expenses.map((expense) => ({
    ...expense,
    timestamp: expense.timestamp?.toISOString() ?? null,
  }));
}

function deserializeExpenses(expenses: SerializedExpenseRecord[]): ExpenseRecord[] {
  return expenses.map((expense) => ({
    ...expense,
    timestamp: expense.timestamp ? new Date(expense.timestamp) : null,
  }));
}

export async function loadProductCatalog(forceRefresh = false) {
  if (!forceRefresh) {
    const cachedProducts = readSessionCache<Product[]>(PRODUCTS_CACHE_KEY);

    if (cachedProducts) {
      return sortProducts(cachedProducts);
    }
  }

  const snapshot = await getDocs(
    query(collection(db, "products"), orderBy("namaProduk_lowercase", "asc"))
  );
  const products = snapshot.docs.map(normalizeProductDoc);

  writeSessionCache(PRODUCTS_CACHE_KEY, products);

  return products;
}

export function replaceProductCatalogCache(products: Product[]) {
  writeSessionCache(PRODUCTS_CACHE_KEY, sortProducts(products));
  dispatchWindowEvent(PRODUCTS_CACHE_CHANGE_EVENT);
}

export function upsertProductInCache(product: Product) {
  const currentProducts = readSessionCache<Product[]>(PRODUCTS_CACHE_KEY) ?? [];
  const nextProducts = currentProducts.some((currentProduct) => currentProduct.id === product.id)
    ? currentProducts.map((currentProduct) =>
        currentProduct.id === product.id ? product : currentProduct
      )
    : [...currentProducts, product];

  replaceProductCatalogCache(nextProducts);
}

export function removeProductFromCache(productId: string) {
  const currentProducts = readSessionCache<Product[]>(PRODUCTS_CACHE_KEY) ?? [];
  const nextProducts = currentProducts.filter((product) => product.id !== productId);

  replaceProductCatalogCache(nextProducts);
}

export function updateProductStocksInCache(
  stockUpdates: Array<{ productId: string; stok: number | null }>
) {
  if (stockUpdates.length === 0) {
    return;
  }

  const currentProducts = readSessionCache<Product[]>(PRODUCTS_CACHE_KEY) ?? [];

  if (currentProducts.length === 0) {
    return;
  }

  const updates = new Map(
    stockUpdates.map((stockUpdate) => [stockUpdate.productId, stockUpdate.stok])
  );

  replaceProductCatalogCache(
    currentProducts.map((product) =>
      updates.has(product.id)
        ? { ...product, stok: updates.get(product.id) ?? null }
        : product
    )
  );
}

export async function getTransactionsByRange(start: Date, end: Date) {
  const cacheKey = buildRangeCacheKey(TRANSACTIONS_CACHE_PREFIX, start, end);
  const cachedTransactions = readSessionCache<SerializedTransactionRecord[]>(cacheKey);

  if (cachedTransactions) {
    return deserializeTransactions(cachedTransactions);
  }

  const snapshot = await getDocs(
    query(
      collection(db, "transactions"),
      where("timestamp", ">=", start),
      where("timestamp", "<", end),
      orderBy("timestamp", "desc")
    )
  );

  const transactions: TransactionRecord[] = snapshot.docs.map((documentSnapshot) => {
    const data = documentSnapshot.data();

    return {
      id: documentSnapshot.id,
      totalBelanja: Number(data.totalBelanja ?? 0),
      totalModal: Number(data.totalModal ?? 0),
      timestamp: toDate(data.timestamp),
      items: Array.isArray(data.items)
        ? data.items.map((item) => ({
            productId: String(item.productId ?? ""),
            namaProduk: String(item.namaProduk ?? ""),
            hargaSatuan: Number(item.hargaSatuan ?? 0),
            hargaModal: Number(item.hargaModal ?? 0),
            quantity: Number(item.quantity ?? 0),
          }))
        : [],
      paymentMethod: data.paymentMethod === "qris" ? "qris" : "cash",
    };
  });

  writeSessionCache(cacheKey, serializeTransactions(transactions));

  return transactions;
}

export async function getExpensesByRange(start: Date, end: Date) {
  const cacheKey = buildRangeCacheKey(EXPENSES_CACHE_PREFIX, start, end);
  const cachedExpenses = readSessionCache<SerializedExpenseRecord[]>(cacheKey);

  if (cachedExpenses) {
    return deserializeExpenses(cachedExpenses);
  }

  const snapshot = await getDocs(
    query(
      collection(db, "expenses"),
      where("timestamp", ">=", start),
      where("timestamp", "<", end),
      orderBy("timestamp", "desc")
    )
  );

  const expenses: ExpenseRecord[] = snapshot.docs.map((documentSnapshot) => {
    const data = documentSnapshot.data();

    return {
      id: documentSnapshot.id,
      description: String(data.description ?? ""),
      amount: Number(data.amount ?? 0),
      timestamp: toDate(data.timestamp),
    };
  });

  writeSessionCache(cacheKey, serializeExpenses(expenses));

  return expenses;
}

export function invalidateExpenseCaches() {
  removeSessionCacheByPrefix(EXPENSES_CACHE_PREFIX);
}

export function invalidateTransactionCaches() {
  removeSessionCacheByPrefix(TRANSACTIONS_CACHE_PREFIX);
}