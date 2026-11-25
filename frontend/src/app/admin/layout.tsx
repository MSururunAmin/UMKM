"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ExternalLink,
  LayoutDashboard,
  LogOut,
  ShoppingBag,
  ShieldCheck,
  SlidersHorizontal,
  Store,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";

const adminLinks = [
  { href: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Pesanan", icon: ShoppingBag },
  { href: "/admin/merchant-stores", label: "Verifikasi toko", icon: Store },
  { href: "/admin/content", label: "Konten website", icon: SlidersHorizontal },
];

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const clearCart = useCartStore((state) => state.clear);
  const activeSection = adminLinks.find(({ href }) => pathname === href || pathname.startsWith(`${href}/`))?.label ?? "Admin";

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
    <div className="min-h-screen bg-[#f4f7f3]">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[248px] flex-col border-r border-emerald-950/10 bg-[linear-gradient(180deg,#123d2b,#0f3324)] px-4 py-5 text-white lg:flex">
        <Link href="/admin/dashboard" className="flex items-center gap-3 rounded-2xl px-2 py-2">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-amber-300 text-emerald-950 shadow-lg shadow-black/10">
            <ShieldCheck size={21} />
          </span>
          <span>
            <span className="block text-sm font-black tracking-tight">Rasa Lokal</span>
            <span className="mt-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-200">
              <span className="size-1.5 rounded-full bg-emerald-300" /> Admin workspace
            </span>
          </span>
        </Link>

        <p className="mt-8 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200/60">Menu utama</p>
        <nav aria-label="Navigasi admin" className="mt-2 space-y-1.5">
          {adminLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${
                  active
                    ? "bg-white text-emerald-950 shadow-lg shadow-black/10"
                    : "text-emerald-50/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={18} /> {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto">
          <Link href="/" className="mb-2 flex items-center justify-between rounded-xl border border-white/10 px-3 py-3 text-sm font-bold text-emerald-100 transition hover:bg-white/10 hover:text-white">
            Lihat website <ExternalLink size={16} />
          </Link>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-900"><ShieldCheck size={16} /></span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-black">{user?.name ?? "Administrator"}</span>
                <span className="block text-[10px] text-emerald-200/75">Administrator</span>
              </span>
            </div>
            <button type="button" onClick={() => void logout()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300 py-2.5 text-xs font-black text-emerald-950 transition hover:bg-amber-200">
              <LogOut size={15} /> Keluar
            </button>
          </div>
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-emerald-950/10 bg-white/95 px-4 shadow-sm backdrop-blur-lg lg:hidden">
        <Link href="/admin/dashboard" className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-forest text-amber-200">
            <ShieldCheck size={18} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-black text-emerald-950">Rasa Lokal</span>
            <span className="block truncate text-[10px] font-medium text-brand-muted">{activeSection}</span>
          </span>
        </Link>
        <button type="button" onClick={() => void logout()} aria-label={`Keluar dari akun ${user?.name ?? "administrator"}`} title="Keluar" className="flex size-10 shrink-0 items-center justify-center rounded-full border border-red-100 bg-red-50 text-red-700 transition hover:border-red-200 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2">
          <LogOut size={17} />
        </button>
      </header>

      <nav aria-label="Navigasi admin mobile" className="fixed inset-x-0 bottom-0 z-30 border-t border-emerald-950/10 bg-white/95 px-2 pt-2 shadow-[0_-8px_30px_-20px_rgba(18,61,43,0.3)] backdrop-blur-lg pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-4 gap-1">
          {adminLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-bold transition ${
                  active ? "bg-brand-light text-brand-forest" : "text-stone-500 hover:bg-stone-50 hover:text-brand-forest"
                }`}
              >
                <Icon size={19} strokeWidth={active ? 2.5 : 2} />
                <span className="max-w-full truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="min-h-screen pb-20 lg:pb-0 lg:pl-[248px]">{children}</div>
    </div>
  );
}
