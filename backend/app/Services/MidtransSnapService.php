<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class MidtransSnapService
{
    public function createTransaction(Order $order): array
    {
        $serverKey = config('services.midtrans.server_key');
        if (! $serverKey) {
            throw new RuntimeException('MIDTRANS_SERVER_KEY has not been configured.');
        }
        $isProduction = (bool) config('services.midtrans.is_production');
        $hasSandboxKey = str_starts_with($serverKey, 'SB-Mid-server-');
        $hasProductionKey = str_starts_with($serverKey, 'Mid-server-');
        if (($isProduction && $hasSandboxKey) || (! $isProduction && $hasProductionKey)) {
            $environment = $isProduction ? 'production' : 'sandbox';
            throw new RuntimeException("The configured Midtrans server key does not match the selected {$environment} environment.");
        }

        $baseUrl = $isProduction ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com';
        $frontendUrl = rtrim((string) config('services.midtrans.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');
        $response = Http::withBasicAuth($serverKey, '')->post($baseUrl.'/snap/v1/transactions', [
            'transaction_details' => ['order_id' => $order->order_number, 'gross_amount' => (int) $order->total_amount],
            'customer_details' => ['first_name' => $order->user->name, 'email' => $order->user->email, 'phone' => $order->user->phone],
            'item_details' => $order->items->map(fn ($item) => ['id' => (string) $item->product_id, 'price' => (int) $item->price, 'quantity' => $item->quantity, 'name' => $item->product->name])->values()->all(),
            'callbacks' => [
                'finish' => $frontendUrl.'/payment/finish',
                'unfinish' => $frontendUrl.'/payment/finish',
                'error' => $frontendUrl.'/payment/finish',
            ],
        ]);
        if ($response->failed() || ! $response->json('token') || ! $response->json('redirect_url')) {
            throw new RuntimeException($response->json('error_messages.0') ?? 'Unable to create Midtrans payment page.');
        }

        return [
            'token' => $response->json('token'),
            'redirect_url' => $response->json('redirect_url'),
        ];
    }
}
