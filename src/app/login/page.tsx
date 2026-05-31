"use client";

import { useEffect, useState } from "react";
import {
  clearPersistedUserRole,
  getUserRoleSnapshot,
  persistUserRole,
} from "@/lib/user-role";

export default function LoginPage() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const activeRole = getUserRoleSnapshot();

    if (activeRole) {
      window.location.replace("/");
      return;
    }

    if (typeof window !== "undefined" && localStorage.getItem("userRole")) {
      clearPersistedUserRole();
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const normalizedPasscode = passcode.trim();
    const adminPasscode = process.env.NEXT_PUBLIC_ADMIN_PASSCODE;
    const cashierPasscode = process.env.NEXT_PUBLIC_CASHIER_PASSCODE;

    if (normalizedPasscode === adminPasscode) {
      setIsSubmitting(true);
      persistUserRole("admin");
      window.location.replace("/");
      return;
    }

    if (normalizedPasscode === cashierPasscode) {
      setIsSubmitting(true);
      persistUserRole("cashier");
      window.location.replace("/");
      return;
    }

    setError("Kode sandi salah. Coba lagi.");
  };

  return (
    <section className="flex min-h-[calc(100vh-9rem)] items-center justify-center">
      <div className="w-full max-w-md rounded-[2rem] border border-white/60 bg-white/92 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur md:p-8">
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Masuk</h1>

        <form onSubmit={handleLogin} className="mt-6 space-y-5">
          <div>
            <label htmlFor="passcode" className="block text-sm font-medium text-slate-700">
              Kode sandi
            </label>
            <input
              id="passcode"
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Masukkan kode sandi"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-amber-500 focus:bg-white"
              required
            />
          </div>

          {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? "Memproses..." : "Masuk Sekarang"}
          </button>
        </form>
      </div>
    </section>
  );
}
