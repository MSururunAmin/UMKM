"use client";

import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, Circle, Send } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";

type Order = {
  id: number;
  order_number: string;
  status: string;
  is_test: boolean;
  total_amount: string | number;
  shipping_type: "delivery" | "pickup";
  delivery_address: string | null;
  merchant: { store_name: string };
  user?: { id: number };
};

type OrderMessage = {
  id: number;
  message: string;
  created_at: string;
  user: { id: number; name: string };
};

const progress = [
  { status: "pending", label: "Pesanan dibuat" },
  { status: "paid", label: "Pembayaran diterima" },
  { status: "processing", label: "Sedang disiapkan" },
  { status: "completed", label: "Selesai" },
];

const statusLabels: Record<string, string> = {
  pending: "Menunggu pembayaran",
  paid: "Pembayaran diterima",
  processing: "Sedang disiapkan penjual",
  completed: "Pesanan selesai",
  cancelled: "Pesanan dibatalkan",
};

export default function OrderDetailPage() {
  return (
    <Suspense fallback={<><SiteHeader /><main className="mx-auto w-full max-w-5xl flex-1 px-5 py-20 text-center text-brand-muted">Memuat pesanan...</main></>}>
      <OrderDetail />
    </Suspense>
  );
}

function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const [order, setOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const loadOrder = useCallback(async () => {
    if (!user || !id) return;
    try {
      if (user.role.toLowerCase() === "merchant") {
        const response = await api.get<{ data: Order[] }>("/merchant/orders");
        setOrder(response.data.data.find((item) => item.id === Number(id)) ?? null);
      } else {
        const response = await api.get<{ data: Order[] }>("/customer/orders");
        setOrder(response.data.data.find((item) => item.id === Number(id)) ?? null);
      }
    } catch {
      setError("Detail pesanan belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  const loadMessages = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await api.get<{ data: OrderMessage[] }>(`/orders/${id}/messages`);
      setMessages(data.data);
      setError("");
    } catch {
      setError("Chat belum dapat dimuat. Pastikan pesanan ini milikmu atau tokomu.");
    }
  }, [id]);

  useEffect(() => {
    if (!isHydrated || !token) return;
    const initialLoad = window.setTimeout(() => {
      void loadOrder();
      void loadMessages();
    }, 0);
    const interval = window.setInterval(() => {
      void loadOrder();
      void loadMessages();
    }, 10000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [isHydrated, token, loadOrder, loadMessages]);

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || sending) return;
    setSending(true);
    setError("");
    try {
      const { data } = await api.post<{ data: OrderMessage }>(`/orders/${id}/messages`, { message });
      setMessages((current) => [...current, data.data]);
      setDraft("");
    } catch {
      setError("Pesan gagal dikirim. Silakan coba lagi.");
    } finally {
      setSending(false);
    }
  };

  const isMerchant = Boolean(user?.merchant?.is_verified && !user.merchant.rejected_at);
  const currentStep = order ? progress.findIndex((step) => step.status === order.status) : -1;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
        <Link href={isMerchant ? "/merchant/dashboard" : "/orders"} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-forest hover:text-brand-secondary"><ArrowLeft size={16} /> Kembali ke {isMerchant ? "dashboard" : "pesanan saya"}</Link>
        {!isHydrated ? <p className="mt-8 text-sm text-brand-muted">Memuat sesi...</p> : !token ? (
          <p className="mt-8 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Silakan <Link href="/login" className="font-bold underline">masuk</Link> untuk melihat pesanan dan chat.</p>
        ) : loading ? <p className="mt-8 text-sm text-brand-muted">Memuat pesanan...</p> : !order ? (
          <p role="alert" className="mt-8 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Pesanan tidak ditemukan atau kamu tidak memiliki akses.</p>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-secondary">Pesanan {order.order_number}</p><h1 className="mt-1 text-3xl font-black tracking-tight text-stone-900">{order.merchant.store_name}</h1></div>
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-bold text-brand-forest">{statusLabels[order.status] ?? order.status}</span>
            </div>
            {order.is_test && <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Ini pesanan uji. Pembayaran tidak diproses dan stok tidak dikurangi.</p>}
            <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <section className="rounded-3xl border border-brand-border bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-bold text-stone-900">Status pesanan</h2>
                {order.status === "cancelled" ? (
                  <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">Pesanan ini dibatalkan.</p>
                ) : (
                  <ol className="mt-5 space-y-5">
                    {progress.map((step, index) => {
                      const reached = index <= currentStep;
                      return (
                        <li key={step.status} className="flex items-center gap-3">
                          <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${reached ? "bg-brand-forest text-white" : "bg-stone-100 text-stone-400"}`}>
                            {reached ? <Check size={16} /> : <Circle size={14} />}
                          </span>
                          <span className={`text-sm ${reached ? "font-semibold text-brand-forest" : "text-brand-muted"}`}>{step.label}</span>
                        </li>
                      );
                    })}
                  </ol>
                )}
                <div className="mt-6 border-t border-brand-border pt-4 text-sm">
                  <p className="text-brand-muted">{order.shipping_type === "delivery" ? "Diantar ke" : "Pengambilan di toko"}</p>
                  {order.delivery_address && <p className="mt-1 whitespace-pre-wrap font-medium text-stone-800">{order.delivery_address}</p>}
                  <p className="mt-3 font-bold text-brand-forest">Total Rp{Number(order.total_amount).toLocaleString("id-ID")}</p>
                </div>
              </section>
              <section className="flex min-h-[28rem] flex-col rounded-3xl border border-brand-border bg-white p-5 shadow-sm sm:p-6">
                <div className="border-b border-brand-border pb-4">
                  <h2 className="text-lg font-bold text-stone-900">Chat dengan {isMerchant ? "pembeli" : "penjual"}</h2>
                  <p className="mt-1 text-xs text-brand-muted">Percakapan terkait pesanan ini.</p>
                </div>
                <div aria-live="polite" className="flex-1 space-y-3 overflow-y-auto py-4">
                  {messages.length === 0 && <p className="py-8 text-center text-sm text-brand-muted">Belum ada pesan. Mulai percakapan dengan penjual.</p>}
                  {messages.map((message) => {
                    const mine = message.user.id === user?.id;
                    return (
                      <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${mine ? "bg-brand-forest text-white" : "bg-brand-cream text-stone-800"}`}>
                          <p className={`mb-1 text-[11px] font-bold ${mine ? "text-emerald-100" : "text-brand-secondary"}`}>{mine ? "Kamu" : message.user.name}</p>
                          <p className="whitespace-pre-wrap break-words text-sm">{message.message}</p>
                          <time className={`mt-1 block text-right text-[10px] ${mine ? "text-emerald-100/80" : "text-brand-muted"}`}>{new Date(message.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</time>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <form onSubmit={(event) => void sendMessage(event)} className="flex items-end gap-2 border-t border-brand-border pt-4">
                  <label htmlFor="order-message" className="sr-only">Tulis pesan</label>
                  <textarea id="order-message" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} rows={2} required placeholder="Tulis pesan..." className="min-h-12 flex-1 resize-y rounded-xl border border-brand-border px-3 py-2.5 text-sm outline-none focus:border-brand-secondary focus:ring-2 focus:ring-brand-light" />
                  <Button type="submit" disabled={!draft.trim() || sending} aria-label="Kirim pesan" className="size-12 shrink-0 px-0"><Send size={17} /></Button>
                </form>
              </section>
            </div>
          </>
        )}
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </main>
    </>
  );
}
