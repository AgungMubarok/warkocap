"use client";

import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import withAuth from "@/hooks/withAuth";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "@/components/ui/icons";
import {
  formatCurrency,
  formatDateForInput,
  getCalendarRange,
  getBusinessDayRange,
  getMonthRange,
  parseDateInput,
  getYearRange,
} from "@/lib/date-range";
import { getExpensesByRange, getTransactionsByRange } from "@/lib/firebase-data";
import type { ExpenseRecord, TransactionRecord } from "@/lib/types";

const PAGE_SIZE = {
  transactions: 5,
  products: 8,
  expenses: 5,
};

type RecapFilter =
  | "daily"
  | "monthly"
  | "yearly"
  | "specificDate"
  | "dateRange";
type RecapView = "total" | "ringkasan";
type ActivePanel =
  | "latestTransactions"
  | "topProducts"
  | "transactions"
  | "products"
  | "expenses";

interface AggregatedProduct {
  namaProduk: string;
  totalQuantity: number;
  totalRevenue: number;
}

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

function RecapPage() {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [filter, setFilter] = useState<RecapFilter>("daily");
  const [specificDate, setSpecificDate] = useState(() => formatDateForInput(new Date()));
  const [rangeStartDate, setRangeStartDate] = useState(() =>
    formatDateForInput(new Date())
  );
  const [rangeEndDate, setRangeEndDate] = useState(() =>
    formatDateForInput(new Date())
  );
  const [recapView, setRecapView] = useState<RecapView>("total");
  const [activePanel, setActivePanel] = useState<ActivePanel>("latestTransactions");
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [txPageIndex, setTxPageIndex] = useState(0);
  const [productPageIndex, setProductPageIndex] = useState(0);
  const [expensePageIndex, setExpensePageIndex] = useState(0);

  useEffect(() => {
    let isActive = true;

    const syncRecap = async () => {
      const range = (() => {
        if (filter === "daily") {
          return getBusinessDayRange(new Date());
        }

        if (filter === "monthly") {
          return getMonthRange(new Date());
        }

        if (filter === "yearly") {
          return getYearRange(new Date());
        }

        if (filter === "specificDate") {
          const parsedDate = parseDateInput(specificDate);

          return parsedDate ? getCalendarRange(parsedDate, parsedDate) : null;
        }

        const startDate = parseDateInput(rangeStartDate);
        const endDate = parseDateInput(rangeEndDate);

        if (!startDate || !endDate) {
          return null;
        }

        const [fromDate, toDate] =
          rangeStartDate <= rangeEndDate
            ? [startDate, endDate]
            : [endDate, startDate];

        return getCalendarRange(fromDate, toDate);
      })();

      if (!range) {
        if (isActive) {
          setTransactions([]);
          setExpenses([]);
          setIsLoading(false);
        }

        return;
      }

      try {
        const [nextTransactions, nextExpenses] = await Promise.all([
          getTransactionsByRange(range.start, range.end),
          getExpensesByRange(range.start, range.end),
        ]);

        if (!isActive) {
          return;
        }

        setTransactions(nextTransactions);
        setExpenses(nextExpenses);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void syncRecap();

    return () => {
      isActive = false;
    };
  }, [filter, specificDate, rangeStartDate, rangeEndDate]);

  const {
    grossRevenue,
    totalModal,
    totalExpenses,
    netProfit,
    cashTotal,
    qrisTotal,
    totalItemsSold,
    aggregatedProducts,
  } = useMemo(() => {
    const grossRevenueValue = transactions.reduce(
      (sum, transaction) => sum + transaction.totalBelanja,
      0
    );
    const totalModalValue = transactions.reduce(
      (sum, transaction) => sum + (transaction.totalModal || 0),
      0
    );
    const totalExpensesValue = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );

    const productSales = new Map<
      string,
      { totalQuantity: number; totalRevenue: number }
    >();

    transactions.forEach((transaction) => {
      transaction.items.forEach((item) => {
        const currentProduct = productSales.get(item.namaProduk) ?? {
          totalQuantity: 0,
          totalRevenue: 0,
        };

        currentProduct.totalQuantity += item.quantity;
        currentProduct.totalRevenue += item.quantity * item.hargaSatuan;
        productSales.set(item.namaProduk, currentProduct);
      });
    });

    return {
      grossRevenue: grossRevenueValue,
      totalModal: totalModalValue,
      totalExpenses: totalExpensesValue,
      netProfit: grossRevenueValue - totalModalValue - totalExpensesValue,
      cashTotal: transactions
        .filter((transaction) => transaction.paymentMethod === "cash")
        .reduce((sum, transaction) => sum + transaction.totalBelanja, 0),
      qrisTotal: transactions
        .filter((transaction) => transaction.paymentMethod === "qris")
        .reduce((sum, transaction) => sum + transaction.totalBelanja, 0),
      totalItemsSold: transactions.reduce(
        (sum, transaction) =>
          sum + transaction.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
        0
      ),
      aggregatedProducts: Array.from(productSales.entries())
        .map(([namaProduk, data]) => ({
          namaProduk,
          ...data,
        }) satisfies AggregatedProduct)
        .sort((left, right) => right.totalQuantity - left.totalQuantity),
    };
  }, [expenses, transactions]);

  const transactionPages =
    transactions.length === 0
      ? 1
      : Math.ceil(transactions.length / PAGE_SIZE.transactions);
  const productPages =
    aggregatedProducts.length === 0
      ? 1
      : Math.ceil(aggregatedProducts.length / PAGE_SIZE.products);
  const expensePages =
    expenses.length === 0 ? 1 : Math.ceil(expenses.length / PAGE_SIZE.expenses);
  const currentTxPageIndex = Math.min(txPageIndex, transactionPages - 1);
  const currentProductPageIndex = Math.min(productPageIndex, productPages - 1);
  const currentExpensePageIndex = Math.min(expensePageIndex, expensePages - 1);

  const paginatedTransactions = useMemo(() => {
    const startIndex = currentTxPageIndex * PAGE_SIZE.transactions;
    return transactions.slice(startIndex, startIndex + PAGE_SIZE.transactions);
  }, [currentTxPageIndex, transactions]);

  const paginatedProducts = useMemo(() => {
    const startIndex = currentProductPageIndex * PAGE_SIZE.products;
    return aggregatedProducts.slice(startIndex, startIndex + PAGE_SIZE.products);
  }, [aggregatedProducts, currentProductPageIndex]);

  const paginatedExpenses = useMemo(() => {
    const startIndex = currentExpensePageIndex * PAGE_SIZE.expenses;
    return expenses.slice(startIndex, startIndex + PAGE_SIZE.expenses);
  }, [currentExpensePageIndex, expenses]);

  const resetPagination = () => {
    setTxPageIndex(0);
    setProductPageIndex(0);
    setExpensePageIndex(0);
  };

  const handleFilterTypeChange = (nextFilter: RecapFilter) => {
    setFilter(nextFilter);
    setIsLoading(true);
    resetPagination();
    setExpandedRows({});
  };

  const handleSpecificDateChange = (value: string) => {
    if (!value || !parseDateInput(value)) {
      return;
    }

    setSpecificDate(value);
    setIsLoading(true);
    resetPagination();
    setExpandedRows({});
  };

  const handleRangeDateChange = (field: "start" | "end", value: string) => {
    if (!value || !parseDateInput(value)) {
      return;
    }

    if (field === "start") {
      setRangeStartDate(value);
    } else {
      setRangeEndDate(value);
    }

    setIsLoading(true);
    resetPagination();
    setExpandedRows({});
  };

  const handleTransactionPageChange = (nextPage: number) => {
    setTxPageIndex(Math.max(0, Math.min(transactionPages - 1, nextPage)));
  };

  const handleProductPageChange = (nextPage: number) => {
    setProductPageIndex(Math.max(0, Math.min(productPages - 1, nextPage)));
  };

  const handleExpensePageChange = (nextPage: number) => {
    setExpensePageIndex(Math.max(0, Math.min(expensePages - 1, nextPage)));
  };

  const toggleExpandedRow = (transactionId: string) => {
    setExpandedRows((currentRows) => ({
      ...currentRows,
      [transactionId]: !currentRows[transactionId],
    }));
  };

  const handleExport = () => {
    if (transactions.length === 0 && expenses.length === 0) {
      Swal.fire({
        icon: "info",
        title: "Info",
        text: "Tidak ada data untuk diekspor.",
      });
      return;
    }

    const workbook = XLSX.utils.book_new();

    if (transactions.length > 0) {
      const transactionSummary = transactions.map((transaction) => ({
        "Waktu Transaksi": transaction.timestamp
          ? transaction.timestamp.toLocaleString("id-ID", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Tanpa tanggal",
        "Metode Pembayaran": transaction.paymentMethod.toUpperCase(),
        "Item Dibeli": transaction.items
          .map((item) => `${item.namaProduk} (${item.quantity})`)
          .join(", "),
        "Total Penjualan": transaction.totalBelanja,
        "Total Modal": transaction.totalModal || 0,
        "Laba Bersih": transaction.totalBelanja - (transaction.totalModal || 0),
      }));

      const itemDetails = transactions.flatMap((transaction) =>
        transaction.items.map((item) => ({
          "Waktu Transaksi": transaction.timestamp
            ? transaction.timestamp.toLocaleString("id-ID", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Tanpa tanggal",
          "Metode Pembayaran": transaction.paymentMethod.toUpperCase(),
          "Nama Produk": item.namaProduk,
          Kuantitas: item.quantity,
          "Harga Jual Satuan": item.hargaSatuan,
          "Harga Modal Satuan": item.hargaModal,
        }))
      );

      const summarySheet = XLSX.utils.json_to_sheet(transactionSummary);
      const itemsSheet = XLSX.utils.json_to_sheet(itemDetails);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Ringkasan Transaksi");
      XLSX.utils.book_append_sheet(workbook, itemsSheet, "Detail Item");
    }

    if (expenses.length > 0) {
      const expenseSheet = XLSX.utils.json_to_sheet(
        expenses.map((expense) => ({
          Waktu: expense.timestamp
            ? expense.timestamp.toLocaleString("id-ID")
            : "Tanpa tanggal",
          Keterangan: expense.description,
          Jumlah: expense.amount,
        }))
      );
      XLSX.utils.book_append_sheet(workbook, expenseSheet, "Pengeluaran");
    }

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });

    const exportLabel =
      filter === "daily"
        ? `Harian-${formatDateForInput(new Date())}`
        : filter === "monthly"
        ? `Bulanan-${formatDateForInput(new Date()).slice(0, 7)}`
        : filter === "yearly"
        ? `Tahunan-${formatDateForInput(new Date()).slice(0, 4)}`
        : filter === "specificDate"
        ? `Tanggal-${specificDate}`
        : rangeStartDate <= rangeEndDate
        ? `Rentang-${rangeStartDate}-sd-${rangeEndDate}`
        : `Rentang-${rangeEndDate}-sd-${rangeStartDate}`;

    saveAs(blob, `Rekap-Warkocap-${exportLabel}.xlsx`);
  };

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-4 md:px-6 md:py-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="rounded-[1.75rem] border border-white/60 bg-white/92 px-5 py-4 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <h1 className="text-2xl font-bold text-slate-900">Rekap</h1>
        </div>
        <button
          onClick={handleExport}
          disabled={transactions.length === 0 && expenses.length === 0}
          className="rounded-[1.75rem] bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Download Excel
        </button>
      </div>

      <div className="rounded-[2rem] border border-white/60 bg-white/90 p-4 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {([
              ["daily", "Harian"],
              ["monthly", "Bulanan"],
              ["yearly", "Tahunan"],
              ["specificDate", "Spesifik Tanggal"],
              ["dateRange", "Rentang Tanggal"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => handleFilterTypeChange(value)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  filter === value
                    ? "bg-slate-950 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {filter === "specificDate" ? (
            <div className="w-full md:max-w-xs">
              <input
                type="date"
                value={specificDate}
                onChange={(e) => handleSpecificDateChange(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:bg-white"
              />
            </div>
          ) : filter === "dateRange" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="date"
                value={rangeStartDate}
                onChange={(e) => handleRangeDateChange("start", e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:bg-white"
              />
              <input
                type="date"
                value={rangeEndDate}
                onChange={(e) => handleRangeDateChange("end", e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:bg-white"
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/60 bg-white/90 p-4 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
        <div className="flex flex-wrap gap-2">
          {([
            ["total", "Rekap Total"],
            ["ringkasan", "Rekap Ringkasan"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setRecapView(value)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                recapView === value
                  ? "bg-slate-950 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500">
          Memuat rekap pada periode aktif...
        </div>
      ) : recapView === "total" ? (
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
      ) : (
        <>
          <div className="rounded-[2rem] border border-white/60 bg-white/90 p-4 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
            <div className="flex flex-wrap gap-2">
              {([
                ["latestTransactions", "Transaksi Terbaru"],
                ["topProducts", "Produk Terlaris"],
                ["transactions", "Transaksi"],
                ["products", "Produk Terjual"],
                ["expenses", "Pengeluaran"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setActivePanel(value)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    activePanel === value
                      ? "bg-amber-400 text-slate-950"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {activePanel === "latestTransactions" ? (
            <div className="rounded-[2rem] border border-white/60 bg-white/90 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Transaksi Terbaru</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {transactions.length} transaksi
                </span>
              </div>
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
                            {transaction.timestamp
                              ? transaction.timestamp.toLocaleString("id-ID", {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Tanpa tanggal"}
                          </p>
                          <h3 className="mt-2 text-base font-semibold text-slate-900">
                            {transaction.items[0]?.namaProduk ?? "Tanpa item"}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {transaction.items.reduce(
                              (sum, item) => sum + item.quantity,
                              0
                            )} item, {transaction.paymentMethod.toUpperCase()}
                          </p>
                        </div>
                        <p className="text-base font-bold text-slate-900">
                          {formatCurrency(transaction.totalBelanja)}
                        </p>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    Belum ada transaksi pada periode ini.
                  </div>
                )}
              </div>
            </div>
          ) : activePanel === "topProducts" ? (
            <div className="rounded-[2rem] border border-white/60 bg-white/90 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Produk Terlaris</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {aggregatedProducts.length} produk
                </span>
              </div>
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
                          <p className="text-sm text-slate-500">
                            {product.totalQuantity} pcs terjual
                          </p>
                        </div>
                        <p className="font-bold text-slate-900">
                          {formatCurrency(product.totalRevenue)}
                        </p>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    Belum ada data produk terjual.
                  </div>
                )}
              </div>
            </div>
          ) : activePanel === "transactions" ? (
            <div className="rounded-[2rem] border border-white/60 bg-white/90 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Detail Transaksi</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {transactions.length} transaksi
                </span>
              </div>
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
                              {transaction.timestamp
                                ? transaction.timestamp.toLocaleString("id-ID", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "Tanpa tanggal"}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                                {transaction.paymentMethod.toUpperCase()}
                              </span>
                              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                                {transaction.items.reduce(
                                  (sum, item) => sum + item.quantity,
                                  0
                                )} item
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
                  <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    Belum ada transaksi pada periode ini.
                  </div>
                )}
              </div>
              <PaginationControls
                pageIndex={currentTxPageIndex}
                totalPages={transactionPages}
                onChange={handleTransactionPageChange}
              />
            </div>
          ) : activePanel === "products" ? (
            <div className="rounded-[2rem] border border-white/60 bg-white/90 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Ringkasan Produk Terjual</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {aggregatedProducts.length} produk
                </span>
              </div>
              <div className="space-y-3">
                {paginatedProducts.length > 0 ? (
                  paginatedProducts.map((product, index) => (
                    <article
                      key={`${product.namaProduk}-${index}`}
                      className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-slate-900">
                            {product.namaProduk}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {product.totalQuantity} pcs terjual
                          </p>
                        </div>
                        <p className="text-base font-bold text-slate-900">
                          {formatCurrency(product.totalRevenue)}
                        </p>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    Belum ada produk terjual pada periode ini.
                  </div>
                )}
              </div>
              <PaginationControls
                pageIndex={currentProductPageIndex}
                totalPages={productPages}
                onChange={handleProductPageChange}
              />
            </div>
          ) : (
            <div className="rounded-[2rem] border border-white/60 bg-white/90 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Detail Pengeluaran</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {expenses.length} catatan
                </span>
              </div>
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
                            {expense.timestamp
                              ? expense.timestamp.toLocaleString("id-ID", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Tanpa tanggal"}
                          </p>
                          <h3 className="mt-2 text-base font-semibold text-slate-900">
                            {expense.description}
                          </h3>
                        </div>
                        <p className="text-base font-bold text-slate-900">
                          {formatCurrency(expense.amount)}
                        </p>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    Belum ada pengeluaran pada periode ini.
                  </div>
                )}
              </div>
              <PaginationControls
                pageIndex={currentExpensePageIndex}
                totalPages={expensePages}
                onChange={handleExpensePageChange}
              />
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default withAuth(RecapPage, ["admin"]);