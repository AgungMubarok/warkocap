export interface Product {
  id: string;
  namaProduk: string;
  namaProduk_lowercase: string;
  hargaJual: number;
  hargaModal: number;
  stok: number | null;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface TransactionItem {
  productId: string;
  namaProduk: string;
  hargaSatuan: number;
  hargaModal: number;
  quantity: number;
}

export interface TransactionRecord {
  id: string;
  totalBelanja: number;
  totalModal: number;
  timestamp: Date | null;
  items: TransactionItem[];
  paymentMethod: "cash" | "qris";
}

export interface ExpenseRecord {
  id: string;
  description: string;
  amount: number;
  timestamp: Date | null;
}