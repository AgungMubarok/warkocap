"use client";

import { useEffect, useMemo, useState } from "react";
import {
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import withAuth from "@/hooks/withAuth";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  PaginationState,
} from "@tanstack/react-table";
import Link from "next/link";
import Modal from "react-modal";
import Swal from "sweetalert2";
import {
  formatCurrency,
  formatCurrencyInput,
  normalizeCurrencyInput,
  parseCurrencyInput,
} from "@/lib/date-range";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  SortIndicator,
} from "@/components/ui/icons";
import {
  removeProductFromCache,
  upsertProductInCache,
} from "@/lib/firebase-data";
import { useProductCatalog } from "@/hooks/useProductCatalog";
import type { Product } from "@/lib/types";
import {
  getProductStockStatus,
  isLowStockAlert,
  type StockStatus,
} from "@/lib/stock";

// Atur elemen root untuk modal (untuk aksesibilitas)
Modal.setAppElement("body");

function DaftarProdukPage() {
  const { products, isLoading } = useProductCatalog();

  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editHargaJualInput, setEditHargaJualInput] = useState("");
  const [editHargaModalInput, setEditHargaModalInput] = useState("");

  const [globalFilter, setGlobalFilter] = useState("");
  const [stockFilter, setStockFilter] = useState<StockStatus | "SEMUA_PRODUK">("SEMUA_PRODUK");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  useEffect(() => {
    setPagination((currentPagination) => ({
      ...currentPagination,
      pageIndex: 0,
    }));
  }, [globalFilter, stockFilter, pageSize]);

  const filteredProducts = useMemo(() => {
    let filteredCatalog = globalFilter
      ? products.filter((product) =>
          product.namaProduk_lowercase.includes(globalFilter)
        )
      : products;

    if (stockFilter !== "SEMUA_PRODUK") {
      filteredCatalog = filteredCatalog.filter(
        (product) => getProductStockStatus(product.stok) === stockFilter
      );
    }

    if (sorting.length === 0) {
      return filteredCatalog;
    }

    const { id, desc } = sorting[0];
    return [...filteredCatalog].sort((leftProduct, rightProduct) => {
      const leftValue = leftProduct[id as keyof Product];
      const rightValue = rightProduct[id as keyof Product];

      if (typeof leftValue === "number" && typeof rightValue === "number") {
        return desc ? rightValue - leftValue : leftValue - rightValue;
      }

      return desc
        ? String(rightValue ?? "").localeCompare(String(leftValue ?? ""))
        : String(leftValue ?? "").localeCompare(String(rightValue ?? ""));
    });
  }, [products, globalFilter, stockFilter, sorting]);

  const lowStockCount = useMemo(
    () => products.filter((product) => isLowStockAlert(product.stok)).length,
    [products]
  );

  const pageCount =
    filteredProducts.length === 0 ? 0 : Math.ceil(filteredProducts.length / pageSize);

  useEffect(() => {
    const maxPageIndex = pageCount > 0 ? pageCount - 1 : 0;

    if (pageIndex > maxPageIndex) {
      setPagination((currentPagination) => ({
        ...currentPagination,
        pageIndex: maxPageIndex,
      }));
    }
  }, [pageCount, pageIndex]);

  const paginatedProducts = useMemo(() => {
    const startIndex = pageIndex * pageSize;
    return filteredProducts.slice(startIndex, startIndex + pageSize);
  }, [filteredProducts, pageIndex, pageSize]);

  const openEditModal = (product: Product) => {
    setSelectedProduct(product);
    setEditHargaJualInput(product.hargaJual > 0 ? `${product.hargaJual}` : "");
    setEditHargaModalInput(product.hargaModal > 0 ? `${product.hargaModal}` : "");
    setModalIsOpen(true);
  };

  const closeEditModal = () => {
    setModalIsOpen(false);
    setSelectedProduct(null);
    setEditHargaJualInput("");
    setEditHargaModalInput("");
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const hargaJualValue = parseCurrencyInput(editHargaJualInput);
    const hargaModalValue = parseCurrencyInput(editHargaModalInput);

    if (!selectedProduct.namaProduk || hargaJualValue <= 0) {
      Swal.fire({
        icon: "warning",
        title: "Oops...",
        text: "Nama produk dan harga jual wajib diisi.",
      });
      return;
    }

    const productRef = doc(db, "products", selectedProduct.id);
    const nextProduct = {
      ...selectedProduct,
      hargaJual: hargaJualValue,
      hargaModal: hargaModalValue,
      stok:
        typeof selectedProduct.stok === "number" &&
        Number.isFinite(selectedProduct.stok)
          ? Number(selectedProduct.stok)
          : null,
      namaProduk_lowercase: selectedProduct.namaProduk.toLowerCase(),
    };
    try {
      await updateDoc(productRef, {
        namaProduk: nextProduct.namaProduk,
        hargaJual: nextProduct.hargaJual,
        hargaModal: nextProduct.hargaModal,
        stok: nextProduct.stok,
        namaProduk_lowercase: nextProduct.namaProduk_lowercase,
        updatedAt: serverTimestamp(),
      });
      upsertProductInCache(nextProduct);
      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Produk berhasil diperbarui.",
      });
      closeEditModal();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal!",
        text: "Gagal memperbarui produk.",
      });
    }
  };

  // Fungsi untuk menghapus produk
  const handleDeleteProduct = (productId: string) => {
    Swal.fire({
      title: "Apakah Anda yakin?",
      text: "Produk yang dihapus tidak dapat dikembalikan!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteDoc(doc(db, "products", productId));
          removeProductFromCache(productId);
          Swal.fire("Terhapus!", "Produk berhasil dihapus.", "success");
        } catch (error) {
          Swal.fire("Gagal!", "Gagal menghapus produk.", "error");
        }
      }
    });
  };

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      { accessorKey: "namaProduk", header: "Nama Produk", enableSorting: true },
      {
        accessorKey: "hargaJual",
        header: "Harga Jual",
        cell: (info) => formatCurrency(info.getValue<number>()),
        enableSorting: true,
      },
      {
        accessorKey: "hargaModal",
        header: "Harga Modal",
        cell: (info) => formatCurrency(info.getValue<number>()),
        enableSorting: true,
      },
      {
        accessorKey: "stok",
        header: "Stok",
        cell: ({ row }) => {
          if (typeof row.original.stok !== "number") {
            return <span className="text-xs text-slate-500">Belum diatur</span>;
          }

          return (
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                row.original.stok <= 0
                  ? "bg-rose-100 text-rose-700"
                  : row.original.stok <= 5
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {row.original.stok} pcs
            </span>
          );
        },
        enableSorting: true,
      },
      {
        id: "aksi",
        header: "Aksi",
        cell: ({ row }) => (
          <div className="flex space-x-2">
            <button
              onClick={() => openEditModal(row.original)}
              className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-200"
            >
              Edit
            </button>
            <button
              onClick={() => handleDeleteProduct(row.original.id)}
              className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-200"
            >
              Hapus
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: paginatedProducts,
    columns,
    pageCount: pageCount || 1,
    state: { sorting, pagination: { pageIndex, pageSize } },
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
  });

  const visiblePageCount = pageCount || 1;

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-4 md:px-6 md:py-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="rounded-[1.75rem] border border-white/60 bg-white/92 px-5 py-4 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <h1 className="text-2xl font-bold text-slate-900">Daftar Produk</h1>
        </div>
        <Link
          href="/admin/tambah"
          className="inline-flex items-center justify-center rounded-[1.75rem] bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          + Tambah Produk
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.5rem] border border-white/60 bg-white/90 p-4 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <p className="text-sm text-slate-500">Total produk</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{products.length}</p>
        </div>
        <div className="rounded-[1.5rem] border border-white/60 bg-white/90 p-4 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <p className="text-sm text-slate-500">Stok rendah</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{lowStockCount}</p>
        </div>
        <div className="rounded-[1.5rem] border border-white/60 bg-white/90 p-4 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <p className="text-sm text-slate-500">Produk terfilter</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{filteredProducts.length}</p>
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/60 bg-white/90 p-4 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            type="text"
            onChange={(e) => setGlobalFilter(e.target.value.toLowerCase())}
            placeholder="Cari produk..."
            className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:bg-white"
          />
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:w-auto xl:shrink-0">
            <div className="relative w-full sm:min-w-[11rem]">
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as StockStatus | "SEMUA_PRODUK")}
                className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-11 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:bg-white"
              >
                <option value="SEMUA_PRODUK">Semua Produk</option>
                <option value="TERSEDIA">Tersedia</option>
                <option value="STOK_RENDAH">Stok Rendah</option>
                <option value="STOK_HABIS">Stok Habis</option>
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
            <div className="relative w-full sm:min-w-[11rem]">
              <select
                value={table.getState().pagination.pageSize}
                onChange={(e) => {
                  table.setPageSize(Number(e.target.value));
                }}
                className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-11 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:bg-white"
              >
                {[10, 20, 30, 50].map((size) => (
                  <option key={size} value={size}>
                    Tampil {size}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:hidden">
          {isLoading ? (
            <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
              Memuat katalog produk...
            </div>
          ) : paginatedProducts.length > 0 ? (
            paginatedProducts.map((product) => (
              <article
                key={product.id}
                className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      {product.namaProduk}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Jual {formatCurrency(product.hargaJual)}
                    </p>
                    <p className="text-sm text-slate-500">
                      Modal {formatCurrency(product.hargaModal)}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                    {typeof product.stok === "number"
                      ? `${product.stok} pcs`
                      : "Stok belum diatur"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => openEditModal(product)}
                    className="rounded-full bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(product.id)}
                    className="rounded-full bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-200"
                  >
                    Hapus
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
              Produk tidak ditemukan.
            </div>
          )}
        </div>

        <div className="hidden overflow-auto rounded-[1.5rem] border border-slate-200 md:block">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      scope="col"
                      className="cursor-pointer px-5 py-4"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      <SortIndicator direction={header.column.getIsSorted()} />
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length} className="p-6 text-center text-slate-500">
                    Memuat data...
                  </td>
                </tr>
              ) : paginatedProducts.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-5 py-4 align-top">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="p-6 text-center text-slate-500">
                    Produk tidak ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-slate-600">
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Halaman pertama"
          >
            <ChevronsLeftIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <span className="flex items-center gap-1 rounded-xl bg-slate-100 px-4 py-2">
            <span>Halaman</span>
            <strong>
              {table.getState().pagination.pageIndex + 1} dari {visiblePageCount}
            </strong>
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Halaman berikutnya"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => table.setPageIndex(visiblePageCount - 1)}
            disabled={!table.getCanNextPage()}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Halaman terakhir"
          >
            <ChevronsRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeEditModal}
        contentLabel="Edit Produk"
        className="app-modal-content w-full max-w-2xl p-6 md:p-8"
        overlayClassName="app-modal-overlay"
      >
        {selectedProduct && (
          <form onSubmit={handleUpdateProduct}>
            <h2 className="mb-6 text-2xl font-bold text-slate-900">Edit Produk</h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="editNamaProduk"
                  className="block text-sm font-medium text-slate-700"
                >
                  Nama Produk
                </label>
                <input
                  type="text"
                  id="editNamaProduk"
                  value={selectedProduct.namaProduk}
                  onChange={(e) =>
                    setSelectedProduct({
                      ...selectedProduct,
                      namaProduk: e.target.value,
                    })
                  }
                  className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                />
              </div>
              <div>
                <label
                  htmlFor="editHargaJual"
                  className="block text-sm font-medium text-slate-700"
                >
                  Harga Jual
                </label>
                <input
                  type="text"
                  id="editHargaJual"
                  inputMode="numeric"
                  value={formatCurrencyInput(editHargaJualInput)}
                  onChange={(e) => setEditHargaJualInput(normalizeCurrencyInput(e.target.value))}
                  className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  placeholder="Rp 0"
                />
              </div>
              <div>
                <label
                  htmlFor="editHargaModal"
                  className="block text-sm font-medium text-slate-700"
                >
                  Harga Modal <span className="text-gray-400">(Opsional)</span>
                </label>
                <input
                  type="text"
                  id="editHargaModal"
                  inputMode="numeric"
                  value={formatCurrencyInput(editHargaModalInput)}
                  onChange={(e) => setEditHargaModalInput(normalizeCurrencyInput(e.target.value))}
                  className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  placeholder="Rp 0"
                />
              </div>
              <div>
                <label
                  htmlFor="editStok"
                  className="block text-sm font-medium text-slate-700"
                >
                  Stok
                </label>
                <input
                  type="number"
                  id="editStok"
                  min="0"
                  value={selectedProduct.stok ?? ""}
                  onChange={(e) =>
                    setSelectedProduct({
                      ...selectedProduct,
                      stok: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
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

export default withAuth(DaftarProdukPage, ["admin"]);
