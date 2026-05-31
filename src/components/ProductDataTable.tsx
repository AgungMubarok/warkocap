"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import Swal from "sweetalert2";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  InfoIcon,
  PlusIcon,
  SearchIcon,
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
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [overflowingProductIds, setOverflowingProductIds] = useState<Record<string, boolean>>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const productNameRefs = useRef<Record<string, HTMLHeadingElement | null>>({});
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

  useEffect(() => {
    if (typeof window === "undefined") {
      return () => undefined;
    }

    let animationFrameId = 0;

    const measureOverflowingProductNames = () => {
      animationFrameId = window.requestAnimationFrame(() => {
        const nextOverflowingProductIds = paginatedProducts.reduce<Record<string, boolean>>(
          (result, product) => {
            const productNameElement = productNameRefs.current[product.id];

            if (!productNameElement) {
              return result;
            }

            result[product.id] =
              productNameElement.scrollWidth > productNameElement.clientWidth + 1;

            return result;
          },
          {}
        );

        setOverflowingProductIds((currentOverflowingProductIds) => {
          const currentKeys = Object.keys(currentOverflowingProductIds);
          const nextKeys = Object.keys(nextOverflowingProductIds);

          if (
            currentKeys.length === nextKeys.length &&
            nextKeys.every(
              (productId) =>
                currentOverflowingProductIds[productId] === nextOverflowingProductIds[productId]
            )
          ) {
            return currentOverflowingProductIds;
          }

          return nextOverflowingProductIds;
        });
      });
    };

    measureOverflowingProductNames();
    window.addEventListener("resize", measureOverflowingProductNames);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", measureOverflowingProductNames);
    };
  }, [paginatedProducts]);

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

  const handleStockInfoClick = (productName: string, remainingStock: number | null) => {
    void Swal.fire({
      icon: "info",
      title: productName,
      text:
        remainingStock === null
          ? "Stok untuk produk ini belum diatur."
          : `Sisa stok yang tersedia: ${remainingStock}.`,
      confirmButtonText: "OK",
    });
  };

  const toggleExpandedProductName = (productId: string) => {
    setExpandedProductId((currentProductId) =>
      currentProductId === productId ? null : productId
    );
  };

  return (
    <section className="rounded-[2rem] border border-white/60 bg-white/90 p-4 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            onChange={(e) => setGlobalFilter(e.target.value.toLowerCase())}
            placeholder="Cari produk..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:bg-white"
          />
        </div>
        <div className="flex items-center gap-3 md:shrink-0">
          <div className="inline-flex min-h-[3.25rem] flex-1 items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 md:min-w-[9.5rem] md:justify-center">
            {filteredProducts.length} produk aktif
          </div>
          <div className="relative w-[9.5rem] shrink-0 md:w-[11rem]">
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

      <div className="grid gap-2 md:hidden">
        {isLoading ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
            Memuat katalog produk...
          </div>
        ) : paginatedProducts.length > 0 ? (
          paginatedProducts.map((product) => {
            const stockInCart = cartQuantities[product.id] ?? 0;
            const remainingStock =
              typeof product.stok === "number"
                ? product.stok - stockInCart
                : null;
            const isNameExpanded = expandedProductId === product.id;
            const shouldShowNameToggle = overflowingProductIds[product.id] ?? false;

            return (
              <article
                key={product.id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50/80 px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                      <div className="relative min-w-0">
                        <h3
                          ref={(node) => {
                            productNameRefs.current[product.id] = node;
                          }}
                          className={`min-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold text-slate-900 ${
                            shouldShowNameToggle ? "pr-5" : ""
                          }`}
                        >
                          {product.namaProduk}
                        </h3>
                        {shouldShowNameToggle ? (
                          <button
                            type="button"
                            onClick={() => toggleExpandedProductName(product.id)}
                            aria-label={`${isNameExpanded ? "Sembunyikan" : "Lihat"} nama lengkap ${product.namaProduk}`}
                            className="absolute right-0 top-1/2 -translate-y-1/2 bg-slate-50/90 px-0.5 text-xs font-bold leading-none text-slate-400 transition hover:text-slate-600"
                          >
                            ...
                          </button>
                        ) : null}
                      </div>
                      <p className="shrink-0 text-[13px] font-medium text-slate-600">
                        {formatCurrency(product.hargaJual)}
                      </p>
                    </div>
                    {shouldShowNameToggle && isNameExpanded ? (
                      <p className="mt-1 max-w-full break-words text-xs leading-5 text-slate-500">
                        {product.namaProduk}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {remainingStock === null ? (
                      <button
                        type="button"
                        onClick={() =>
                          handleStockInfoClick(product.namaProduk, remainingStock)
                        }
                        title="Lihat info stok"
                        aria-label={`Lihat info stok ${product.namaProduk}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm transition hover:bg-slate-100"
                      >
                        <InfoIcon className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
                        {remainingStock}
                      </span>
                    )}
                    <button
                      onClick={() => onAddToCart(product)}
                      disabled={remainingStock !== null && remainingStock <= 0}
                      aria-label={`Tambah ${product.namaProduk} ke keranjang`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
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

      <div className="mt-4 flex flex-nowrap items-center justify-center gap-1.5 text-sm text-slate-600 sm:gap-2">
        <button
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40 sm:h-11 sm:w-11 sm:rounded-2xl"
          aria-label="Halaman pertama"
        >
          <ChevronsLeftIcon className="h-4 w-4" />
        </button>
        <button
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40 sm:h-11 sm:w-11 sm:rounded-2xl"
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <span className="flex shrink-0 items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs whitespace-nowrap sm:px-4 sm:text-sm">
          <strong className="sm:hidden">
            {table.getState().pagination.pageIndex + 1} / {visiblePageCount}
          </strong>
          <>
            <span className="hidden sm:inline">Halaman</span>
            <strong className="hidden sm:inline">
              {table.getState().pagination.pageIndex + 1} dari{" "}
              {visiblePageCount}
            </strong>
          </>
        </span>
        <button
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40 sm:h-11 sm:w-11 sm:rounded-2xl"
          aria-label="Halaman berikutnya"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
        <button
          onClick={() => table.setPageIndex(visiblePageCount - 1)}
          disabled={!table.getCanNextPage()}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40 sm:h-11 sm:w-11 sm:rounded-2xl"
          aria-label="Halaman terakhir"
        >
          <ChevronsRightIcon className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
