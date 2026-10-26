<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class MidtransSnapService
{
    public function createToken(Order $order): string
    {
        $serverKey = config('services.midtrans.server_key');
        if (! $serverKey) throw new RuntimeException('MIDTRANS_SERVER_KEY has not been configured.');
        $baseUrl = config('services.midtrans.is_production') ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com';
        $response = Http::withBasicAuth($serverKey, '')->post($baseUrl.'/snap/v1/transactions', [
            'transaction_details' => ['order_id' => $order->order_number, 'gross_amount' => (int) $order->total_amount],
            'customer_details' => ['first_name' => $order->user->name, 'email' => $order->user->email, 'phone' => $order->user->phone],
            'item_details' => $order->items->map(fn ($item) => ['id' => (string) $item->product_id, 'price' => (int) $item->price, 'quantity' => $item->quantity, 'name' => $item->product->name])->values()->all(),
        ]);
        if ($response->failed() || ! $response->json('token')) throw new RuntimeException($response->json('error_messages.0') ?? 'Unable to create Midtrans payment token.');
        return $response->json('token');
    }
}
