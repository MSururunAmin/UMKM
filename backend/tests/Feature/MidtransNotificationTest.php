<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MidtransNotificationTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.midtrans.server_key' => 'test-server-key']);
    }

    public function test_a_valid_settlement_notification_marks_order_as_paid(): void
    {
        $order = $this->createOrder();

        $this->postJson('/api/v1/payments/midtrans/notification', $this->notification($order, 'settlement'))
            ->assertOk();

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'paid']);
    }

    public function test_invalid_signatures_and_amounts_do_not_change_order_status(): void
    {
        $order = $this->createOrder();
        $invalidSignature = $this->notification($order, 'settlement');
        $invalidSignature['signature_key'] = 'invalid';

        $this->postJson('/api/v1/payments/midtrans/notification', $invalidSignature)->assertForbidden();

        $wrongAmount = $this->notification($order, 'settlement', '25000.01');
        $this->postJson('/api/v1/payments/midtrans/notification', $wrongAmount)->assertUnprocessable();

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'pending']);
    }

    public function test_order_creation_rejects_a_production_server_key_in_sandbox_mode(): void
    {
        $order = $this->createOrder();
        config([
            'services.midtrans.server_key' => 'Mid-server-production-key',
            'services.midtrans.is_production' => false,
        ]);
        Http::fake();
        Sanctum::actingAs($order->user);

        $this->postJson('/api/v1/customer/orders', [
            'shipping_type' => 'pickup',
            'items' => [['product_id' => $order->items()->firstOrFail()->product_id, 'quantity' => 1]],
        ])
            ->assertServiceUnavailable()
            ->assertJsonPath('message', 'The configured Midtrans server key does not match the selected sandbox environment.');

        Http::assertNothingSent();
    }

    public function test_expired_payment_restores_stock_only_once_and_paid_orders_stay_paid(): void
    {
        $order = $this->createOrder();
        $product = Product::query()->findOrFail($order->items()->firstOrFail()->product_id);
        $notification = $this->notification($order, 'expire');

        $this->postJson('/api/v1/payments/midtrans/notification', $notification)->assertOk();
        $this->postJson('/api/v1/payments/midtrans/notification', $notification)->assertOk();
        $this->assertSame(3, $product->fresh()->stock);

        $paidOrder = $this->createOrder('RSL-TEST-PAID');
        $this->postJson('/api/v1/payments/midtrans/notification', $this->notification($paidOrder, 'settlement'))->assertOk();
        $this->postJson('/api/v1/payments/midtrans/notification', $this->notification($paidOrder, 'expire'))->assertOk();
        $this->assertDatabaseHas('orders', ['id' => $paidOrder->id, 'status' => 'paid']);
    }

    private function createOrder(string $orderNumber = 'RSL-TEST-001'): Order
    {
        $customer = User::factory()->create(['role' => 'customer']);
        $merchantUser = User::factory()->create(['role' => 'merchant']);
        $merchant = $merchantUser->merchant()->create([
            'store_name' => 'Dapur Lokal',
            'slug' => 'dapur-lokal-'.strtolower($orderNumber),
            'address' => 'Kota Tegal',
        ]);
        $category = Category::query()->create(['name' => 'Makanan', 'slug' => 'makanan-'.strtolower($orderNumber)]);
        $product = $merchant->products()->create([
            'category_id' => $category->id,
            'name' => 'Nasi',
            'slug' => 'nasi-'.strtolower($orderNumber),
            'description' => 'Nasi',
            'price' => 25000,
            'stock' => 2,
            'is_available' => true,
            'image_url' => 'nasi.jpg',
        ]);
        $order = $customer->orders()->create([
            'order_number' => $orderNumber,
            'merchant_id' => $merchant->id,
            'total_amount' => 25000,
            'shipping_type' => 'pickup',
        ]);
        $order->items()->create([
            'product_id' => $product->id,
            'quantity' => 1,
            'price' => 25000,
            'subtotal' => 25000,
        ]);

        return $order;
    }

    private function notification(Order $order, string $status, string $amount = '25000.00'): array
    {
        $data = [
            'order_id' => $order->order_number,
            'status_code' => '200',
            'gross_amount' => $amount,
            'transaction_status' => $status,
        ];
        $data['signature_key'] = hash(
            'sha512',
            $data['order_id'].$data['status_code'].$data['gross_amount'].config('services.midtrans.server_key'),
        );

        return $data;
    }
}
