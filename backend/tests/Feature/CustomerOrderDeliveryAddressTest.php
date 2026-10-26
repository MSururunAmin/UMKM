<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CustomerOrderDeliveryAddressTest extends TestCase
{
    use DatabaseTransactions;

    public function test_delivery_orders_require_an_address_but_pickup_orders_do_not(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'customer']));

        $this->postJson('/api/v1/customer/orders', [
            'shipping_type' => 'delivery',
            'items' => [],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['delivery_address']);

        $this->postJson('/api/v1/customer/orders', [
            'shipping_type' => 'pickup',
            'items' => [],
        ])->assertUnprocessable()
            ->assertJsonMissingValidationErrors(['delivery_address']);
    }
}
