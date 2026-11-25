"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";

type CustomerOrder = {
  id: number;
  order_number: string;
};

export default function PaymentFinishPage() {
  return (
    <Suspense fallback={<><SiteHeader /><main className="mx-auto w-full max-w-2xl flex-1 px-5 py-16 text-center text-brand-muted">Memuat detail pembayaran...</main></>}>
      <PaymentFinish />
    </Suspense>
  );
}

function PaymentFinish() {
  const token = useAuthStore((state) => state.token);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order_id");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isHydrated || !token || !orderNumber) return;

    let cancelled = false;
    void api.get<{ data: CustomerOrder[] }>("/customer/orders")
      .then(({ data }) => {
        if (cancelled) return;
        const order = data.data.find((item) => item.order_number === orderNumber);
        if (order) {
          const returnUrl = sessionStorage.getItem("umkm_payment_return_url");
          sessionStorage.removeItem("umkm_payment_return_url");
          router.replace(returnUrl && returnUrl.startsWith("/") && !returnUrl.startsWith("//")
            ? returnUrl
            : `/orders/${order.id}`);
        } else {
          setError("Pesanan belum ditemukan. Silakan periksa daftar pesanan beberapa saat lagi.");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Status pembayaran belum dapat dimuat. Silakan buka daftar pesanan.");
      });

    return () => {
      cancelled = true;
    };
  }, [isHydrated, token, orderNumber, router]);

  const message = !isHydrated
    ? "Memuat sesi..."
    : !token
      ? "Silakan masuk untuk melihat status pesanan setelah pembayaran."
      : !orderNumber
        ? "Nomor pesanan tidak ditemukan. Periksa status melalui daftar pesanan."
        : error || "Mengambil detail pesanan...";

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-16 sm:px-8">
        <section className="rounded-3xl border border-brand-border/80 bg-white p-8 text-center shadow-[0_22px_60px_-40px_rgba(18,61,43,0.45)]">
          <h1 className="text-2xl font-black text-stone-900">Kembali ke Rasa Lokal</h1>
          <p role="status" className="mt-3 text-sm leading-6 text-brand-muted">{message}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {isHydrated && !token && (
              <Link href="/login" className="rounded-full bg-brand-forest px-5 py-3 text-sm font-bold text-white hover:bg-brand-secondary">
                Masuk
              </Link>
            )}
            <Link href="/orders" className="rounded-full border border-brand-border px-5 py-3 text-sm font-bold text-brand-forest hover:bg-emerald-50">
              Lihat pesanan
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
