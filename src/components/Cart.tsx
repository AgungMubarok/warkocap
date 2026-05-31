"use client";

import { useEffect, useRef, useState } from "react";
import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Swal from "sweetalert2";
import Modal from "react-modal";
import { formatCurrency } from "@/lib/date-range";
import {
  invalidateTransactionCaches,
  updateProductStocksInCache,
} from "@/lib/firebase-data";
import { ChevronDownIcon, ChevronUpIcon } from "@/components/ui/icons";
import type { CartItem } from "@/lib/types";

export type { CartItem };

interface CartProps {
  cart: CartItem[];
  onUpdateCart: (newCart: CartItem[]) => void;
}

Modal.setAppElement("body");

export default function Cart({ cart, onUpdateCart }: CartProps) {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [isSummaryInView, setIsSummaryInView] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const summaryRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const summaryElement = summaryRef.current;

    if (!summaryElement || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSummaryInView(entry.isIntersecting);
      },
      {
        threshold: 0,
      }
    );

    observer.observe(summaryElement);

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleQuantityChange = (productId: string, amount: number) => {
    const newCart = cart.map((item) => {
      if (item.id === productId) {
        return { ...item, quantity: Math.max(1, item.quantity + amount) };
      }
      return item;
    });
    onUpdateCart(newCart);
  };

  const handleDeleteItem = (productId: string) => {
    const newCart = cart.filter((item) => item.id !== productId);
    onUpdateCart(newCart);
  };

  const handleCheckout = async (paymentMethod: "cash" | "qris") => {
    if (cart.length === 0 || isCheckingOut) return;
    closeModal();

    const totalBelanja = cart.reduce(
      (sum, item) => sum + item.hargaJual * item.quantity,
      0
    );
    const totalModal = cart.reduce(
      (sum, item) => sum + item.hargaModal * item.quantity,
      0
    );

    const result = await Swal.fire({
      title: "Konfirmasi Pembayaran",
      html: `
        <p>Metode: <b>${paymentMethod.toUpperCase()}</b></p>
        <p>Total Belanja: <b>${formatCurrency(totalBelanja)}</b></p>
        <p>Yakin ingin melanjutkan transaksi ini?</p>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, simpan transaksi",
      cancelButtonText: "Batal",
      reverseButtons: true,
    });

    if (!result.isConfirmed) {
      Swal.fire({
        icon: "info",
        title: "Dibatalkan",
        text: "Transaksi dibatalkan.",
        timer: 1500,
        showConfirmButton: false,
      });
      return;
    }

    setIsCheckingOut(true);

    const transactionData = {
      timestamp: serverTimestamp(),
      paymentMethod, // Simpan metode pembayaran
      totalBelanja,
      totalModal,
      items: cart.map((item) => ({
        productId: item.id,
        namaProduk: item.namaProduk,
        hargaSatuan: item.hargaJual,
        hargaModal: item.hargaModal,
        quantity: item.quantity,
      })),
    };

    try {
      const stockUpdates: Array<{ productId: string; stok: number | null }> = [];

      await runTransaction(db, async (transaction) => {
        for (const item of cart) {
          const productRef = doc(db, "products", item.id);
          const productSnapshot = await transaction.get(productRef);
          const productData = productSnapshot.data();

          if (!productSnapshot.exists()) {
            throw new Error(`Produk ${item.namaProduk} tidak ditemukan.`);
          }

          if (typeof productData?.stok === "number") {
            const currentStock = Number(productData.stok);

            if (currentStock < item.quantity) {
              throw new Error(`Stok ${item.namaProduk} tidak cukup.`);
            }

            const nextStock = currentStock - item.quantity;
            transaction.update(productRef, {
              stok: nextStock,
              updatedAt: serverTimestamp(),
            });
            stockUpdates.push({ productId: item.id, stok: nextStock });
          }
        }

        const transactionRef = doc(collection(db, "transactions"));
        transaction.set(transactionRef, transactionData);
      });

      try {
        updateProductStocksInCache(stockUpdates);
        invalidateTransactionCaches();
      } catch (cacheError) {
        console.warn("Checkout cache sync skipped:", cacheError);
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Transaksi berhasil disimpan.",
      });
      onUpdateCart([]); // Kosongkan keranjang
    } catch (error) {
      console.error("Checkout error:", error);

      const errorCode =
        typeof error === "object" && error !== null && "code" in error
          ? String(error.code)
          : null;
      const errorMessage =
        typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : "Gagal menyimpan transaksi.";
      const alertMessage =
        errorCode === "resource-exhausted"
          ? "Kuota Cloud Firestore project habis. Cek Firebase Console > Firestore > Usage atau tunggu reset kuota harian."
          : errorCode
          ? `${errorCode}: ${errorMessage}`
          : errorMessage;

      Swal.fire({
        icon: "error",
        title: "Gagal!",
        text: alertMessage,
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const openModal = () => setModalIsOpen(true);
  const closeModal = () => setModalIsOpen(false);

  const total = cart.reduce(
    (sum, item) => sum + item.hargaJual * item.quantity,
    0
  );
  const showFloatingCheckout = cart.length > 0 && !isSummaryInView;

  return (
    <>
      <aside className="w-full rounded-[2rem] border border-white/60 bg-white/90 p-4 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur md:p-6 xl:sticky xl:top-24 xl:w-[24rem]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 md:text-2xl">Keranjang</h2>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            {cart.length} item
          </span>
        </div>
        <div className="mb-4 max-h-[52vh] space-y-3 overflow-y-auto pr-1 md:max-h-[68vh]">
          {cart.length === 0 ? (
            <p className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
              Keranjang masih kosong.
            </p>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-grow">
                    <p className="font-semibold text-slate-900">{item.namaProduk}</p>
                    <p className="text-sm text-slate-500">
                      {formatCurrency(item.hargaJual)} per item
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Subtotal {formatCurrency(item.hargaJual * item.quantity)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-200"
                  >
                    Hapus
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                    Jumlah
                  </span>
                  <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleQuantityChange(item.id, -1)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm"
                    aria-label={`Kurangi jumlah ${item.namaProduk}`}
                  >
                    <ChevronDownIcon className="h-4 w-4 rotate-90" />
                  </button>
                  <span className="min-w-6 text-center font-semibold text-slate-900">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(item.id, 1)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm"
                    aria-label={`Tambah jumlah ${item.namaProduk}`}
                  >
                    <ChevronUpIcon className="h-4 w-4 rotate-90" />
                  </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div ref={summaryRef} className="rounded-[1.5rem] bg-slate-950 p-4 text-white">
          <div className="mb-4 flex items-center justify-between text-lg font-bold md:text-xl">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <button
            onClick={openModal}
            disabled={cart.length === 0 || isCheckingOut}
            className="w-full rounded-2xl bg-amber-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isCheckingOut ? "Memproses..." : "Pilih Metode Pembayaran"}
          </button>
        </div>
      </aside>

      {showFloatingCheckout && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-[1.5rem] border border-white/70 bg-white/95 p-3 shadow-[0_24px_60px_rgba(15,23,42,0.22)] backdrop-blur">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Total Belanja
              </p>
              <p className="mt-1 truncate text-lg font-bold text-slate-900">
                {formatCurrency(total)}
              </p>
              <p className="text-xs text-slate-500">{cart.length} item di keranjang</p>
            </div>
            <button
              onClick={openModal}
              disabled={isCheckingOut}
              className="shrink-0 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              {isCheckingOut ? "Memproses..." : "Checkout"}
            </button>
          </div>
        </div>
      )}

      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        contentLabel="Metode Pembayaran"
        className="app-modal-content w-full max-w-md p-6 md:p-8"
        overlayClassName="app-modal-overlay"
      >
        <h2 className="mb-2 text-center text-2xl font-bold text-slate-900">
          Pilih Pembayaran
        </h2>
        <p className="mb-6 text-center text-sm text-slate-500">
          Total transaksi {formatCurrency(total)}
        </p>
        <div className="space-y-4">
          <button
            onClick={() => handleCheckout("cash")}
            disabled={isCheckingOut}
            className="w-full rounded-2xl bg-slate-950 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            {isCheckingOut ? "Memproses..." : "Bayar Cash"}
          </button>
          <button
            onClick={() => handleCheckout("qris")}
            disabled={isCheckingOut}
            className="w-full rounded-2xl bg-amber-400 px-4 py-3 font-semibold text-slate-950 shadow-sm transition hover:bg-amber-300"
          >
            {isCheckingOut ? "Memproses..." : "Bayar QRIS"}
          </button>
        </div>
        <button
          onClick={closeModal}
          className="mt-6 w-full text-center text-sm font-medium text-slate-500 hover:underline"
        >
          Batal
        </button>
      </Modal>
    </>
  );
}
