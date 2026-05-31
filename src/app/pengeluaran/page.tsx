"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import Modal from "react-modal";
import Swal from "sweetalert2";
import withAuth from "@/hooks/withAuth";
import { db } from "@/lib/firebase";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "@/components/ui/icons";
import {
  formatCurrency,
  formatCurrencyInput,
  formatDateForInput,
  getCalendarRange,
  normalizeCurrencyInput,
  parseCurrencyInput,
} from "@/lib/date-range";
import { getExpensesByRange, invalidateExpenseCaches } from "@/lib/firebase-data";
import type { ExpenseRecord } from "@/lib/types";

Modal.setAppElement("body");

const PAGE_SIZE = 6;

function PengeluaranPage() {
  const today = useMemo(() => new Date(), []);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [pageIndex, setPageIndex] = useState(0);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRecord | null>(null);
  const [selectedExpenseAmountInput, setSelectedExpenseAmountInput] = useState("");

  const loadExpenses = useCallback(async () => {
    setIsLoadingExpenses(true);

    try {
      const { start, end } = getCalendarRange(fromDate, toDate);
      const nextExpenses = await getExpensesByRange(start, end);
      setExpenses(nextExpenses);
    } finally {
      setIsLoadingExpenses(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    let isActive = true;

    const syncExpenses = async () => {
      try {
        const { start, end } = getCalendarRange(fromDate, toDate);
        const nextExpenses = await getExpensesByRange(start, end);

        if (!isActive) {
          return;
        }

        setExpenses(nextExpenses);
      } finally {
        if (isActive) {
          setIsLoadingExpenses(false);
        }
      }
    };

    void syncExpenses();

    return () => {
      isActive = false;
    };
  }, [fromDate, toDate]);

  const totalPages = expenses.length === 0 ? 1 : Math.ceil(expenses.length / PAGE_SIZE);
  const currentPageIndex = Math.min(pageIndex, totalPages - 1);

  const paginatedExpenses = useMemo(() => {
    const startIndex = currentPageIndex * PAGE_SIZE;
    return expenses.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPageIndex, expenses]);

  const totalExpenseAmount = useMemo(
    () => expenses.reduce((sum, expense) => sum + expense.amount, 0),
    [expenses]
  );

  const handleFromDateChange = (value: string) => {
    const nextDate = new Date(value.replace(/-/g, "/"));

    if (Number.isNaN(nextDate.getTime())) {
      return;
    }

    setFromDate(nextDate);
    if (nextDate > toDate) {
      setToDate(nextDate);
    }
    setIsLoadingExpenses(true);
    setPageIndex(0);
  };

  const handleToDateChange = (value: string) => {
    const nextDate = new Date(value.replace(/-/g, "/"));

    if (Number.isNaN(nextDate.getTime())) {
      return;
    }

    setToDate(nextDate);
    if (nextDate < fromDate) {
      setFromDate(nextDate);
    }
    setIsLoadingExpenses(true);
    setPageIndex(0);
  };

  const handlePageChange = (nextPage: number) => {
    setPageIndex(Math.max(0, Math.min(totalPages - 1, nextPage)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountValue = parseCurrencyInput(amount);

    if (!description || amountValue <= 0) {
      return Swal.fire({
        icon: "warning",
        title: "Oops...",
        text: "Harap isi semua kolom!",
      });
    }

    setLoading(true);

    try {
      await addDoc(collection(db, "expenses"), {
        description,
        amount: amountValue,
        timestamp: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      invalidateExpenseCaches();
      await loadExpenses();
      setDescription("");
      setAmount("");
      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Pengeluaran berhasil dicatat.",
      });
    } catch {
      Swal.fire({
        icon: "error",
        title: "Gagal!",
        text: "Gagal mencatat pengeluaran.",
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (expense: ExpenseRecord) => {
    setSelectedExpense(expense);
    setSelectedExpenseAmountInput(expense.amount > 0 ? `${expense.amount}` : "");
    setModalIsOpen(true);
  };

  const closeEditModal = () => {
    setModalIsOpen(false);
    setSelectedExpense(null);
    setSelectedExpenseAmountInput("");
  };

  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedExpense) {
      return;
    }

    const amountValue = parseCurrencyInput(selectedExpenseAmountInput);

    if (!selectedExpense.description || amountValue <= 0) {
      Swal.fire("Oops...", "Keterangan dan jumlah wajib diisi.", "warning");
      return;
    }

    try {
      const expenseRef = doc(db, "expenses", selectedExpense.id);
      await updateDoc(expenseRef, {
        description: selectedExpense.description,
        amount: amountValue,
        updatedAt: serverTimestamp(),
      });
      invalidateExpenseCaches();
      await loadExpenses();
      closeEditModal();
      Swal.fire("Sukses!", "Pengeluaran berhasil diperbarui.", "success");
    } catch {
      Swal.fire("Gagal!", "Gagal memperbarui pengeluaran.", "error");
    }
  };

  const handleDeleteExpense = (expenseId: string) => {
    Swal.fire({
      title: "Apakah Anda yakin?",
      text: "Data yang dihapus tidak dapat dikembalikan!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonText: "Batal",
      confirmButtonText: "Ya, hapus!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteDoc(doc(db, "expenses", expenseId));
          invalidateExpenseCaches();
          await loadExpenses();
          Swal.fire("Terhapus!", "Pengeluaran berhasil dihapus.", "success");
        } catch {
          Swal.fire("Gagal!", "Gagal menghapus pengeluaran.", "error");
        }
      }
    });
  };

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-4 md:px-6 md:py-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="rounded-[1.75rem] border border-white/60 bg-white/92 px-5 py-4 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <h1 className="text-2xl font-bold text-slate-900">Pengeluaran</h1>
        </div>
        <div className="rounded-[1.75rem] border border-white/60 bg-white/92 px-5 py-4 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <p className="text-sm text-slate-500">Catatan</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{expenses.length}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[1.5rem] border border-white/60 bg-white/90 p-4 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <p className="text-sm text-slate-500">Total pengeluaran pada rentang ini</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {formatCurrency(totalExpenseAmount)}
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-white/60 bg-white/90 p-4 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <p className="text-sm text-slate-500">Rentang aktif</p>
          <p className="mt-2 text-lg font-bold text-slate-900">
            {formatDateForInput(fromDate)} s/d {formatDateForInput(toDate)}
          </p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.4fr)]">
        <form
          onSubmit={handleSubmit}
          className="rounded-[2rem] border border-white/60 bg-white/90 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur md:p-6"
        >
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">Tambah Pengeluaran</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-700">
                Keterangan
              </label>
              <input
                type="text"
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contoh: Bayar listrik"
                className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm outline-none transition focus:border-orange-400 focus:bg-white"
                required
              />
            </div>
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-slate-700">
                Jumlah (Rp)
              </label>
              <input
                type="text"
                id="amount"
                inputMode="numeric"
                value={formatCurrencyInput(amount)}
                onChange={(e) => setAmount(normalizeCurrencyInput(e.target.value))}
                placeholder="Rp 0"
                className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm outline-none transition focus:border-orange-400 focus:bg-white"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {loading ? "Menyimpan..." : "Simpan Pengeluaran"}
            </button>
          </div>
        </form>

        <div className="rounded-[2rem] border border-white/60 bg-white/90 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
          <div className="mb-5 flex flex-col gap-4">
            <h2 className="text-xl font-bold text-slate-900">Riwayat Pengeluaran</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label htmlFor="fromDate" className="block text-sm font-medium text-slate-700">
                  Dari tanggal
                </label>
                <input
                  id="fromDate"
                  type="date"
                  value={formatDateForInput(fromDate)}
                  onChange={(e) => handleFromDateChange(e.target.value)}
                  className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm outline-none transition focus:border-orange-400 focus:bg-white"
                />
              </div>
              <div>
                <label htmlFor="toDate" className="block text-sm font-medium text-slate-700">
                  Sampai tanggal
                </label>
                <input
                  id="toDate"
                  type="date"
                  value={formatDateForInput(toDate)}
                  onChange={(e) => handleToDateChange(e.target.value)}
                  className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm outline-none transition focus:border-orange-400 focus:bg-white"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {isLoadingExpenses ? (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                Memuat pengeluaran...
              </div>
            ) : paginatedExpenses.length > 0 ? (
              paginatedExpenses.map((expense) => (
                <article
                  key={expense.id}
                  className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                        {expense.timestamp
                          ? expense.timestamp.toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
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
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => openEditModal(expense)}
                      className="rounded-full bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteExpense(expense.id)}
                      className="rounded-full bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-200"
                    >
                      Hapus
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                Belum ada pengeluaran pada rentang tanggal ini.
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm text-slate-600">
            <button
              onClick={() => handlePageChange(0)}
              disabled={currentPageIndex === 0}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Halaman pertama"
            >
              <ChevronsLeftIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => handlePageChange(currentPageIndex - 1)}
              disabled={currentPageIndex === 0}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <span className="flex items-center gap-1 rounded-xl bg-slate-100 px-4 py-2">
              <span>Halaman</span>
              <strong>
                {currentPageIndex + 1} dari {totalPages}
              </strong>
            </span>
            <button
              onClick={() => handlePageChange(currentPageIndex + 1)}
              disabled={currentPageIndex >= totalPages - 1}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Halaman berikutnya"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => handlePageChange(totalPages - 1)}
              disabled={currentPageIndex >= totalPages - 1}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Halaman terakhir"
            >
              <ChevronsRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeEditModal}
        contentLabel="Edit Pengeluaran"
        className="app-modal-content w-full max-w-xl p-6 md:p-8"
        overlayClassName="app-modal-overlay"
      >
        {selectedExpense && (
          <form onSubmit={handleUpdateExpense}>
            <h2 className="mb-6 text-2xl font-bold text-slate-900">Edit Pengeluaran</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="editDescription" className="block text-sm font-medium text-slate-700">
                  Keterangan
                </label>
                <input
                  type="text"
                  id="editDescription"
                  value={selectedExpense.description}
                  onChange={(e) =>
                    setSelectedExpense({
                      ...selectedExpense,
                      description: e.target.value,
                    })
                  }
                  className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                />
              </div>
              <div>
                <label htmlFor="editAmount" className="block text-sm font-medium text-slate-700">
                  Jumlah (Rp)
                </label>
                <input
                  type="text"
                  id="editAmount"
                  inputMode="numeric"
                  value={formatCurrencyInput(selectedExpenseAmountInput)}
                  onChange={(e) =>
                    setSelectedExpenseAmountInput(normalizeCurrencyInput(e.target.value))
                  }
                  className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  placeholder="Rp 0"
                />
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-2xl bg-slate-100 px-4 py-3 text-slate-700"
              >
                Batal
              </button>
              <button
                type="submit"
                className="rounded-2xl bg-slate-950 px-4 py-3 text-white"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        )}
      </Modal>
    </section>
  );
}

export default withAuth(PengeluaranPage, ["admin", "cashier"]);