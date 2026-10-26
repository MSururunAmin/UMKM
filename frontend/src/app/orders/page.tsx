"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, PackageCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";

type CustomerOrder = {
  id: number;
  order_number: string;
  status: string;
  is_test: boolean;
  total_amount: string | number;
  shipping_type: "delivery" | "pickup";
  created_at: string;
  merchant: { store_name: string };
  items: { id: number; quantity: number; product: { name: string } }[];
};

const statusLabels: Record<string, string> = {
  pending: "Menunggu pembayaran",
  paid: "Pembayaran diterima",
  processing: "Sedang disiapkan",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export default function CustomerOrdersPage() {
  const token = useAuthStore((state) => state.token);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    try {
      const { data } = await api.get<{ data: CustomerOrder[] }>("/customer/orders");
      setOrders(data.data);
      setError("");
    } catch {
      setError("Pesanan belum dapat dimuat. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated || !token) return;
    const initialLoad = window.setTimeout(() => void loadOrders(), 0);
    const interval = window.setInterval(() => void loadOrders(), 20000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [isHydrated, token, loadOrders]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-secondary">Aktivitas belanjamu</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900">Pesanan saya</h1>
        <p className="mt-2 text-sm text-brand-muted">Pantau proses pesanan dan hubungi penjual langsung dari detailnya.</p>
        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {loading && token ? <p className="mt-8 text-sm text-brand-muted">Memuat pesanan...</p> : !token && isHydrated ? (
          <p className="mt-8 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Silakan <Link href="/login" className="font-bold underline">masuk</Link> untuk melihat daftar pesanan.</p>
        ) : orders.length === 0 ? (
          <section className="mt-8 rounded-3xl border border-brand-border bg-white p-8 text-center shadow-sm">
            <PackageCheck className="mx-auto text-brand-secondary" size={32} />
            <h2 className="mt-3 font-bold text-stone-900">Belum ada pesanan</h2>
            <p className="mt-1 text-sm text-brand-muted">Pesananmu akan muncul di sini setelah checkout.</p>
            <Link href="/products" className="mt-5 inline-flex rounded-full bg-brand-forest px-5 py-3 text-sm font-bold text-white hover:bg-brand-secondary">Jelajahi menu</Link>
          </section>
        ) : (
          <div className="mt-7 space-y-4">
            {orders.map((order) => (
              <article key={order.id} className="rounded-3xl border border-brand-border bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-stone-900">{order.merchant.store_name}</p>
                    <p className="mt-1 text-xs text-brand-muted">{order.order_number} · {new Date(order.created_at).toLocaleDateString("id-ID")}</p>
                    {order.is_test && <p className="mt-2 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900">Pesanan uji · belum dibayar</p>}
                  </div>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${order.status === "cancelled" ? "bg-red-50 text-red-700" : order.status === "completed" ? "bg-emerald-100 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>
                    {statusLabels[order.status] ?? order.status}
                  </span>
                </div>
                <p className="mt-4 text-sm text-stone-700">{order.items.map((item) => `${item.product.name} × ${item.quantity}`).join(", ")}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-brand-border pt-4">
                  <span className="text-sm font-semibold text-brand-forest">Rp{Number(order.total_amount).toLocaleString("id-ID")}</span>
                  <Link href={`/orders/${order.id}`} className="inline-flex items-center gap-2 rounded-full border border-brand-border px-4 py-2.5 text-sm font-bold text-brand-forest transition hover:bg-emerald-50">
                    <MessageCircle size={16} /> Lacak & chat penjual
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
