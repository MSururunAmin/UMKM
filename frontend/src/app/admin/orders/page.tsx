"use client";

import axios from "axios";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Search,
  ShoppingBag,
  Store,
  UserRound,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import type { User } from "@/types/api";

type AdminOrder = {
  id: number;
  order_number: string;
  status: string;
  total_amount: string | number;
  shipping_type: "delivery" | "pickup";
  delivery_address: string | null;
  created_at: string;
  user: { id: number; name: string; email: string } | null;
  merchant: { id: number; store_name: string } | null;
  items: { id: number; quantity: number; product: { name: string } | null }[];
};

type OrdersResponse = {
  data: AdminOrder[];
  current_page: number;
  last_page: number;
  total: number;
};

const statuses = [
  { value: "", label: "Semua status" },
  { value: "pending", label: "Menunggu pembayaran" },
  { value: "paid", label: "Pembayaran diterima" },
  { value: "processing", label: "Sedang diproses" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
];

const statusStyles: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800",
  paid: "bg-emerald-50 text-emerald-800",
  processing: "bg-sky-50 text-sky-800",
  completed: "bg-green-100 text-green-900",
  cancelled: "bg-red-50 text-red-700",
};

const statusLabels: Record<string, string> = Object.fromEntries(statuses.map(({ value, label }) => [value, label]));

