"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import axios from "axios";
import {
  ChevronDown,
  Leaf,
  LogOut,
  MapPin,
  Menu,
  Search,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";

const primaryLinks = [
  { href: "/", label: "Beranda" },
  { href: "/products", label: "Jelajahi Menu" },
];

function linkIsActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  return (
    <Suspense fallback={<header aria-hidden="true" className="sticky top-0 z-40 h-16 border-b border-emerald-950/10 bg-white sm:h-[72px]" />}>
      <SiteHeaderContent />
    </Suspense>
  );
}

function SiteHeaderContent() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearSession, isHydrated } = useAuthStore();
  const token = useAuthStore((state) => state.token);
  const setSession = useAuthStore((state) => state.setSession);
  const cartCount = useCartStore((state) => state.items.reduce((total, item) => total + item.quantity, 0));
  const clearCart = useCartStore((state) => state.clear);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isHydrated || !token) return;

    let active = true;
    api.get<{ user: typeof user }>("/auth/me")
      .then(({ data }) => {
        if (active && data.user) setSession(data.user, token);
      })
      .catch((error: unknown) => {
        if (active && axios.isAxiosError(error) && error.response?.status === 401) {
          clearSession();
        }
      });

    return () => {
      active = false;
    };
  }, [isHydrated, token, setSession, clearSession]);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      clearSession();
      clearCart();
      setIsProfileMenuOpen(false);
      setIsMobileMenuOpen(false);
      router.replace("/");
    }
  };

  const isApprovedSeller = Boolean(user?.merchant?.is_verified && !user.merchant.rejected_at);
  const roleLink = user?.role.toLowerCase() === "admin"
      ? { href: "/admin/content", label: "Kelola Konten" }
      : isApprovedSeller
        ? { href: "/merchant/dashboard", label: "Dashboard Penjual" }
        : user?.role.toLowerCase() === "customer" || user?.role.toLowerCase() === "merchant"
          ? { href: "/seller/register", label: user.merchant?.rejected_at ? "Status Pengajuan Toko" : user.merchant ? "Status Toko" : "Daftarkan Toko" }
          : null;

  return (
    <header className="sticky top-0 z-40 border-b border-emerald-950/10 bg-white/95 shadow-[0_4px_20px_rgba(17,54,38,0.05)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:h-[72px] sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="Rasa Lokal beranda"
          className="flex shrink-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-900 text-amber-100 shadow-sm">
            <Leaf size={21} strokeWidth={2.2} aria-hidden="true" />
          </span>
          <span className="text-[19px] font-extrabold tracking-[-0.055em] text-emerald-950 sm:text-[21px]">
            rasa<span className="text-emerald-700">lokal</span>
          </span>
        </Link>

        <nav aria-label="Navigasi utama" className="ml-7 hidden h-full items-center gap-1 md:flex">
          {primaryLinks.map((link) => {
            const active = linkIsActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-full items-center px-3 text-sm font-semibold transition-colors ${
                  active
                    ? "text-emerald-900 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-emerald-700"
                    : "text-stone-600 hover:text-emerald-800"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto hidden items-center gap-2 text-sm text-stone-500 lg:flex">
          <MapPin size={15} aria-hidden="true" />
          <span>Indonesia</span>
        </div>

        <div className="relative ml-auto flex shrink-0 items-center gap-1 sm:gap-2 md:ml-3">
          <Link
            href="/products"
            aria-label="Cari produk"
            className="flex size-10 items-center justify-center rounded-full text-emerald-950 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            <Search size={19} strokeWidth={1.9} aria-hidden="true" />
          </Link>

          <Link
            href="/cart"
            aria-label={cartCount ? `Keranjang, ${cartCount} produk` : "Keranjang"}
            aria-current={pathname === "/cart" ? "page" : undefined}
            className="relative flex size-10 items-center justify-center rounded-full text-emerald-950 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            <ShoppingBag size={19} strokeWidth={1.9} aria-hidden="true" />
            {cartCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex min-w-4 items-center justify-center rounded-full bg-emerald-800 px-1 text-[10px] leading-4 font-bold text-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>

          {isHydrated && user ? (
            <div className="relative ml-1">
              <button
                type="button"
                aria-label="Menu profil"
                aria-haspopup="menu"
                aria-expanded={isProfileMenuOpen}
                onClick={() => setIsProfileMenuOpen((open) => !open)}
                className="flex h-10 items-center gap-2 rounded-full border border-emerald-950/10 bg-white py-1 pl-1 pr-2.5 text-sm font-semibold text-emerald-950 shadow-sm transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 sm:pl-1.5 sm:pr-3"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-900">
                  <UserRound size={16} aria-hidden="true" />
                </span>
                <span className="hidden max-w-24 truncate sm:block">{user.name.split(" ")[0]}</span>
                <ChevronDown size={15} className="hidden text-stone-500 sm:block" aria-hidden="true" />
              </button>
              {isProfileMenuOpen && (
                <div
                  role="menu"
                  aria-label="Menu profil"
                  className="absolute right-0 top-12 z-50 w-60 rounded-2xl border border-emerald-950/10 bg-white p-2 shadow-xl shadow-emerald-950/10"
                >
                  <div className="border-b border-stone-100 px-3 py-2.5">
                    <p className="truncate text-sm font-bold text-emerald-950">{user.name}</p>
                    <p className="truncate text-xs text-stone-500">{user.email}</p>
                  </div>
                  {roleLink && (
                    <Link
                      href={roleLink.href}
                      role="menuitem"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="mt-1 block rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-emerald-50 hover:text-emerald-900"
                    >
                      {roleLink.label}
                    </Link>
                  )}
                  {user.role.toLowerCase() === "customer" && (
                    <Link
                      href="/orders"
                      role="menuitem"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="block rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-emerald-50 hover:text-emerald-900"
                    >
                      Pesanan saya
                    </Link>
                  )}
                  {user.role.toLowerCase() === "admin" && (
                    <Link
                      href="/admin/merchant-stores"
                      role="menuitem"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="block rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-emerald-50 hover:text-emerald-900"
                    >
                      Verifikasi toko
                    </Link>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void handleLogout()}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                  >
                    <LogOut size={16} aria-hidden="true" />
                    Keluar
                  </button>
                </div>
              )}
            </div>
          ) : isHydrated ? (
            <Link
              href="/login"
              className="ml-1 hidden h-10 items-center justify-center rounded-full bg-emerald-900 px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 sm:inline-flex"
            >
              Masuk
            </Link>
          ) : null}

          <button
            type="button"
            aria-label={isMobileMenuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-primary-navigation"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="ml-1 flex size-10 items-center justify-center rounded-full text-emerald-950 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 md:hidden"
          >
            {isMobileMenuOpen ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <nav
          id="mobile-primary-navigation"
          aria-label="Navigasi seluler"
          className="border-t border-emerald-950/10 bg-white px-4 py-3 shadow-lg shadow-emerald-950/5 md:hidden"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {primaryLinks.map((link) => {
              const active = linkIsActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                    active ? "bg-emerald-50 text-emerald-900" : "text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            {isHydrated && user?.role.toLowerCase() === "customer" && (
              <Link
                href="/orders"
                aria-current={linkIsActive(pathname, "/orders") ? "page" : undefined}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                  linkIsActive(pathname, "/orders") ? "bg-emerald-50 text-emerald-900" : "text-stone-700 hover:bg-stone-50"
                }`}
              >
                Pesanan saya
              </Link>
            )}
            <div className="mt-2 flex items-center justify-between border-t border-stone-100 px-4 pt-3 text-sm text-stone-500">
              <span className="flex items-center gap-2"><MapPin size={15} aria-hidden="true" /> Indonesia</span>
              {isHydrated && user ? (
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 font-semibold text-red-700 hover:bg-red-50"
                >
                  <LogOut size={15} aria-hidden="true" /> Keluar
                </button>
              ) : isHydrated ? (
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-full bg-emerald-900 px-4 py-2 font-semibold text-white transition-colors hover:bg-emerald-800"
                >
                  Masuk
                </Link>
              ) : null}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
