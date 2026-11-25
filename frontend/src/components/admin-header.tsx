"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Menu, ShieldCheck, SlidersHorizontal, Store, UserRound, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";

const adminLinks = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/content", label: "Kelola konten", icon: SlidersHorizontal },
  { href: "/admin/merchant-stores", label: "Verifikasi toko", icon: Store },
];

export function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const clearCart = useCartStore((state) => state.clear);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      clearSession();
      clearCart();
      router.replace("/login");
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#102e22]/95 text-white shadow-[0_12px_36px_-22px_rgba(9,31,21,0.8)] backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-[90rem] items-center gap-4 px-4 sm:h-[76px] sm:px-6 lg:px-8">
        <Link href="/admin/dashboard" className="flex shrink-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-200 to-amber-400 text-emerald-950 shadow-lg shadow-black/15">
            <ShieldCheck size={21} />
          </span>
          <span>
            <span className="block text-sm font-extrabold tracking-tight sm:text-base">Rasa Lokal</span>
            <span className="mt-0.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200">
              <span className="size-1.5 rounded-full bg-emerald-300" /> Admin workspace
            </span>
          </span>
        </Link>

        <nav aria-label="Navigasi administrator" className="ml-5 hidden h-11 items-center gap-1 rounded-2xl border border-white/10 bg-white/5 p-1 md:flex">
          {adminLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-full items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all ${
                  active ? "bg-white text-emerald-950 shadow-sm" : "text-emerald-100/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={16} /> {label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          <span className="flex size-9 items-center justify-center rounded-full bg-white/10 text-emerald-100 ring-1 ring-white/10"><UserRound size={16} /></span>
          <span className="mr-2 max-w-40">
            <span className="block truncate text-xs font-bold text-white">{user?.name ?? "Administrator"}</span>
            <span className="block text-[10px] font-medium text-emerald-200/75">Administrator</span>
          </span>
          <Link href="/" className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-bold text-white transition hover:border-white/30 hover:bg-white/10">
            Lihat website
          </Link>
          <button type="button" onClick={() => void logout()} className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-2.5 text-xs font-bold text-emerald-950 transition hover:bg-amber-200">
            <LogOut size={15} /> Keluar
          </button>
        </div>

        <button
          type="button"
          aria-label={isMenuOpen ? "Tutup menu admin" : "Buka menu admin"}
          aria-expanded={isMenuOpen}
          aria-controls="admin-mobile-navigation"
          onClick={() => setIsMenuOpen((open) => !open)}
          className="ml-auto flex size-10 items-center justify-center rounded-full text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 md:hidden"
        >
          {isMenuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>

      {isMenuOpen && (
        <nav id="admin-mobile-navigation" aria-label="Navigasi admin seluler" className="border-t border-white/10 bg-emerald-950 px-4 py-3 md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {adminLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                    active ? "bg-white/10 text-white" : "text-emerald-100 hover:bg-white/5"
                  }`}
                >
                  <Icon size={17} /> {label}
                </Link>
              );
            })}
            <div className="mt-2 flex items-center justify-between border-t border-white/10 px-4 pt-3">
              <Link href="/" onClick={() => setIsMenuOpen(false)} className="text-sm font-semibold text-emerald-100">Lihat website</Link>
              <button type="button" onClick={() => void logout()} className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-amber-200 hover:bg-white/5">
                <LogOut size={16} /> Keluar
              </button>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
