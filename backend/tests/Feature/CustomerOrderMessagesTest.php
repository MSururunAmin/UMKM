<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CustomerOrderMessagesTest extends TestCase
{
    use DatabaseTransactions;

    public function test_order_participants_can_chat_and_other_customers_cannot_read_messages(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);
        $merchantUser = User::factory()->create(['role' => 'merchant']);
        $merchant = $merchantUser->merchant()->create([
            'store_name' => 'Dapur Lokal',
            'slug' => 'dapur-lokal',
            'address' => 'Kota Tegal',
        ]);
        $merchant->forceFill(['is_verified' => true])->save();
        $order = $customer->orders()->create([
            'order_number' => 'RSL-TEST-001',
            'merchant_id' => $merchant->id,
            'total_amount' => 25000,
            'shipping_type' => 'pickup',
        ]);

        Sanctum::actingAs($customer);
        $this->getJson('/api/v1/customer/orders')
            ->assertOk()
            ->assertJsonPath('data.0.order_number', $order->order_number);
        $this->postJson("/api/v1/orders/{$order->id}/messages", ['message' => 'Pesanan saya kapan siap?'])
            ->assertCreated()
            ->assertJsonPath('data.message', 'Pesanan saya kapan siap?');

        Sanctum::actingAs($merchantUser);
        $this->getJson("/api/v1/orders/{$order->id}/messages")
            ->assertOk()
            ->assertJsonPath('data.0.user.name', $customer->name);
        $this->postJson("/api/v1/orders/{$order->id}/messages", ['message' => 'Sedang kami siapkan.'])
            ->assertCreated();

        Sanctum::actingAs(User::factory()->create(['role' => 'customer']));
        $this->getJson("/api/v1/orders/{$order->id}/messages")->assertNotFound();
    }
}