export default function AdminOrdersPage() {
  const token = useAuthStore((state) => state.token);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<OrdersResponse | null>(null);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!isHydrated || !token) return;
    let active = true;
    void api.get<{ user: User }>("/auth/me")
      .then(({ data }) => {
        if (!active) return;
        if (data.user.role.toLowerCase() !== "admin") {
          setError("Halaman ini khusus administrator.");
          setLoading(false);
          return;
        }
        setSession(data.user, token);
        setIsAdmin(true);
      })
      .catch((authError: unknown) => {
        if (!active) return;
        if (axios.isAxiosError(authError) && authError.response?.status === 401) clearSession();
        setError("Sesi administrator tidak dapat diverifikasi. Silakan masuk kembali.");
        setLoading(false);
      });
    return () => { active = false; };
  }, [isHydrated, token, setSession, clearSession]);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    void api.get<OrdersResponse>("/admin/orders", {
      params: { page, status: status || undefined, search: appliedSearch || undefined },
    })
      .then(({ data }) => {
        if (!active) return;
        setOrders(data);
        setError("");
      })
      .catch(() => {
        if (active) setError("Daftar pesanan belum dapat dimuat. Silakan coba lagi.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [isAdmin, page, status, appliedSearch]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setAppliedSearch(search.trim());
  };

  const changeStatus = (value: string) => {
    setPage(1);
    setStatus(value);
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-8 pt-20 sm:px-6 lg:px-8 lg:py-10">
      {!isHydrated || (loading && !orders && !error) ? (
        <div role="status" className="rounded-3xl border border-brand-border bg-white p-6 text-sm text-brand-muted">Memuat daftar pesanan...</div>
      ) : !token || !isAdmin ? (
        <section className="rounded-3xl border border-brand-border bg-white p-6">
          <h1 className="text-xl font-black text-stone-900">Akses administrator</h1>
          <p className="mt-2 text-sm text-brand-muted">{error || "Masuk dengan akun administrator untuk melihat pesanan."}</p>
          <Link href="/login?next=%2Fadmin%2Forders" className="mt-5 inline-flex rounded-xl bg-brand-forest px-5 py-3 text-sm font-bold text-white">Masuk sebagai admin</Link>
        </section>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-brand-secondary">Manajemen transaksi</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-stone-900">Pesanan</h1>
              <p className="mt-1 text-sm text-brand-muted">Lihat pesanan pelanggan dan informasi penerimaan dari semua toko.</p>
            </div>
            <Link href="/admin/dashboard" className="text-sm font-bold text-brand-forest hover:text-brand-secondary">Kembali ke dashboard</Link>
          </div>

          <section className="mt-6 rounded-3xl border border-brand-border/80 bg-white p-4 shadow-[0_18px_48px_-38px_rgba(18,61,43,0.42)] sm:p-5">
            <form onSubmit={submitSearch} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_230px_auto]">
              <label className="flex h-11 items-center gap-2 rounded-xl border border-brand-border px-3 focus-within:border-brand-secondary focus-within:ring-2 focus-within:ring-brand-light">
                <Search size={17} className="shrink-0 text-brand-muted" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nomor pesanan, pelanggan, atau toko..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
              </label>
              <label className="sr-only" htmlFor="order-status-filter">Filter status</label>
              <select id="order-status-filter" value={status} onChange={(event) => changeStatus(event.target.value)} className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm text-stone-700 outline-none focus:border-brand-secondary focus:ring-2 focus:ring-brand-light">
                {statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
              <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-forest px-5 text-sm font-bold text-white transition hover:bg-brand-secondary">
                <Search size={16} /> Cari
              </button>
            </form>
          </section>

          {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

          <section aria-label="Daftar pesanan" className="mt-5 space-y-3">
            {(orders?.data ?? []).map((order) => (
              <article key={order.id} className="rounded-2xl border border-brand-border/80 bg-white p-4 shadow-[0_14px_38px_-34px_rgba(18,61,43,0.45)] sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-brand-border pb-3">
                  <div className="min-w-0">
                    <p className="break-all text-sm font-black text-stone-900">{order.order_number}</p>
                    <p className="mt-1 text-xs text-brand-muted">{new Date(order.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold ${statusStyles[order.status] ?? "bg-stone-100 text-stone-700"}`}>
                    {statusLabels[order.status] ?? order.status}
                  </span>
                </div>
                <div className="grid gap-4 py-4 sm:grid-cols-2">
                  <div className="space-y-2.5">
                    <p className="flex items-start gap-2 text-sm text-stone-700"><UserRound size={16} className="mt-0.5 shrink-0 text-brand-secondary" /><span><span className="font-bold">{order.user?.name ?? "Pelanggan tidak tersedia"}</span>{order.user?.email && <span className="block text-xs text-brand-muted">{order.user.email}</span>}</span></p>
                    <p className="flex items-center gap-2 text-sm text-stone-700"><Store size={16} className="shrink-0 text-brand-secondary" />{order.merchant?.store_name ?? "Toko tidak tersedia"}</p>
                    <p className="flex items-start gap-2 text-sm text-stone-700"><MapPin size={16} className="mt-0.5 shrink-0 text-brand-secondary" /><span>{order.shipping_type === "delivery" ? order.delivery_address || "Alamat pengantaran belum tersedia" : "Ambil di toko"}</span></p>
                  </div>
                  <div className="rounded-xl bg-brand-cream/70 p-3">
                    <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-brand-muted"><ShoppingBag size={14} /> Item pesanan</p>
                    {order.items.length > 0 ? (
                      <ul className="space-y-1.5">
                        {order.items.map((item) => <li key={item.id} className="flex justify-between gap-3 text-sm text-stone-700"><span className="min-w-0 truncate">{item.product?.name ?? "Produk tidak tersedia"}</span><span className="shrink-0 font-semibold">× {item.quantity}</span></li>)}
                      </ul>
                    ) : <p className="text-sm text-brand-muted">Detail item tidak tersedia.</p>}
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-brand-border pt-3">
                  <span className="text-xs font-semibold text-brand-muted">Total pesanan</span>
                  <span className="text-base font-black text-brand-forest">Rp{Number(order.total_amount).toLocaleString("id-ID")}</span>
                </div>
              </article>
            ))}
            {!loading && (orders?.data.length ?? 0) === 0 && (
              <div className="rounded-2xl border border-dashed border-brand-border bg-white px-5 py-12 text-center">
                <ShoppingBag size={26} className="mx-auto text-brand-secondary" />
                <p className="mt-3 text-sm font-bold text-stone-800">Pesanan tidak ditemukan</p>
                <p className="mt-1 text-xs text-brand-muted">Coba ubah kata pencarian atau filter status.</p>
              </div>
            )}
          </section>

          {orders && orders.last_page > 1 && (
            <nav aria-label="Halaman daftar pesanan" className="mt-5 flex items-center justify-between rounded-2xl border border-brand-border/80 bg-white px-4 py-3">
              <p className="text-xs text-brand-muted">Halaman {orders.current_page} dari {orders.last_page} · {orders.total} pesanan</p>
              <div className="flex gap-2">
                <button type="button" disabled={orders.current_page <= 1} onClick={() => setPage((current) => current - 1)} className="flex size-9 items-center justify-center rounded-lg border border-brand-border text-brand-forest disabled:opacity-40"><ChevronLeft size={17} /></button>
                <button type="button" disabled={orders.current_page >= orders.last_page} onClick={() => setPage((current) => current + 1)} className="flex size-9 items-center justify-center rounded-lg border border-brand-border text-brand-forest disabled:opacity-40"><ChevronRight size={17} /></button>
              </div>
            </nav>
          )}
        </>
      )}
    </main>
  );
}
