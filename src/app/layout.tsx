import type { Metadata } from "next";
import { Fraunces, Space_Grotesk } from "next/font/google";
import "./globals.css";
import "sweetalert2/src/sweetalert2.scss";
import Header from "@/components/Header";
import EnvBadge from "@/components/EnvBadge";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Warkocap Kasir v2",
  description:
    "Aplikasi kasir Warkocap untuk transaksi, stok, pengeluaran, dan rekap penjualan dengan antarmuka mobile-first.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${spaceGrotesk.variable} ${fraunces.variable}`}>
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-amber-300/35 blur-3xl" />
          <div className="absolute right-[-4rem] top-1/4 h-80 w-80 rounded-full bg-orange-200/40 blur-3xl" />
          <div className="absolute bottom-[-5rem] left-1/3 h-72 w-72 rounded-full bg-sky-200/35 blur-3xl" />
        </div>
        <div className="relative z-10 min-h-screen">
          <Header />
          <main className="mx-auto w-full max-w-7xl px-3 pb-10 pt-4 sm:px-4 md:px-6 lg:px-8">
            {children}
          </main>
        </div>
        <EnvBadge />
      </body>
    </html>
  );
}
