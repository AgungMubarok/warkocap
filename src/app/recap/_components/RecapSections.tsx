"use client";

import { useMemo, useState } from "react";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "@/components/ui/icons";
import { formatCurrency } from "@/lib/date-range";
import { formatJakartaDateTime } from "@/lib/business-time";
import { useRecapContext } from "./RecapLayoutClient";

const PAGE_SIZE = {
  transactions: 5,
  products: 8,
  expenses: 5,
};

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "slate" | "emerald" | "amber" | "blue" | "rose" | "violet";
}) {
  const tones: Record<typeof tone, string> = {
    slate: "bg-white text-slate-900",
    emerald: "bg-emerald-50 text-emerald-900",
    amber: "bg-amber-50 text-amber-900",
    blue: "bg-sky-50 text-sky-900",
    rose: "bg-rose-50 text-rose-900",
    violet: "bg-violet-50 text-violet-900",
  };

  return (
    <div
      className={`rounded-[1.5rem] border border-white/60 p-4 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur ${tones[tone]}`}
    >
      <p className="text-sm opacity-70">{label}</p>
      <p className="mt-2 text-2xl font-bold md:text-3xl">{value}</p>
    </div>
  );
}

function PaginationControls({
  pageIndex,
  totalPages,
  onChange,
}: {
  pageIndex: number;
  totalPages: number;
  onChange: (nextPage: number) => void;
}) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm text-slate-600">
      <button
        onClick={() => onChange(0)}
        disabled={pageIndex === 0}
        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Halaman pertama"
      >
        <ChevronsLeftIcon className="h-4 w-4" />
      </button>
      <button
        onClick={() => onChange(Math.max(0, pageIndex - 1))}
        disabled={pageIndex === 0}
        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Halaman sebelumnya"
      >
        <ChevronLeftIcon className="h-4 w-4" />
      </button>
      <span className="flex items-center gap-1 rounded-xl bg-slate-100 px-4 py-2">
        <span>Halaman</span>
        <strong>
          {pageIndex + 1} dari {totalPages}
        </strong>
      </span>
      <button
        onClick={() => onChange(Math.min(totalPages - 1, pageIndex + 1))}
        disabled={pageIndex >= totalPages - 1}
        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Halaman berikutnya"
      >
        <ChevronRightIcon className="h-4 w-4" />
      </button>
      <button
        onClick={() => onChange(totalPages - 1)}
        disabled={pageIndex >= totalPages - 1}
        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Halaman terakhir"
      >
        <ChevronsRightIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500">
      Memuat rekap pada periode aktif...
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function PanelCard({
  title,
  countLabel,
  children,
}: {
  title: string;
  countLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[2rem] border border-white/60 bg-white/90 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {countLabel}
        </span>
      </div>
      {children}
    </div>
  );
}

