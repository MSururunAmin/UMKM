"use client";

import axios from "axios";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Boxes,
  ChevronRight,
  CircleDollarSign,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  UsersRound,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import type { User } from "@/types/api";

type DashboardData = {
  metrics: {
    users: number;
    customers: number;
    merchants: number;
    pending_merchants: number;
    products: number;
    orders: number;
    active_orders: number;
    revenue: number;
  };
  chart: { label: string; orders: number; revenue: number }[];
  recent_orders: {
    id: number;
    order_number: string;
    total_amount: string | number;
    status: string;
    created_at: string;
    user: { id: number; name: string } | null;
    merchant: { id: number; store_name: string } | null;
  }[];
  recent_stores: {
    id: number;
    store_name: string;
    address: string;
    is_verified: boolean;
    rejected_at: string | null;
    created_at: string;
    user: { id: number; name: string } | null;
  }[];
};

const statusLabels: Record<string, string> = {
  pending: "Menunggu",
  paid: "Dibayar",
  processing: "Diproses",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};


export default function AdminDashboardPage() {
  const token = useAuthStore((state) => state.token);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [search, setSearch] = useState("");

  const loadDashboard = useCallback(async () => {
    const { data } = await api.get<{ data: DashboardData }>("/admin/dashboard");
    setDashboard(data.data);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    if (!token) return;

    let active = true;
    void api.get<{ user: User }>("/auth/me")
      .then(async ({ data }) => {
        if (!active) return;
        setSession(data.user, token);
        if (data.user.role.toLowerCase() !== "admin") {
          setError("Halaman ini khusus administrator.");
          setLoading(false);
          return;
        }
        setIsAdmin(true);
        await loadDashboard();
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        if (axios.isAxiosError(requestError) && requestError.response?.status === 401) clearSession();
        setError("Data dashboard belum dapat dimuat.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [isHydrated, token, setSession, clearSession, loadDashboard]);

  const chart = dashboard?.chart ?? [];
  const maxOrders = Math.max(...chart.map((item) => item.orders), 1);
  const chartPoints = chart.map((item, index) => {
    const x = chart.length === 1 ? 0 : (index / (chart.length - 1)) * 660;
    const y = 180 - (item.orders / maxOrders) * 145;
    return `${x},${y}`;
  }).join(" ");

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return dashboard?.recent_orders ?? [];
    return (dashboard?.recent_orders ?? []).filter((order) =>
      [order.order_number, order.status, order.user?.name ?? "", order.merchant?.store_name ?? ""]
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [dashboard, search]);

  const metrics = dashboard?.metrics;

  return (
    <>
      <main className="mx-auto w-full max-w-360 flex-1 px-4 pb-6 pt-20 sm:px-6 lg:px-8 lg:py-8">
        <div className="min-w-0">
          {!isHydrated ? (
            <div className="rasa-surface p-8 text-sm text-brand-muted">Memuat workspace administrator...</div>
          ) : loading ? (
            <div className="rasa-surface p-8 text-sm text-brand-muted">Memuat data dashboard...</div>
          ) : !token || !isAdmin ? (
            <section className="rasa-surface p-7">
              <h1 className="text-xl font-black text-stone-900">Akses administrator</h1>
              <p className="mt-2 text-sm text-brand-muted">{error || "Silakan masuk dengan akun administrator untuk melihat dashboard."}</p>
              <Link href="/login?next=%2Fadmin%2Fdashboard" className="mt-5 inline-flex rounded-xl bg-brand-forest px-5 py-3 text-sm font-bold text-white">Masuk sebagai admin</Link>
            </section>
          ) : dashboard && (
            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-brand-secondary">Admin workspace</p>
                  <h1 className="mt-1 text-3xl font-black tracking-tight text-stone-900">Dashboard overview</h1>
                  <p className="mt-1 text-sm text-brand-muted">Pantau penjualan, pengguna, dan aktivitas UMKM secara realtime.</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex h-11 min-w-0 items-center gap-2 rounded-xl border border-brand-border bg-white px-3 shadow-sm sm:w-64">
                    <Search size={16} className="text-brand-muted" />
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari pesanan..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
                  </label>
                  <Link href="/admin/content" aria-label="Kelola konten" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-forest text-white shadow-lg shadow-emerald-950/10"><SlidersHorizontal size={18} /></Link>
                </div>
              </div>

              {error && <p role="alert" className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

              <section aria-label="Ringkasan dashboard" className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                {[
                  { label: "Total pengguna", value: metrics?.users ?? 0, icon: UsersRound, tone: "bg-emerald-50 text-emerald-800", detail: `${metrics?.customers ?? 0} pelanggan` },
                  { label: "Toko aktif", value: metrics?.merchants ?? 0, icon: Store, tone: "bg-lime-50 text-lime-800", detail: `${metrics?.pending_merchants ?? 0} menunggu verifikasi` },
                  { label: "Pesanan aktif", value: metrics?.active_orders ?? 0, icon: ShoppingBag, tone: "bg-amber-50 text-amber-800", detail: `${metrics?.orders ?? 0} total pesanan` },
                  { label: "Produk terdaftar", value: metrics?.products ?? 0, icon: Boxes, tone: "bg-teal-50 text-teal-800", detail: "Di seluruh toko" },
                ].map(({ label, value, icon: Icon, tone, detail }) => (
                  <article key={label} className="min-w-0 rounded-[22px] border border-brand-border/80 bg-white p-3 shadow-[0_18px_48px_-38px_rgba(18,61,43,0.45)] sm:p-5">
                    <div className="flex items-start justify-between">
                      <span className={`flex size-9 items-center justify-center rounded-xl sm:size-11 sm:rounded-2xl ${tone}`}><Icon size={18} /></span>
                      <span className="flex size-7 items-center justify-center rounded-full border border-brand-border text-brand-muted sm:size-8"><ArrowUpRight size={14} /></span>
                    </div>
                    <p className="mt-3 text-[11px] font-bold leading-4 text-brand-muted sm:mt-5 sm:text-xs">{label}</p>
                    <p className="mt-1 text-2xl font-black tracking-tight text-stone-900 sm:text-3xl">{value.toLocaleString("id-ID")}</p>
                    <p className="mt-1 min-h-8 text-[10px] font-semibold leading-4 text-brand-secondary sm:mt-2 sm:min-h-0 sm:text-[11px]">{detail}</p>
                  </article>
                ))}
              </section>

              <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(260px,0.45fr)]">
                <article className="rounded-[24px] border border-brand-border/80 bg-white p-5 shadow-[0_18px_48px_-38px_rgba(18,61,43,0.45)] sm:p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-brand-secondary">Aktivitas 7 hari</p>
                      <h2 className="mt-1 text-lg font-black text-stone-900">Pesanan masuk</h2>
                    </div>
                    <span className="rounded-xl bg-brand-light px-3 py-2 text-xs font-bold text-brand-forest">Live</span>
                  </div>
                  <div className="mt-5 overflow-hidden rounded-2xl bg-[linear-gradient(180deg,#f8faf7,#fff)] px-2 pb-2">
                    {chart.length > 0 ? (
                      <svg viewBox="0 0 660 210" role="img" aria-label="Grafik pesanan tujuh hari" className="h-52 w-full">
                        {[35, 82, 129, 176].map((y) => <line key={y} x1="0" y1={y} x2="660" y2={y} stroke="#e5ebe5" strokeWidth="1" strokeDasharray="5 7" />)}
                        <polygon points={`0,180 ${chartPoints} 660,180`} fill="rgba(47,112,75,.10)" />
                        <polyline points={chartPoints} fill="none" stroke="#2f704b" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                        {chart.map((item, index) => {
                          const x = chart.length === 1 ? 0 : (index / (chart.length - 1)) * 660;
                          const y = 180 - (item.orders / maxOrders) * 145;
                          return <g key={item.label}><circle cx={x} cy={y} r="6" fill="#fff" stroke="#2f704b" strokeWidth="4" /><text x={x} y="205" textAnchor="middle" fill="#65756a" fontSize="12" fontWeight="700">{item.label}</text></g>;
                        })}
                      </svg>
                    ) : <p className="py-20 text-center text-sm text-brand-muted">Belum ada data aktivitas.</p>}
                  </div>
                </article>

                <article className="flex flex-col rounded-[24px] border border-brand-border/80 bg-white p-5 shadow-[0_18px_48px_-38px_rgba(18,61,43,0.45)] sm:p-6">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-brand-secondary">Pendapatan</p>
                  <h2 className="mt-1 text-lg font-black text-stone-900">Total revenue</h2>
                  <div className="my-auto flex flex-col items-center py-6">
                    <span className="relative flex size-36 items-center justify-center rounded-full bg-[conic-gradient(#2f704b_0_72%,#dfe8df_72%_100%)]">
                      <span className="flex size-24 flex-col items-center justify-center rounded-full bg-white">
                        <CircleDollarSign size={20} className="text-brand-secondary" />
                        <span className="mt-1 text-[10px] font-bold text-brand-muted">Revenue</span>
                      </span>
                    </span>
                    <p className="mt-5 text-2xl font-black tracking-tight text-brand-forest">Rp{(metrics?.revenue ?? 0).toLocaleString("id-ID")}</p>
                    <p className="mt-1 text-xs text-brand-muted">Dari pesanan berstatus diterima ke atas</p>
                  </div>
                </article>
              </section>

              <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.55fr)]">
                <article className="overflow-hidden rounded-[24px] border border-brand-border/80 bg-white shadow-[0_18px_48px_-38px_rgba(18,61,43,0.45)]">
                  <div className="flex items-center justify-between border-b border-brand-border px-5 py-4 sm:px-6">
                    <div><p className="text-[11px] font-black uppercase tracking-[0.14em] text-brand-secondary">Transaksi terbaru</p><h2 className="mt-1 text-lg font-black text-stone-900">Pesanan terkini</h2></div>
                    <Link href="/admin/orders" className="flex items-center gap-1 text-xs font-black text-brand-forest">Semua pesanan <ChevronRight size={14} /></Link>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead><tr className="border-b border-brand-border bg-brand-cream/50 text-[10px] uppercase tracking-[0.12em] text-brand-muted"><th className="px-5 py-3 font-black">Pesanan</th><th className="px-4 py-3 font-black">Pelanggan</th><th className="px-4 py-3 font-black">Status</th><th className="px-5 py-3 text-right font-black">Total</th></tr></thead>
                      <tbody>
                        {filteredOrders.map((order) => (
                          <tr key={order.id} className="border-b border-brand-border/70 last:border-0 hover:bg-brand-cream/30">
                            <td className="px-5 py-4"><p className="text-sm font-black text-stone-800">{order.order_number}</p><p className="mt-1 text-[11px] text-brand-muted">{order.merchant?.store_name ?? "Toko tidak tersedia"}</p></td>
                            <td className="px-4 py-4 text-sm text-stone-700">{order.user?.name ?? "-"}</td>
                            <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${order.status === "cancelled" ? "bg-red-50 text-red-700" : order.status === "completed" ? "bg-emerald-100 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>{statusLabels[order.status] ?? order.status}</span></td>
                            <td className="px-5 py-4 text-right text-sm font-black text-brand-forest">Rp{Number(order.total_amount).toLocaleString("id-ID")}</td>
                          </tr>
                        ))}
                        {filteredOrders.length === 0 && <tr><td colSpan={4} className="px-5 py-12 text-center text-sm text-brand-muted">Tidak ada pesanan yang cocok.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </article>

                <article className="rounded-[24px] border border-brand-border/80 bg-white p-5 shadow-[0_18px_48px_-38px_rgba(18,61,43,0.45)] sm:p-6">
                  <div className="flex items-center justify-between"><div><p className="text-[11px] font-black uppercase tracking-[0.14em] text-brand-secondary">Marketplace</p><h2 className="mt-1 text-lg font-black text-stone-900">Toko terbaru</h2></div><Store size={18} className="text-brand-secondary" /></div>
                  <div className="mt-4 space-y-2">
                    {dashboard.recent_stores.map((store) => (
                      <Link key={store.id} href="/admin/merchant-stores" className="flex items-center gap-3 rounded-2xl border border-transparent p-2.5 transition hover:border-brand-border hover:bg-brand-cream/50">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-forest"><Store size={17} /></span>
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-stone-800">{store.store_name}</span><span className="mt-0.5 block truncate text-[11px] text-brand-muted">{store.user?.name ?? "Pemilik tidak tersedia"}</span></span>
                        <span className={`size-2 shrink-0 rounded-full ${store.is_verified ? "bg-emerald-500" : store.rejected_at ? "bg-red-400" : "bg-amber-400"}`} />
                      </Link>
                    ))}
                    {dashboard.recent_stores.length === 0 && <p className="py-8 text-center text-sm text-brand-muted">Belum ada toko terdaftar.</p>}
                  </div>
                  <Link href="/admin/merchant-stores" className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-brand-border py-3 text-xs font-black text-brand-forest hover:bg-brand-cream">Kelola verifikasi toko <ChevronRight size={14} /></Link>
                </article>
              </section>
            </>
          )}
        </div>
      </main>
    </>
  );
}
