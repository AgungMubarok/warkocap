"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  clearPersistedUserRole,
  getUserRoleServerSnapshot,
  getUserRoleSnapshot,
  subscribeToUserRole,
  type UserRole,
} from "@/lib/user-role";

interface NavigationItem {
  href: string;
  label: string;
  roles: UserRole[];
}

const navigationItems: NavigationItem[] = [
  { href: "/", label: "Kasir", roles: ["admin", "cashier"] },
  { href: "/pengeluaran", label: "Pengeluaran", roles: ["admin", "cashier"] },
  { href: "/admin/daftar", label: "Daftar Produk", roles: ["admin"] },
  { href: "/admin/tambah", label: "Tambah Produk", roles: ["admin"] },
  { href: "/recap", label: "Rekap", roles: ["admin"] },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const userRole = useSyncExternalStore(
    subscribeToUserRole,
    getUserRoleSnapshot,
    getUserRoleServerSnapshot
  );

  const visibleNavigation = useMemo(
    () => (userRole ? navigationItems.filter((item) => item.roles.includes(userRole)) : []),
    [userRole]
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleCloseMenu = () => {
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    setIsMenuOpen(false);
    clearPersistedUserRole();
    router.push("/login");
  };

  const isActivePath = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  const roleLabel =
    userRole === "admin" ? "Mode Admin" : userRole === "cashier" ? "Mode Kasir" : null;

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-4 md:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 rounded-[1.5rem] border border-white/60 bg-white/88 px-4 py-3 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur md:px-5">
        <Link href="/" className="flex shrink-0 items-center gap-3" onClick={handleCloseMenu}>
          <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white/80 shadow-lg ring-1 ring-slate-200/70">
            <Image
              src="/logo-warkocap.png"
              alt="Warkocap"
              width={44}
              height={44}
              className="h-10 w-10 object-contain"
              priority
            />
          </span>
          <p className="font-display text-xl font-semibold leading-none text-slate-950">
            Warkocap
          </p>
        </Link>

        <div className="hidden min-w-0 flex-1 md:flex md:justify-center">
          <div className="flex flex-wrap items-center gap-1 rounded-full bg-slate-100 p-1">
            {visibleNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActivePath(item.href)
                    ? "bg-amber-400 text-slate-950 shadow-sm"
                    : "text-slate-700 hover:bg-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2" ref={menuRef}>
          {roleLabel ? (
            <span className="hidden rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 md:inline-flex">
              {roleLabel}
            </span>
          ) : pathname !== "/login" ? (
            <Link
              href="/login"
              className="hidden rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 md:inline-flex"
            >
              Masuk
            </Link>
          ) : null}

          {userRole ? (
            <>
              <button
                onClick={handleLogout}
                className="hidden rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-200 md:inline-flex"
              >
                Logout
              </button>
              <button
                onClick={() => setIsMenuOpen((currentState) => !currentState)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm transition hover:bg-slate-800 md:hidden"
                aria-label="Buka menu"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16m-7 6h7"
                  />
                </svg>
              </button>
              <div
                className={`absolute right-0 top-[calc(100%+0.75rem)] w-[min(18rem,calc(100vw-2rem))] rounded-[1.75rem] border border-white/70 bg-white/95 p-3 shadow-[0_25px_80px_rgba(15,23,42,0.16)] backdrop-blur transition md:hidden ${
                  isMenuOpen
                    ? "translate-y-0 opacity-100"
                    : "pointer-events-none -translate-y-2 opacity-0"
                }`}
              >
                <div className="mb-3 rounded-2xl bg-slate-950 px-4 py-3 text-white">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Akses</p>
                  <p className="mt-2 font-semibold">{roleLabel}</p>
                </div>
                <div className="space-y-2">
                  {visibleNavigation.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleCloseMenu}
                      className={`block rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                        isActivePath(item.href)
                          ? "bg-amber-400 text-slate-950"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <button
                    onClick={handleLogout}
                    className="block w-full rounded-2xl bg-rose-100 px-4 py-3 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-200"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </>
          ) : pathname === "/login" ? (
            <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Login
            </span>
          ) : null}
        </div>
      </div>
    </header>
  );
}