"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  PaginationState,
} from "@tanstack/react-table";
import { useProductCatalog } from "@/hooks/useProductCatalog";
import { formatCurrency } from "@/lib/date-range";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  SortIndicator,
} from "@/components/ui/icons";
import type { CartItem, Product } from "@/lib/types";

interface ProductDataTableProps {
  onAddToCart: (product: Product) => void;
  cart: CartItem[];
}

export default function ProductDataTable({
  onAddToCart,
  cart,
}: ProductDataTableProps) {
  const { products, isLoading } = useProductCatalog();

  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const cartQuantities = useMemo(
    () =>
      cart.reduce<Record<string, number>>((result, item) => {
        result[item.id] = item.quantity;
        return result;
      }, {}),
    [cart]
  );

  useEffect(() => {
    setPagination((currentPagination) => ({
      ...currentPagination,
      pageIndex: 0,
    }));
  }, [globalFilter, pageSize]);

  const filteredProducts = useMemo(() => {
    const filteredCatalog = globalFilter
      ? products.filter((product) =>
          product.namaProduk_lowercase.includes(globalFilter)
        )
      : products;

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
  }, [products, globalFilter, sorting]);

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

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      { accessorKey: "namaProduk", header: "Nama Produk", enableSorting: true },
      {
        accessorKey: "hargaJual",
        header: "Harga",
        cell: (info) => formatCurrency(info.getValue<number>()),
        enableSorting: true,
      },
      {
        accessorKey: "stok",
        header: "Stok",
        cell: ({ row }) => {
          const stock = row.original.stok;
          const stockInCart = cartQuantities[row.original.id] ?? 0;

          if (typeof stock !== "number") {
            return <span className="text-xs text-slate-500">Belum diatur</span>;
          }

          const remainingStock = stock - stockInCart;

          return (
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                remainingStock <= 0
                  ? "bg-rose-100 text-rose-700"
                  : remainingStock <= 5
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {remainingStock} tersisa
            </span>
          );
        },
        enableSorting: true,
      },
      {
        id: "aksi",
        header: "Aksi",
        cell: ({ row }) => (
          <button
            onClick={() => onAddToCart(row.original)}
            disabled={
              typeof row.original.stok === "number" &&
              row.original.stok - (cartQuantities[row.original.id] ?? 0) <= 0
            }
            className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Tambah ke Keranjang
          </button>
        ),
      },
    ],
    [cartQuantities, onAddToCart]
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
    <section className="rounded-[2rem] border border-white/60 bg-white/90 p-4 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <input
          type="text"
          onChange={(e) => setGlobalFilter(e.target.value.toLowerCase())}
          placeholder="Cari produk..."
          className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:bg-white"
        />
        <div className="flex flex-col gap-3 sm:flex-row md:shrink-0">
          <div className="inline-flex min-h-[3.25rem] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 sm:min-w-[9.5rem] sm:justify-start">
            {filteredProducts.length} produk aktif
          </div>
          <div className="relative sm:min-w-[11rem]">
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
          paginatedProducts.map((product) => {
            const stockInCart = cartQuantities[product.id] ?? 0;
            const remainingStock =
              typeof product.stok === "number"
                ? product.stok - stockInCart
                : null;

            return (
              <article
                key={product.id}
                className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{product.namaProduk}</h3>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                    {remainingStock === null
                      ? "Stok belum diatur"
                      : `${remainingStock} stok`}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-lg font-semibold text-slate-900">
                    {formatCurrency(product.hargaJual)}
                  </p>
                  <button
                    onClick={() => onAddToCart(product)}
                    disabled={remainingStock !== null && remainingStock <= 0}
                    className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Tambah
                  </button>
                </div>
              </article>
            );
          })
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
            {table.getState().pagination.pageIndex + 1} dari{" "}
            {visiblePageCount}
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
    </section>
  );
}
