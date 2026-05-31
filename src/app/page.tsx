"use client";

import { useState } from "react";
import Cart from "@/components/Cart";
import withAuth from "@/hooks/withAuth";
import ProductDataTable from "@/components/ProductDataTable";
import { formatCurrency } from "@/lib/date-range";
import type { CartItem, Product } from "@/lib/types";

function HomePage() {
  const [cart, setCart] = useState<CartItem[]>([]);

  const handleAddToCart = (product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        // Jika item sudah ada, tambah quantity
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        // Jika item baru, tambahkan ke keranjang dengan quantity 1
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
  };

  // Fungsi baru untuk mengupdate seluruh keranjang
  const handleUpdateCart = (newCart: CartItem[]) => {
    setCart(newCart);
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = cart.reduce(
    (sum, item) => sum + item.hargaJual * item.quantity,
    0
  );

  return (
    <section className="space-y-5">
      <div className="rounded-[1.75rem] border border-white/60 bg-white/92 p-4 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Mode
            </p>
            <h1 className="mt-1 truncate text-xl font-bold text-slate-900">Kasir</h1>
          </div>
          <div className="h-10 w-px bg-slate-200" />
          <div className="min-w-[3.5rem] text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Item
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900">{totalItems}</p>
          </div>
          <div className="h-10 w-px bg-slate-200" />
          <div className="min-w-[6.75rem] text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Total
            </p>
            <p className="mt-1 truncate text-xl font-bold text-slate-900">
              {formatCurrency(totalValue)}
            </p>
          </div>
        </div>
      </div>

      <div className="hidden gap-4 md:grid md:grid-cols-[minmax(0,1fr)_repeat(2,minmax(0,12rem))]">
        <div className="rounded-[1.75rem] border border-white/60 bg-white/92 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <h1 className="text-2xl font-bold text-slate-900">Kasir</h1>
        </div>
        <div className="rounded-[1.75rem] border border-white/60 bg-white/92 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <p className="text-sm text-slate-500">Item</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{totalItems}</p>
        </div>
        <div className="rounded-[1.75rem] border border-white/60 bg-white/92 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <p className="text-sm text-slate-500">Total</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{formatCurrency(totalValue)}</p>
        </div>
      </div>

      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1">
          <ProductDataTable cart={cart} onAddToCart={handleAddToCart} />
        </div>
        <Cart cart={cart} onUpdateCart={handleUpdateCart} />
      </div>
    </section>
  );
}

export default withAuth(HomePage, ["cashier", "admin"]);
