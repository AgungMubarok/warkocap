"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  getBusinessDateKey,
  getBusinessDayRange,
  getBusinessMonthRange,
  getBusinessDateRange,
  formatJakartaDateTime,
} from "@/lib/business-time";
import { useBusinessDayRollover } from "@/hooks/useBusinessDayRollover";
import { getExpensesByRange, getTransactionsByRange } from "@/lib/firebase-data";
import type { ExpenseRecord, TransactionRecord } from "@/lib/types";

const MAX_DATE_RANGE_MONTHS = 3;

const recapNavigationItems = [
  { href: "/recap", label: "Rekap Total" },
  { href: "/recap/produk-terlaris", label: "Produk Terlaris" },
  { href: "/recap/transaksi", label: "Transaksi" },
  { href: "/recap/produk-terjual", label: "Produk Terjual" },
  { href: "/recap/pengeluaran", label: "Pengeluaran" },
] as const;

export type RecapFilter = "daily" | "monthly" | "specificDate" | "dateRange";

export interface AggregatedProduct {
  namaProduk: string;
  totalQuantity: number;
  totalRevenue: number;
}

interface RecapContextValue {
  transactions: TransactionRecord[];
  expenses: ExpenseRecord[];
  filter: RecapFilter;
  specificDate: string;
  rangeStartDate: string;
  rangeEndDate: string;
  dateRangeValidationMessage: string | null;
  isLoading: boolean;
  grossRevenue: number;
  totalModal: number;
  totalExpenses: number;
  netProfit: number;
  cashTotal: number;
  qrisTotal: number;
  totalItemsSold: number;
  aggregatedProducts: AggregatedProduct[];
  handleFilterTypeChange: (nextFilter: RecapFilter) => void;
  handleSpecificDateChange: (value: string) => void;
  handleRangeDateChange: (field: "start" | "end", value: string) => void;
  handleExport: () => void;
}

const RecapContext = createContext<RecapContextValue | null>(null);

function isRangeWithinMaxMonths(startValue: string, endValue: string, maxMonths: number) {
  const [startYear, startMonth, startDay] = startValue.split("-").map(Number);
  const [endYear, endMonth, endDay] = endValue.split("-").map(Number);
  const monthDifference = (endYear - startYear) * 12 + (endMonth - startMonth);

  if (monthDifference < maxMonths) {
    return true;
  }

  if (monthDifference > maxMonths) {
    return false;
  }

  return endDay <= startDay;
}

function getDateRangeValidationMessage(startValue: string, endValue: string) {
  const [fromValue, toValue] = startValue <= endValue
    ? [startValue, endValue]
    : [endValue, startValue];

  return isRangeWithinMaxMonths(fromValue, toValue, MAX_DATE_RANGE_MONTHS)
    ? null
    : "Rentang tanggal maksimal 3 bulan.";
}

