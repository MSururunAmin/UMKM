<?php

namespace App\Http\Controllers\Api\V1\Payment;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MidtransNotificationController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order_id' => ['required', 'string'],
            'status_code' => ['required'],
            'gross_amount' => ['required', 'numeric'],
            'signature_key' => ['required', 'string'],
            'transaction_status' => ['required', 'string'],
            'fraud_status' => ['nullable', 'string'],
        ]);

        $serverKey = config('services.midtrans.server_key');
        if (! $serverKey) {
            return response()->json(['message' => 'Payment notification is not configured.'], 503);
        }

        $signature = hash(
            'sha512',
            $data['order_id'].$data['status_code'].$data['gross_amount'].$serverKey,
        );
        if (! hash_equals($signature, $data['signature_key'])) {
            return response()->json(['message' => 'Invalid payment signature.'], 403);
        }

        $order = Order::query()->where('order_number', $data['order_id'])->first();
        if (! $order) {
            return response()->json(['message' => 'Order not found.'], 404);
        }

        if (number_format((float) $data['gross_amount'], 2, '.', '') !== number_format((float) $order->total_amount, 2, '.', '')) {
            return response()->json(['message' => 'Payment amount does not match the order.'], 422);
        }

        DB::transaction(function () use ($data, $order): void {
            $lockedOrder = Order::query()->lockForUpdate()->findOrFail($order->id);
            if ($lockedOrder->status !== 'pending') {
                return;
            }

            $nextStatus = match ($data['transaction_status']) {
                'settlement' => 'paid',
                'capture' => ($data['fraud_status'] ?? null) === 'accept' ? 'paid' : null,
                'deny', 'cancel', 'expire' => 'cancelled',
                default => null,
            };

            if ($nextStatus === null) {
                return;
            }

            if ($nextStatus === 'cancelled') {
                foreach ($lockedOrder->items as $item) {
                    Product::query()->whereKey($item->product_id)->increment('stock', $item->quantity);
                }
            }

            $lockedOrder->update(['status' => $nextStatus]);
        });

        return response()->json(['message' => 'Notification processed.']);
    }
}