export function RecapTotalSection() {
  const {
    isLoading,
    cashTotal,
    qrisTotal,
    grossRevenue,
    totalModal,
    totalExpenses,
    netProfit,
    transactions,
    totalItemsSold,
    expenses,
  } = useRecapContext();

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SummaryCard label="Cash" value={formatCurrency(cashTotal)} tone="blue" />
        <SummaryCard label="QRIS" value={formatCurrency(qrisTotal)} tone="violet" />
        <SummaryCard label="Omzet" value={formatCurrency(grossRevenue)} tone="slate" />
        <SummaryCard label="Total Modal" value={formatCurrency(totalModal)} tone="rose" />
        <SummaryCard label="Pengeluaran" value={formatCurrency(totalExpenses)} tone="amber" />
        <SummaryCard label="Laba Bersih" value={formatCurrency(netProfit)} tone="emerald" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {([
          ["Total transaksi", `${transactions.length} transaksi`],
          ["Total item terjual", `${totalItemsSold} item`],
          ["Catatan pengeluaran", `${expenses.length} catatan`],
        ] as const).map(([label, value]) => (
          <div
            key={label}
            className="rounded-[1.75rem] border border-white/60 bg-white/92 px-5 py-4 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur"
          >
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>
    </>
  );
}

export function LatestTransactionsSection() {
  const { isLoading, transactions } = useRecapContext();

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <PanelCard title="Transaksi Terbaru" countLabel={`${transactions.length} transaksi`}>
      <div className="space-y-3">
        {transactions.slice(0, 4).length > 0 ? (
          transactions.slice(0, 4).map((transaction) => (
            <article
              key={transaction.id}
              className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {formatJakartaDateTime(transaction.timestamp)}
                  </p>
                  <h3 className="mt-2 text-base font-semibold text-slate-900">
                    {transaction.items[0]?.namaProduk ?? "Tanpa item"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {transaction.items.reduce((sum, item) => sum + item.quantity, 0)} item, {" "}
                    {transaction.paymentMethod.toUpperCase()}
                  </p>
                </div>
                <p className="text-base font-bold text-slate-900">
                  {formatCurrency(transaction.totalBelanja)}
                </p>
              </div>
            </article>
          ))
        ) : (
          <EmptyState message="Belum ada transaksi pada periode ini." />
        )}
      </div>
    </PanelCard>
  );
}

export function TopProductsSection() {
  const { isLoading, aggregatedProducts } = useRecapContext();

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <PanelCard title="Produk Terlaris" countLabel={`${aggregatedProducts.length} produk`}>
      <div className="space-y-3">
        {aggregatedProducts.slice(0, 5).length > 0 ? (
          aggregatedProducts.slice(0, 5).map((product, index) => (
            <article
              key={`${product.namaProduk}-${index}`}
              className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{product.namaProduk}</h3>
                  <p className="text-sm text-slate-500">{product.totalQuantity} pcs terjual</p>
                </div>
                <p className="font-bold text-slate-900">
                  {formatCurrency(product.totalRevenue)}
                </p>
              </div>
            </article>
          ))
        ) : (
          <EmptyState message="Belum ada data produk terjual." />
        )}
      </div>
    </PanelCard>
  );
}

export function TransactionsSection() {
  const { isLoading, transactions } = useRecapContext();
  const [pageIndex, setPageIndex] = useState(0);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const totalPages = transactions.length === 0 ? 1 : Math.ceil(transactions.length / PAGE_SIZE.transactions);
  const currentPageIndex = Math.min(pageIndex, totalPages - 1);
  const paginatedTransactions = useMemo(() => {
    const startIndex = currentPageIndex * PAGE_SIZE.transactions;
    return transactions.slice(startIndex, startIndex + PAGE_SIZE.transactions);
  }, [currentPageIndex, transactions]);

  const toggleExpandedRow = (transactionId: string) => {
    setExpandedRows((currentRows) => ({
      ...currentRows,
      [transactionId]: !currentRows[transactionId],
    }));
  };

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <PanelCard title="Detail Transaksi" countLabel={`${transactions.length} transaksi`}>
      <div className="space-y-3">
        {paginatedTransactions.length > 0 ? (
          paginatedTransactions.map((transaction) => {
            const isExpanded = expandedRows[transaction.id];

            return (
              <article
                key={transaction.id}
                className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {formatJakartaDateTime(transaction.timestamp)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                        {transaction.paymentMethod.toUpperCase()}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                        {transaction.items.reduce((sum, item) => sum + item.quantity, 0)} item
                      </span>
                    </div>
                  </div>
                  <p className="text-base font-bold text-slate-900">
                    {formatCurrency(transaction.totalBelanja)}
                  </p>
                </div>
                <div className="mt-4 rounded-2xl bg-white p-4">
                  {(isExpanded ? transaction.items : transaction.items.slice(0, 1)).map(
                    (item, index) => (
                      <div
                        key={`${transaction.id}-${item.productId}-${index}`}
                        className="flex items-center justify-between gap-3 py-1 text-sm text-slate-600"
                      >
                        <span>
                          {item.namaProduk} ({item.quantity}x)
                        </span>
                        <span>{formatCurrency(item.hargaSatuan * item.quantity)}</span>
                      </div>
                    )
                  )}
                  {transaction.items.length > 1 && (
                    <button
                      onClick={() => toggleExpandedRow(transaction.id)}
                      className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-amber-700 hover:underline"
                    >
                      {isExpanded
                        ? "Sembunyikan detail"
                        : `Lihat ${transaction.items.length - 1} item lainnya`}
                      {isExpanded ? (
                        <ChevronUpIcon className="h-4 w-4" />
                      ) : (
                        <ChevronDownIcon className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </article>
            );
          })
        ) : (
          <EmptyState message="Belum ada transaksi pada periode ini." />
        )}
      </div>
      <PaginationControls pageIndex={currentPageIndex} totalPages={totalPages} onChange={setPageIndex} />
    </PanelCard>
  );
}

export function ProductsSection() {
  const { isLoading, aggregatedProducts } = useRecapContext();
  const [pageIndex, setPageIndex] = useState(0);

  const totalPages =
    aggregatedProducts.length === 0 ? 1 : Math.ceil(aggregatedProducts.length / PAGE_SIZE.products);
  const currentPageIndex = Math.min(pageIndex, totalPages - 1);
  const paginatedProducts = useMemo(() => {
    const startIndex = currentPageIndex * PAGE_SIZE.products;
    return aggregatedProducts.slice(startIndex, startIndex + PAGE_SIZE.products);
  }, [aggregatedProducts, currentPageIndex]);

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <PanelCard title="Ringkasan Produk Terjual" countLabel={`${aggregatedProducts.length} produk`}>
      <div className="space-y-3">
        {paginatedProducts.length > 0 ? (
          paginatedProducts.map((product, index) => (
            <article
              key={`${product.namaProduk}-${index}`}
              className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{product.namaProduk}</h3>
                  <p className="mt-1 text-sm text-slate-500">{product.totalQuantity} pcs terjual</p>
                </div>
                <p className="text-base font-bold text-slate-900">
                  {formatCurrency(product.totalRevenue)}
                </p>
              </div>
            </article>
          ))
        ) : (
          <EmptyState message="Belum ada produk terjual pada periode ini." />
        )}
      </div>
      <PaginationControls pageIndex={currentPageIndex} totalPages={totalPages} onChange={setPageIndex} />
    </PanelCard>
  );
}

export function ExpensesSection() {
  const { isLoading, expenses } = useRecapContext();
  const [pageIndex, setPageIndex] = useState(0);

  const totalPages = expenses.length === 0 ? 1 : Math.ceil(expenses.length / PAGE_SIZE.expenses);
  const currentPageIndex = Math.min(pageIndex, totalPages - 1);
  const paginatedExpenses = useMemo(() => {
    const startIndex = currentPageIndex * PAGE_SIZE.expenses;
    return expenses.slice(startIndex, startIndex + PAGE_SIZE.expenses);
  }, [currentPageIndex, expenses]);

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <PanelCard title="Detail Pengeluaran" countLabel={`${expenses.length} catatan`}>
      <div className="space-y-3">
        {paginatedExpenses.length > 0 ? (
          paginatedExpenses.map((expense) => (
            <article
              key={expense.id}
              className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {formatJakartaDateTime(expense.timestamp)}
                  </p>
                  <h3 className="mt-2 text-base font-semibold text-slate-900">
                    {expense.description}
                  </h3>
                </div>
                <p className="text-base font-bold text-slate-900">{formatCurrency(expense.amount)}</p>
              </div>
            </article>
          ))
        ) : (
          <EmptyState message="Belum ada pengeluaran pada periode ini." />
        )}
      </div>
      <PaginationControls pageIndex={currentPageIndex} totalPages={totalPages} onChange={setPageIndex} />
    </PanelCard>
  );
}