function isRecapNavigationActive(pathname: string, href: string) {
  if (href === "/recap") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function useRecapContext() {
  const context = useContext(RecapContext);

  if (!context) {
    throw new Error("useRecapContext must be used within RecapLayoutClient.");
  }

  return context;
}

export default function RecapLayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [filter, setFilter] = useState<RecapFilter>("daily");
  const [specificDate, setSpecificDate] = useState(() => getBusinessDateKey());
  const [rangeStartDate, setRangeStartDate] = useState(() => getBusinessDateKey());
  const [rangeEndDate, setRangeEndDate] = useState(() => getBusinessDateKey());
  const [isLoading, setIsLoading] = useState(true);
  const [rolloverTick, setRolloverTick] = useState(0);

  const handleRollover = useCallback(() => {
    // Only update states if they were set to the old "today". 
    // Usually a simple re-trigger is enough.
    setRolloverTick((prev) => prev + 1);
  }, []);

  useBusinessDayRollover(handleRollover);

  const dateRangeValidationMessage = useMemo(
    () => getDateRangeValidationMessage(rangeStartDate, rangeEndDate),
    [rangeEndDate, rangeStartDate]
  );

  useEffect(() => {
    let isActive = true;

    const syncRecap = async () => {
      const range = (() => {
        if (filter === "daily") {
          return getBusinessDayRange();
        }

        if (filter === "monthly") {
          return getBusinessMonthRange();
        }

        if (filter === "specificDate") {
          if (!specificDate) return null;
          return getBusinessDayRange(specificDate);
        }

        if (!rangeStartDate || !rangeEndDate || dateRangeValidationMessage) {
          return null;
        }

        return getBusinessDateRange(rangeStartDate, rangeEndDate);
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
  }, [dateRangeValidationMessage, filter, rangeEndDate, rangeStartDate, specificDate, rolloverTick]);

  const summary = useMemo(() => {
    const grossRevenue = transactions.reduce(
      (sum, transaction) => sum + transaction.totalBelanja,
      0
    );
    const totalModal = transactions.reduce(
      (sum, transaction) => sum + (transaction.totalModal || 0),
      0
    );
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    const productSales = new Map<string, { totalQuantity: number; totalRevenue: number }>();

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
      grossRevenue,
      totalModal,
      totalExpenses,
      netProfit: grossRevenue - totalModal - totalExpenses,
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

  const handleFilterTypeChange = (nextFilter: RecapFilter) => {
    setFilter(nextFilter);
    setIsLoading(true);
  };

  const handleSpecificDateChange = (value: string) => {
    if (!value) {
      return;
    }

    setSpecificDate(value);
    setIsLoading(true);
  };

  const handleRangeDateChange = (field: "start" | "end", value: string) => {
    if (!value) {
      return;
    }

    if (field === "start") {
      setRangeStartDate(value);
    } else {
      setRangeEndDate(value);
    }

    setIsLoading(true);
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
        "Waktu Transaksi": formatJakartaDateTime(transaction.timestamp),
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
          "Waktu Transaksi": formatJakartaDateTime(transaction.timestamp),
          "Metode Pembayaran": transaction.paymentMethod.toUpperCase(),
          "Nama Produk": item.namaProduk,
          Kuantitas: item.quantity,
          "Harga Jual Satuan": item.hargaSatuan,
          "Harga Modal Satuan": item.hargaModal,
        }))
      );

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(transactionSummary),
        "Ringkasan Transaksi"
      );
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(itemDetails),
        "Detail Item"
      );
    }

    if (expenses.length > 0) {
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(
          expenses.map((expense) => ({
            Waktu: formatJakartaDateTime(expense.timestamp),
            Keterangan: expense.description,
            Jumlah: expense.amount,
          }))
        ),
        "Pengeluaran"
      );
    }

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });

    const exportLabel =
      filter === "daily"
        ? `Harian-${getBusinessDateKey()}`
        : filter === "monthly"
        ? `Bulanan-${getBusinessDateKey().slice(0, 7)}`
        : filter === "specificDate"
        ? `Tanggal-${specificDate}`
        : rangeStartDate <= rangeEndDate
        ? `Rentang-${rangeStartDate}-sd-${rangeEndDate}`
        : `Rentang-${rangeEndDate}-sd-${rangeStartDate}`;

    saveAs(blob, `Rekap-Warkocap-${exportLabel}.xlsx`);
  };

  const contextValue: RecapContextValue = {
    transactions,
    expenses,
    filter,
    specificDate,
    rangeStartDate,
    rangeEndDate,
    dateRangeValidationMessage,
    isLoading,
    grossRevenue: summary.grossRevenue,
    totalModal: summary.totalModal,
    totalExpenses: summary.totalExpenses,
    netProfit: summary.netProfit,
    cashTotal: summary.cashTotal,
    qrisTotal: summary.qrisTotal,
    totalItemsSold: summary.totalItemsSold,
    aggregatedProducts: summary.aggregatedProducts,
    handleFilterTypeChange,
    handleSpecificDateChange,
    handleRangeDateChange,
    handleExport,
  };

  return (
    <RecapContext.Provider value={contextValue}>
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
                  onChange={(event) => handleSpecificDateChange(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:bg-white"
                />
              </div>
            ) : filter === "dateRange" ? (
              <div className="space-y-2">
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    type="date"
                    value={rangeStartDate}
                    onChange={(event) => handleRangeDateChange("start", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:bg-white"
                  />
                  <input
                    type="date"
                    value={rangeEndDate}
                    onChange={(event) => handleRangeDateChange("end", event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:bg-white"
                  />
                </div>
                <p
                  className={`text-sm ${
                    dateRangeValidationMessage ? "text-rose-600" : "text-slate-500"
                  }`}
                >
                  {dateRangeValidationMessage ?? "Rentang tanggal maksimal 3 bulan."}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/60 bg-white/90 p-4 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
          <div className="flex flex-wrap gap-2">
            {recapNavigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isRecapNavigationActive(pathname, item.href)
                    ? "bg-amber-400 text-slate-950"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {children}
      </section>
    </RecapContext.Provider>
  );
}