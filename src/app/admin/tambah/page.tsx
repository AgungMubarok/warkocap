"use client";

import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import withAuth from "@/hooks/withAuth";
import Link from "next/link";
import Swal from "sweetalert2";
import { upsertProductInCache } from "@/lib/firebase-data";
import {
  formatCurrencyInput,
  normalizeCurrencyInput,
  parseCurrencyInput,
} from "@/lib/date-range";
import type { Product } from "@/lib/types";

function TambahProdukPage() {
  const [namaProduk, setNamaProduk] = useState("");
  const [hargaJual, setHargaJual] = useState("");
  const [hargaModal, setHargaModal] = useState("");
  const [stok, setStok] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hargaJualValue = parseCurrencyInput(hargaJual);
    const hargaModalValue = parseCurrencyInput(hargaModal);

    if (!namaProduk || hargaJualValue <= 0 || !stok)
      return Swal.fire({
        icon: "info",
        title: "Warning!",
        text: "Harap isi semua kolom!",
      });
    setLoading(true);
    try {
      const productPayload = {
        namaProduk,
        hargaJual: hargaJualValue,
        hargaModal: hargaModalValue,
        stok: Number(stok),
        namaProduk_lowercase: namaProduk.toLowerCase(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const productRef = await addDoc(collection(db, "products"), productPayload);
      upsertProductInCache({
        id: productRef.id,
        ...(productPayload as Omit<Product, "id">),
      });
      setNamaProduk("");
      setHargaJual("");
      setHargaModal("");
      setStok("");
      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Produk berhasil ditambahkan!",
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal!",
        text: "Gagal menambahkan produk!",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-4 md:px-6 md:py-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="rounded-[1.75rem] border border-white/60 bg-white/92 px-5 py-4 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <h1 className="text-2xl font-bold text-slate-900">Tambah Produk</h1>
        </div>
        <Link
          href="/admin/daftar"
          className="inline-flex items-center justify-center rounded-[1.75rem] bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Lihat Produk
        </Link>
      </div>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-[2rem] border border-white/60 bg-white/90 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur md:p-8"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
          <label
            htmlFor="namaProduk"
            className="block text-sm font-medium text-slate-700"
          >
            Nama Produk
          </label>
          <input
            type="text"
            id="namaProduk"
            value={namaProduk}
            onChange={(e) => setNamaProduk(e.target.value)}
            className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm outline-none transition focus:border-amber-500 focus:bg-white"
            required
          />
          </div>
          <div>
          <label
            htmlFor="hargaJual"
            className="block text-sm font-medium text-slate-700"
          >
            Harga Jual (Rp)
          </label>
          <input
            type="text"
            id="hargaJual"
            inputMode="numeric"
            value={formatCurrencyInput(hargaJual)}
            onChange={(e) => setHargaJual(normalizeCurrencyInput(e.target.value))}
            className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm outline-none transition focus:border-amber-500 focus:bg-white"
            placeholder="Rp 0"
            required
          />
          </div>
          <div>
          <label
            htmlFor="hargaModal"
            className="block text-sm font-medium text-slate-700"
          >
            Harga Modal (Rp)
          </label>
          <input
            type="text"
            id="hargaModal"
            inputMode="numeric"
            value={formatCurrencyInput(hargaModal)}
            onChange={(e) => setHargaModal(normalizeCurrencyInput(e.target.value))}
            className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm outline-none transition focus:border-amber-500 focus:bg-white"
            placeholder="Rp 0"
          />
          </div>
          <div className="md:col-span-2">
            <label
              htmlFor="stok"
              className="block text-sm font-medium text-slate-700"
            >
              Stok Awal
            </label>
            <input
              type="number"
              id="stok"
              min="0"
              value={stok}
              onChange={(e) => setStok(e.target.value)}
              className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm outline-none transition focus:border-amber-500 focus:bg-white"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-slate-950 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? "Menyimpan..." : "Tambah Produk"}
        </button>
      </form>
    </section>
  );
}

export default withAuth(TambahProdukPage, ["admin"]);
