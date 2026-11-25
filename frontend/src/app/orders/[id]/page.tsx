"use client";

import { FormEvent, Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, Circle, MapPin, RefreshCw, Send, Store, WalletCards } from "lucide-react";
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
  const [isMerchantOrder, setIsMerchantOrder] = useState(false);
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const isLoadingOrder = useRef(false);
  const isLoadingMessages = useRef(false);

  const loadOrder = useCallback(async () => {
    if (!user || !id || isLoadingOrder.current) return;
    isLoadingOrder.current = true;
    try {
      let foundOrder: Order | undefined;
      if (user.role.toLowerCase() === "merchant" && user.merchant?.is_verified && !user.merchant.rejected_at) {
        const response = await api.get<{ data: Order[] }>("/merchant/orders");
        foundOrder = response.data.data.find((item) => item.id === Number(id));
        setIsMerchantOrder(Boolean(foundOrder));
      }

      if (!foundOrder) {
        const response = await api.get<{ data: Order[] }>("/customer/orders");
        foundOrder = response.data.data.find((item) => item.id === Number(id));
        setIsMerchantOrder(false);
      }
      setOrder(foundOrder ?? null);
    } catch {
      setError("Detail pesanan belum dapat dimuat.");
    } finally {
      isLoadingOrder.current = false;
      setLoading(false);
    }
  }, [id, user]);

  const loadMessages = useCallback(async () => {
    if (!id || isLoadingMessages.current) return;
    isLoadingMessages.current = true;
    try {
      const { data } = await api.get<{ data: OrderMessage[] }>(`/orders/${id}/messages`);
      setMessages(data.data);
      setError("");
    } catch {
      setError("Chat belum dapat dimuat. Pastikan pesanan ini milikmu atau tokomu.");
    } finally {
      isLoadingMessages.current = false;
    }
  }, [id]);

  useEffect(() => {
    if (!isHydrated || !token) return;
    const refreshWhenVisible = () => {
      if (document.visibilityState !== "visible") return;
      void loadOrder();
      void loadMessages();
    };
    const initialLoad = window.setTimeout(refreshWhenVisible, 0);
    const statusInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadOrder();
    }, 5000);
    const messagesInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadMessages();
    }, 10000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(statusInterval);
      window.clearInterval(messagesInterval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
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

  const currentStep = order ? progress.findIndex((step) => step.status === order.status) : -1;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
        <Link href={isMerchantOrder ? "/merchant/dashboard" : "/orders"} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-forest hover:text-brand-secondary"><ArrowLeft size={16} /> Kembali ke {isMerchantOrder ? "dashboard" : "pesanan saya"}</Link>
        {!isHydrated ? <p className="mt-8 text-sm text-brand-muted">Memuat sesi...</p> : !token ? (
          <p className="mt-8 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Silakan <Link href="/login" className="font-bold underline">masuk</Link> untuk melihat pesanan dan chat.</p>
        ) : loading ? <p className="mt-8 text-sm text-brand-muted">Memuat pesanan...</p> : !order ? (
          <p role="alert" className="mt-8 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Pesanan tidak ditemukan atau kamu tidak memiliki akses.</p>
        ) : (
          <>
            <section className="mt-5 overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#123d2b,#1e5538)] text-white shadow-[0_24px_70px_-38px_rgba(18,61,43,0.75)]">
              <div className="flex flex-col gap-5 px-5 py-6 sm:flex-row sm:items-end sm:justify-between sm:px-7 sm:py-7">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-200">Pesanan {order.order_number}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                      <Store size={20} />
                    </span>
                    <div>
                      <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{order.merchant.store_name}</h1>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-emerald-100/80">
                        <RefreshCw size={12} /> Status diperbarui otomatis
                      </p>
                    </div>
                  </div>
                </div>
                <span className={`self-start rounded-full px-4 py-2 text-xs font-bold ring-1 sm:self-auto ${order.status === "cancelled" ? "bg-red-500/15 text-red-100 ring-red-300/25" : "bg-white/10 text-white ring-white/20"}`}>
                  {statusLabels[order.status] ?? order.status}
                </span>
              </div>
            </section>
            {order.is_test && <p role="status" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">Ini pesanan uji. Pembayaran tidak diproses dan stok tidak dikurangi.</p>}
            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(280px,0.78fr)_minmax(420px,1.22fr)]">
              <aside className="space-y-6">
              <section className="rounded-[24px] border border-brand-border/80 bg-white p-5 shadow-[0_18px_48px_-38px_rgba(18,61,43,0.42)] sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-secondary">Perjalanan pesanan</p>
                    <h2 className="mt-1 text-lg font-black text-stone-900">Status pesanan</h2>
                  </div>
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-brand-light text-brand-forest">
                    <RefreshCw size={18} />
                  </span>
                </div>
                {order.status === "cancelled" ? (
                  <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">Pesanan ini dibatalkan.</p>
                ) : (
                  <ol className="mt-6 space-y-0">
                    {progress.map((step, index) => {
                      const reached = index <= currentStep;
                      const isLast = index === progress.length - 1;
                      return (
                        <li key={step.status} className="relative flex min-h-14 gap-3">
                          {!isLast && <span className={`absolute left-4 top-9 h-7 w-px ${reached ? "bg-brand-secondary" : "bg-brand-border"}`} />}
                          <span className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white ${reached ? "bg-brand-forest text-white" : "bg-stone-100 text-stone-400"}`}>
                            {reached ? <Check size={15} /> : <Circle size={12} />}
                          </span>
                          <div className="pt-1">
                            <span className={`block text-sm ${reached ? "font-bold text-brand-forest" : "font-medium text-brand-muted"}`}>{step.label}</span>
                            {reached && index === currentStep && <span className="mt-0.5 block text-[11px] text-brand-secondary">Tahap saat ini</span>}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>
              <section className="rounded-[24px] border border-brand-border/80 bg-white p-5 shadow-[0_18px_48px_-38px_rgba(18,61,43,0.42)] sm:p-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-secondary">Ringkasan</p>
                <div className="mt-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-cream text-brand-forest">
                      {order.shipping_type === "delivery" ? <MapPin size={17} /> : <Store size={17} />}
                    </span>
                    <div>
                      <p className="text-xs text-brand-muted">{order.shipping_type === "delivery" ? "Diantar ke" : "Pengambilan"}</p>
                      <p className="mt-0.5 text-sm font-bold text-stone-800">{order.shipping_type === "delivery" ? "Alamat pengantaran" : "Ambil di toko"}</p>
                      {order.delivery_address && <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-brand-muted">{order.delivery_address}</p>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-brand-border pt-4">
                    <span className="flex items-center gap-2 text-sm text-brand-muted"><WalletCards size={16} /> Total pembayaran</span>
                    <span className="text-lg font-black text-brand-forest">Rp{Number(order.total_amount).toLocaleString("id-ID")}</span>
                  </div>
                </div>
              </section>
              </aside>
              <section className="flex min-h-[32rem] flex-col overflow-hidden rounded-[24px] border border-brand-border/80 bg-white shadow-[0_18px_48px_-38px_rgba(18,61,43,0.42)]">
                <div className="flex items-center justify-between border-b border-brand-border px-5 py-4 sm:px-6">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-secondary">Pesan pesanan</p>
                    <h2 className="mt-1 text-lg font-black text-stone-900">Chat dengan {isMerchantOrder ? "pembeli" : "penjual"}</h2>
                  </div>
                  <span className="relative flex size-10 items-center justify-center rounded-full bg-brand-light text-brand-forest">
                    <span className="absolute right-0 top-0 size-2.5 rounded-full border-2 border-white bg-emerald-500" />
                    <Store size={17} />
                  </span>
                </div>
                <div aria-live="polite" className="flex-1 space-y-3 overflow-y-auto bg-[linear-gradient(180deg,#fbfcfa,#fff)] px-5 py-5 sm:px-6">
                  {messages.length === 0 && (
                    <div className="mx-auto mt-16 max-w-xs rounded-2xl border border-brand-border/70 bg-white px-5 py-6 text-center shadow-[0_16px_40px_-30px_rgba(18,61,43,0.45)]">
                      <span className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-brand-light text-brand-forest">
                        <Send size={18} />
                      </span>
                      <p className="mt-3 text-sm font-bold text-stone-800">Mulai percakapan</p>
                      <p className="mt-1 text-xs leading-5 text-brand-muted">Tanyakan detail pesanan atau konfirmasi pengambilan kepada {isMerchantOrder ? "pembeli" : "penjual"}.</p>
                    </div>
                  )}
                  {messages.map((message) => {
                    const mine = message.user.id === user?.id;
                    return (
                      <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${mine ? "rounded-br-md bg-brand-forest text-white" : "rounded-bl-md border border-brand-border/70 bg-white text-stone-800"}`}>
                          <p className={`mb-1 text-[11px] font-bold ${mine ? "text-emerald-100" : "text-brand-secondary"}`}>{mine ? "Kamu" : message.user.name}</p>
                          <p className="whitespace-pre-wrap break-words text-sm">{message.message}</p>
                          <time className={`mt-1 block text-right text-[10px] ${mine ? "text-emerald-100/80" : "text-brand-muted"}`}>{new Date(message.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</time>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <form onSubmit={(event) => void sendMessage(event)} className="flex items-end gap-2 border-t border-brand-border bg-white px-5 py-4 sm:px-6">
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
