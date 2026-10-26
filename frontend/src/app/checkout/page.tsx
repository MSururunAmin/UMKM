"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, MapPin, Store } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    snap?: { pay: (token: string, options?: { onSuccess?: () => void; onPending?: () => void }) => void };
  }
}

export default function CheckoutPage() {
  const [shippingType, setShippingType] = useState("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { items, clear } = useCartStore();
  const token = useAuthStore((state) => state.token);
  const router = useRouter();
  const total = items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
    if (!key || document.getElementById("midtrans-snap")) return;
    const script = document.createElement("script");
    script.id = "midtrans-snap";
    script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
    script.dataset.clientKey = key;
    document.body.appendChild(script);
  }, []);

  const pay = async () => {
    if (!token) return router.push("/login");
    if (shippingType === "delivery" && !deliveryAddress.trim()) {
      setError("Masukkan alamat lengkap untuk pengantaran.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await api.post<{ data: { id: number }; snap_token: string }>("/customer/orders", {
        shipping_type: shippingType,
        delivery_address: shippingType === "delivery" ? deliveryAddress.trim() : null,
        items: items.map((item) => ({ product_id: item.id, quantity: item.quantity })),
      });
      if (!window.snap) throw new Error("Midtrans Snap belum dimuat. Tambahkan NEXT_PUBLIC_MIDTRANS_CLIENT_KEY.");
      const openOrder = () => {
        clear();
        router.push(`/orders/${result.data.data.id}`);
      };
      window.snap.pay(result.data.snap_token, { onSuccess: openOrder, onPending: openOrder });
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : "Pembayaran gagal diproses.");
    } finally {
      setLoading(false);
    }
  };

  const createTestOrder = async () => {
    if (!token) return router.push("/login");
    if (shippingType === "delivery" && !deliveryAddress.trim()) {
      setError("Masukkan alamat lengkap untuk pengantaran.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { data } = await api.post<{ data: { id: number } }>("/customer/orders/test", {
        shipping_type: shippingType,
        delivery_address: shippingType === "delivery" ? deliveryAddress.trim() : null,
        items: items.map((item) => ({ product_id: item.id, quantity: item.quantity })),
      });
      clear();
      router.push(`/orders/${data.data.id}`);
    } catch (orderError) {
      setError(orderError instanceof Error ? orderError.message : "Pesanan uji gagal dibuat.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-secondary">Satu langkah lagi</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900">Selesaikan pesananmu</h1>
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_360px]">
          <section className="rounded-3xl border border-brand-border bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold text-stone-900">Metode penerimaan</h2>
            <p className="mt-1 text-sm text-brand-muted">Pilih cara menerima pesanan dari penjual.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button type="button" aria-pressed={shippingType === "pickup"} onClick={() => setShippingType("pickup")} className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${shippingType === "pickup" ? "border-brand-secondary bg-emerald-50 ring-2 ring-brand-light" : "border-brand-border hover:bg-brand-cream"}`}>
                <span className={`mt-0.5 flex size-5 items-center justify-center rounded-full border ${shippingType === "pickup" ? "border-brand-forest bg-brand-forest text-white" : "border-stone-300 text-transparent"}`}><Check size={13} /></span>
                <span><span className="flex items-center gap-2 font-bold text-stone-900"><Store size={16} className="text-brand-secondary" /> Ambil di toko</span><span className="mt-1 block text-xs leading-5 text-brand-muted">Ambil pesanan langsung dari penjual.</span></span>
              </button>
              <button type="button" aria-pressed={shippingType === "delivery"} onClick={() => setShippingType("delivery")} className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${shippingType === "delivery" ? "border-brand-secondary bg-emerald-50 ring-2 ring-brand-light" : "border-brand-border hover:bg-brand-cream"}`}>
                <span className={`mt-0.5 flex size-5 items-center justify-center rounded-full border ${shippingType === "delivery" ? "border-brand-forest bg-brand-forest text-white" : "border-stone-300 text-transparent"}`}><Check size={13} /></span>
                <span><span className="flex items-center gap-2 font-bold text-stone-900"><MapPin size={16} className="text-brand-secondary" /> Diantar</span><span className="mt-1 block text-xs leading-5 text-brand-muted">Atur detail pengantaran bersama penjual.</span></span>
              </button>
            </div>
            {shippingType === "delivery" && (
              <div className="mt-5">
                <label htmlFor="delivery-address" className="mb-1.5 block text-sm font-semibold text-stone-800">Alamat lengkap pengantaran</label>
                <textarea
                  id="delivery-address"
                  value={deliveryAddress}
                  onChange={(event) => setDeliveryAddress(event.target.value)}
                  maxLength={2000}
                  required
                  rows={4}
                  placeholder="Contoh: Jl. Gajah Mada No. 91, Pekauman, Tegal Barat, Kota Tegal. Tambahkan patokan atau nomor rumah."
                  className="w-full rounded-control border border-brand-border bg-white px-3 py-2 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-brand-secondary focus:ring-2 focus:ring-brand-light"
                />
                <p className="mt-1 text-xs text-brand-muted">Cantumkan jalan, nomor rumah, kelurahan, kecamatan, kota, dan patokan jika ada.</p>
              </div>
            )}
            <p className="mt-7 text-sm font-bold text-stone-900">Ringkasan menu</p>
            <div className="mt-3 divide-y divide-brand-border">
              {items.map((item) => <div key={item.id} className="flex items-start justify-between gap-4 py-3 text-sm"><span className="min-w-0"><span className="block truncate font-semibold text-stone-800">{item.name}</span><span className="text-brand-muted">{item.quantity} × Rp{Number(item.price).toLocaleString("id-ID")}</span></span><span className="shrink-0 font-semibold text-stone-800">Rp{(Number(item.price) * item.quantity).toLocaleString("id-ID")}</span></div>)}
              {items.length === 0 && <p className="py-4 text-sm text-brand-muted">Belum ada menu di keranjang.</p>}
            </div>
          </section>
          <aside className="rounded-3xl border border-brand-border bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-24">
            <h2 className="text-lg font-bold text-stone-900">Total pembayaran</h2>
            <div className="mt-4 flex items-center justify-between text-sm text-brand-muted"><span>{items.length} jenis menu</span><span>Rp{total.toLocaleString("id-ID")}</span></div>
            <div className="my-4 border-t border-brand-border" />
            <div className="flex items-center justify-between font-bold text-stone-900"><span>Total</span><span className="text-xl text-brand-forest">Rp{total.toLocaleString("id-ID")}</span></div>
            <p className="mt-3 text-xs leading-5 text-brand-muted">Biaya pengiriman, jika ada, dikonfirmasi bersama penjual.</p>
            {error && <p role="alert" className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <Button disabled={!items.length || loading} onClick={pay} size="lg" className="mt-5 w-full">{loading ? "Memproses..." : "Bayar dengan Midtrans"}</Button>
            {process.env.NODE_ENV === "development" && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs leading-5 text-amber-900">Mode development: pesanan uji tidak memproses pembayaran dan tidak mengurangi stok.</p>
                <Button disabled={!items.length || loading} onClick={() => void createTestOrder()} variant="outline" size="lg" className="mt-3 w-full border-amber-300 text-amber-950 hover:bg-amber-100">
                  {loading ? "Membuat pesanan..." : "Buat pesanan uji"}
                </Button>
              </div>
            )}
            {!token && <p className="mt-3 text-center text-xs text-brand-muted">Kamu akan diminta masuk sebelum membayar.</p>}
          </aside>
        </div>
      </main>
    </>
  );
}
