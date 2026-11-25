import Link from "next/link";
import { MessageCircle } from "lucide-react";
import type { MerchantOrder } from "./types";

type IncomingOrdersProps = {
  orders: MerchantOrder[];
  onStatusChange: (order: MerchantOrder, status: string) => void;
};

export function IncomingOrders({ orders, onStatusChange }: IncomingOrdersProps) {
  return (
    <section id="pesanan-masuk" className="scroll-mt-24 rounded-2xl border border-brand-border/80 bg-white p-5 shadow-[0_18px_48px_-38px_rgba(18,61,43,0.42)] sm:p-6">
      <h2 className="text-xl font-bold">Pesanan masuk</h2>
      <p className="mt-1 text-xs text-brand-muted">Pesanan dan status diperbarui otomatis setiap 5 detik saat halaman ini aktif.</p>
      {orders.length === 0 ? <p className="mt-4 text-sm text-stone-500">Belum ada pesanan masuk.</p> : orders.map((order) => (
        <div key={order.id} className="mt-3 flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <span className="min-w-0">
            <b>{order.order_number}</b>
            <small className="block text-stone-500">{order.user.name} · Rp{Number(order.total_amount).toLocaleString("id-ID")} · {order.shipping_type === "delivery" ? "Diantar" : "Ambil di toko"}</small>
            {order.is_test && <small className="mt-1 block font-semibold text-amber-800">Pesanan uji · belum dibayar</small>}
            {order.shipping_type === "delivery" && order.delivery_address && <small className="mt-1 block max-w-xl whitespace-pre-wrap text-stone-600">Alamat: {order.delivery_address}</small>}
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <select value={order.status} onChange={(event) => onStatusChange(order, event.target.value)} aria-label={`Status pesanan ${order.order_number}`} className="rounded-control border border-brand-border bg-white p-2 text-sm outline-none focus:border-brand-secondary focus:ring-2 focus:ring-brand-light">
              <option value="pending">Pending</option>
              <option value="processing">Diproses</option>
              <option value="completed">Selesai</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
            <Link
              href={`/orders/${order.id}`}
              aria-label={`Buka pesan untuk pesanan ${order.order_number}`}
              title="Chat dengan pembeli"
              className="flex size-10 items-center justify-center rounded-xl border border-brand-border bg-white text-brand-forest transition hover:border-brand-secondary hover:bg-brand-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary"
            >
              <MessageCircle size={18} />
            </Link>
          </div>
        </div>
      ))}
    </section>
  );
}
