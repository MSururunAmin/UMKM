<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Merchant;
use App\Models\Order;
use App\Models\User;
use GuzzleHttp\Exception\RequestException;
use GuzzleHttp\Psr7\Request;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SellerStoreRegistrationTest extends TestCase
{
    use DatabaseTransactions;

    private User $customer;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->customer = User::factory()->create(['role' => 'customer', 'phone' => null]);
        $this->admin = User::factory()->create(['role' => 'admin']);
    }

    public function test_customer_can_apply_using_their_existing_account_and_keep_customer_access(): void
    {
        Sanctum::actingAs($this->customer);
        $this->fakeCityTegalLocation();

        $this->getJson('/api/v1/seller/store')
            ->assertOk()
            ->assertJsonPath('data', null);

        $response = $this->postJson('/api/v1/seller/store', [
            'store_name' => 'Dapur Nusa',
            'description' => 'Masakan rumahan.',
            'address' => 'Jl. Nusantara No. 1',
            'phone' => '081234567890',
            ...$this->cityTegalFields(),
            'user_id' => 999999,
        ])->assertCreated()
            ->assertJsonPath('data.user.id', $this->customer->id)
            ->assertJsonPath('data.is_verified', false)
            ->assertJsonPath('data.rejected_at', null);

        $this->assertSame('customer', $this->customer->fresh()->role);
        $this->assertSame('081234567890', $this->customer->fresh()->phone);
        $this->assertSame($this->customer->id, $response->json('data.user_id'));
        $this->assertSame(1, Merchant::where('user_id', $this->customer->id)->count());

        $this->postJson('/api/v1/customer/orders')->assertUnprocessable();
        $this->getJson('/api/v1/products')->assertOk();
    }

    public function test_repeated_application_does_not_create_or_replace_a_store(): void
    {
        Sanctum::actingAs($this->customer);
        $this->fakeCityTegalLocation();
        $payload = [
            'store_name' => 'Dapur Nusa',
            'address' => 'Jl. Nusantara No. 1',
            ...$this->cityTegalFields(),
        ];

        $first = $this->postJson('/api/v1/seller/store', $payload)->assertCreated();
        $second = $this->postJson('/api/v1/seller/store', [
            'store_name' => 'A Different Store',
            'address' => 'A Different Address',
        ])->assertOk();

        $this->assertSame($first->json('data.id'), $second->json('data.id'));
        $this->assertSame('Dapur Nusa', $second->json('data.store_name'));
        $this->assertSame(1, Merchant::where('user_id', $this->customer->id)->count());
    }

    public function test_pending_store_cannot_access_merchant_features_but_customer_order_route_remains_available(): void
    {
        $merchant = $this->createStore($this->customer, ['is_verified' => false]);
        Sanctum::actingAs($this->customer);

        $this->getJson('/api/v1/merchant/products')->assertForbidden();
        $this->getJson('/api/v1/merchant/orders')->assertForbidden();
        $this->getJson('/api/v1/merchant/my-store')->assertForbidden();
        $this->postJson('/api/v1/merchant/products', [])->assertForbidden();
        $this->postJson('/api/v1/customer/orders')->assertUnprocessable();
        $this->assertFalse($merchant->fresh()->is_verified);
    }

    public function test_approved_customer_can_use_merchant_dashboard_without_losing_customer_identity(): void
    {
        $merchant = $this->createStore($this->customer, ['is_verified' => false]);
        $category = Category::create(['name' => 'Camilan', 'slug' => 'seller-snacks-'.uniqid()]);
        $merchant->products()->create([
            'category_id' => $category->id,
            'name' => 'Piscok',
            'slug' => 'seller-piscok-'.uniqid(),
            'description' => 'Pisang cokelat.',
            'price' => 3000,
            'stock' => 5,
            'is_available' => true,
            'image_url' => 'https://example.test/piscok.jpg',
        ]);
        $merchant->forceFill(['is_verified' => true])->save();
        Sanctum::actingAs($this->customer);

        $this->getJson('/api/v1/merchant/products')->assertOk()->assertJsonPath('data.0.name', 'Piscok');
        $this->getJson('/api/v1/merchant/orders')->assertOk();
        $this->postJson('/api/v1/customer/orders')->assertUnprocessable();
        $this->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('user.role', 'customer')
            ->assertJsonPath('user.merchant.is_verified', true);
    }

    public function test_customer_can_place_orders_before_and_after_store_approval(): void
    {
        $ownStore = $this->createStore($this->customer, ['is_verified' => false]);
        $otherUser = User::factory()->create(['role' => 'customer']);
        $otherStore = $this->createStore($otherUser, ['is_verified' => true]);
        $category = Category::create(['name' => 'Camilan', 'slug' => 'order-snacks-'.uniqid()]);
        $product = $otherStore->products()->create([
            'category_id' => $category->id,
            'name' => 'Pisang Cokelat',
            'slug' => 'order-piscok-'.uniqid(),
            'description' => 'Pisang cokelat.',
            'price' => 3000,
            'stock' => 4,
            'is_available' => true,
            'image_url' => 'https://example.test/piscok.jpg',
        ]);
        config(['services.midtrans.server_key' => 'test-server-key']);
        Http::fake(['https://app.sandbox.midtrans.com/snap/v1/transactions' => Http::response(['token' => 'test-snap-token'], 200)]);
        Sanctum::actingAs($this->customer);
        $orderPayload = ['shipping_type' => 'pickup', 'items' => [['product_id' => $product->id, 'quantity' => 1]]];

        $firstOrder = $this->postJson('/api/v1/customer/orders', $orderPayload)
            ->assertCreated()
            ->assertJsonPath('snap_token', 'test-snap-token');
        $this->assertSame($this->customer->id, $firstOrder->json('data.user_id'));

        $ownStore->forceFill(['is_verified' => true])->save();
        $this->postJson('/api/v1/customer/orders', $orderPayload)
            ->assertCreated()
            ->assertJsonPath('snap_token', 'test-snap-token');

        $this->assertSame(2, Order::where('user_id', $this->customer->id)->count());
        $this->assertSame('customer', $this->customer->fresh()->role);
        $this->assertSame(2, $product->fresh()->stock);
    }

    public function test_approved_store_owner_can_toggle_visibility_in_the_public_catalog(): void
    {
        $merchant = $this->createStore($this->customer, ['is_verified' => true, 'is_open' => false]);
        $category = Category::create(['name' => 'Camilan', 'slug' => 'store-status-snacks-'.uniqid()]);
        $product = $merchant->products()->create([
            'category_id' => $category->id,
            'name' => 'Onde-onde',
            'slug' => 'store-status-onde-onde-'.uniqid(),
            'description' => 'Jajanan pasar.',
            'price' => 3000,
            'stock' => 10,
            'is_available' => true,
            'image_url' => 'https://example.test/onde-onde.jpg',
        ]);
        Sanctum::actingAs($this->customer);

        $this->getJson('/api/v1/products')->assertOk()->assertJsonMissing(['slug' => $product->slug]);
        $this->putJson('/api/v1/merchant/my-store', ['is_open' => true])
            ->assertOk()
            ->assertJsonPath('data.is_open', true);
        $this->getJson('/api/v1/products')->assertOk()->assertJsonFragment(['slug' => $product->slug]);

        $this->putJson('/api/v1/merchant/my-store', ['is_open' => false])
            ->assertOk()
            ->assertJsonPath('data.is_open', false);
        $this->getJson('/api/v1/products')->assertOk()->assertJsonMissing(['slug' => $product->slug]);
    }

    public function test_rejected_application_remains_rejected_and_cannot_access_merchant_features(): void
    {
        $merchant = $this->createStore($this->customer, ['is_verified' => false, 'rejected_at' => now()]);
        Sanctum::actingAs($this->customer);

        $this->getJson('/api/v1/seller/store')
            ->assertOk()
            ->assertJsonPath('data.id', $merchant->id)
            ->assertJsonPath('data.rejected_at', $merchant->rejected_at->toJSON());
        $this->getJson('/api/v1/merchant/products')->assertForbidden();

        $this->postJson('/api/v1/seller/store', [
            'store_name' => 'Pengajuan Ulang',
            'address' => 'Alamat baru',
        ])->assertOk()->assertJsonPath('data.id', $merchant->id);

        $this->assertSame(1, Merchant::where('user_id', $this->customer->id)->count());
        $this->assertNotNull($merchant->fresh()->rejected_at);
        $this->assertFalse($merchant->fresh()->is_verified);
    }

    public function test_store_registration_requires_authentication_and_validates_fields(): void
    {
        $this->getJson('/api/v1/seller/store')->assertUnauthorized();
        $this->postJson('/api/v1/seller/store', [])->assertUnauthorized();

        Sanctum::actingAs($this->customer);
        $this->postJson('/api/v1/seller/store', [
            'store_name' => str_repeat('a', 256),
            'address' => '',
            'phone' => str_repeat('1', 31),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['store_name', 'address', 'phone']);

        Sanctum::actingAs($this->admin);
        $this->postJson('/api/v1/seller/store', [
            'store_name' => 'Admin Store',
            'address' => 'Test address',
        ])->assertForbidden();
    }

    public function test_seller_can_register_a_store_in_kabupaten_tegal(): void
    {
        Sanctum::actingAs($this->customer);
        Http::fake([
            'nominatim.openstreetmap.org/reverse*' => Http::response([
                'address' => [
                    'state' => 'Jawa Tengah',
                    'county' => 'Tegal',
                    'state_district' => 'Kecamatan Slawi',
                    'village' => 'Slawi Kulon',
                ],
            ]),
        ]);

        $this->postJson('/api/v1/seller/store', [
            'store_name' => 'Dapur Slawi',
            'address' => 'Jl. Slawi No. 1',
            'province' => 'Jawa Tengah',
            'regency' => 'Kabupaten Tegal',
            'district' => 'Slawi',
            'village' => 'Slawi Kulon',
            'latitude' => -6.9812,
            'longitude' => 109.1401,
        ])->assertCreated()
            ->assertJsonPath('data.province', 'Jawa Tengah')
            ->assertJsonPath('data.regency', 'Kabupaten Tegal')
            ->assertJsonStructure(['data' => ['location_checked_at']]);
    }

    public function test_outside_tegal_coordinates_are_rejected_even_when_tegal_is_selected(): void
    {
        Sanctum::actingAs($this->customer);
        Http::fake([
            'nominatim.openstreetmap.org/reverse*' => Http::response([
                'address' => [
                    'state' => 'Jawa Tengah',
                    'county' => 'Brebes',
                    'state_district' => 'Kecamatan Brebes',
                    'village' => 'Brebes',
                ],
            ]),
        ]);

        $this->postJson('/api/v1/seller/store', [
            'store_name' => 'Toko Di Luar',
            'address' => 'Alamat di luar Tegal',
            'province' => 'Jawa Tengah',
            'regency' => 'Kabupaten Tegal',
            'district' => 'Brebes',
            'village' => 'Brebes',
            'latitude' => -6.87,
            'longitude' => 109.04,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['latitude', 'regency', 'district', 'village']);

        $this->assertDatabaseMissing('merchants', ['user_id' => $this->customer->id]);
    }

    public function test_location_lookup_returns_administrative_data_from_nominatim(): void
    {
        Sanctum::actingAs($this->customer);
        $this->fakeCityTegalLocation();

        $this->postJson('/api/v1/seller/location/resolve', [
            'latitude' => -6.88,
            'longitude' => 109.14,
        ])->assertOk()
            ->assertJsonPath('data.province', 'Jawa Tengah')
            ->assertJsonPath('data.regency', 'Kota Tegal')
            ->assertJsonPath('data.district', 'Tegal Timur')
            ->assertJsonPath('data.village', 'Kejambon');
    }

    public function test_location_lookup_accepts_verified_tegal_coordinates_when_osm_has_no_district_data(): void
    {
        Sanctum::actingAs($this->customer);
        Http::fake([
            'nominatim.openstreetmap.org/reverse*' => Http::response([
                'address' => [
                    'state' => 'Jawa Tengah',
                    'city' => 'Tegal',
                    'village' => 'Debong Lor',
                ],
            ]),
        ]);

        $this->postJson('/api/v1/seller/location/resolve', [
            'latitude' => -6.8797,
            'longitude' => 109.1256,
        ])->assertOk()
            ->assertJsonPath('data.regency', 'Kota Tegal')
            ->assertJsonPath('data.district', '')
            ->assertJsonPath('data.village', 'Debong Lor');
    }

    public function test_approved_store_can_save_a_tegal_location_when_osm_does_not_provide_district_data(): void
    {
        $merchant = $this->createStore($this->customer, ['is_verified' => true]);
        Sanctum::actingAs($this->customer);
        Http::fake([
            'nominatim.openstreetmap.org/reverse*' => Http::response([
                'address' => [
                    'state' => 'Jawa Tengah',
                    'city' => 'Tegal',
                    'village' => 'Debong Lor',
                ],
            ]),
        ]);

        $this->putJson('/api/v1/merchant/my-store', [
            'address' => 'Jl. Gajah Mada, Debong Lor, Kota Tegal',
            'province' => 'Jawa Tengah',
            'regency' => 'Kota Tegal',
            'district' => '',
            'village' => 'Debong Lor',
            'latitude' => -6.8797,
            'longitude' => 109.1256,
        ])->assertOk()
            ->assertJsonPath('data.location_checked_at', fn ($value) => is_string($value))
            ->assertJsonPath('data.village', 'Debong Lor')
            ->assertJsonPath('data.district', '');

        $this->assertSame(-6.8797, $merchant->fresh()->latitude);
        $this->assertNotNull($merchant->fresh()->location_checked_at);
    }

    public function test_address_search_returns_tegal_coordinates_for_the_map_picker(): void
    {
        Sanctum::actingAs($this->customer);
        Http::fake([
            'nominatim.openstreetmap.org/search*' => Http::response([
                [
                    'lat' => '-6.88',
                    'lon' => '109.14',
                    'display_name' => 'Kejambon, Kota Tegal, Jawa Tengah, Indonesia',
                    'address' => [
                        'state' => 'Jawa Tengah',
                        'city' => 'Kota Tegal',
                        'city_district' => 'Tegal Timur',
                        'village' => 'Kejambon',
                    ],
                ],
            ]),
        ]);

        $this->postJson('/api/v1/seller/location/search', [
            'address' => 'Jl. Kejambon, Tegal Timur',
        ])->assertOk()
            ->assertJsonPath('data.0.latitude', -6.88)
            ->assertJsonPath('data.0.longitude', 109.14)
            ->assertJsonPath('data.0.regency', 'Kota Tegal');
    }

    public function test_address_search_returns_service_unavailable_for_transport_errors_instead_of_server_error(): void
    {
        Sanctum::actingAs($this->customer);
        Http::fake(fn () => throw new RequestException(
            'cURL error 77: error setting certificate file',
            new Request('GET', 'https://nominatim.openstreetmap.org/search'),
        ));

        $this->postJson('/api/v1/seller/location/search', [
            'address' => 'Jalan Gajah Mada, Tegal',
        ])->assertStatus(503)
            ->assertJsonPath('message', 'Alamat belum dapat dicari melalui OpenStreetMap. Coba lagi beberapa saat.');
    }

    public function test_public_store_and_product_catalogs_only_include_approved_checked_tegal_locations(): void
    {
        $approvedStore = $this->createStore($this->customer, ['is_verified' => true]);
        $pendingStore = $this->createStore(User::factory()->create(), ['is_verified' => false]);
        $rejectedStore = $this->createStore(User::factory()->create(), ['is_verified' => false, 'rejected_at' => now()]);
        $outsideStore = $this->createStore(User::factory()->create(), ['is_verified' => true, 'regency' => 'Kabupaten Brebes']);
        $uncheckedStore = $this->createStore(User::factory()->create(), ['is_verified' => true, 'location_checked_at' => null]);
        $category = Category::create(['name' => 'Camilan', 'slug' => 'public-map-snacks-'.uniqid()]);
        $product = $approvedStore->products()->create([
            'category_id' => $category->id,
            'name' => 'Tahu Aci',
            'slug' => 'public-map-product-'.uniqid(),
            'description' => 'Tahu aci khas Tegal.',
            'price' => 5000,
            'stock' => 4,
            'is_available' => true,
            'image_url' => 'https://example.test/tahu-aci.jpg',
        ]);
        $outsideProduct = $outsideStore->products()->create([
            'category_id' => $category->id,
            'name' => 'Produk luar',
            'slug' => 'outside-tegal-product-'.uniqid(),
            'description' => 'Tidak boleh tampil.',
            'price' => 5000,
            'stock' => 4,
            'is_available' => true,
            'image_url' => 'https://example.test/outside.jpg',
        ]);
        Sanctum::actingAs($this->customer);

        $this->getJson('/api/v1/stores')
            ->assertOk()
            ->assertJsonFragment(['slug' => $approvedStore->slug])
            ->assertJsonMissing(['slug' => $pendingStore->slug])
            ->assertJsonMissing(['slug' => $rejectedStore->slug])
            ->assertJsonMissing(['slug' => $outsideStore->slug])
            ->assertJsonMissing(['slug' => $uncheckedStore->slug])
            ->assertJsonMissingPath('data.0.user');
        $this->getJson('/api/v1/products')
            ->assertOk()
            ->assertJsonFragment(['slug' => $product->slug])
            ->assertJsonMissing(['slug' => $outsideProduct->slug])
            ->assertJsonMissingPath('data.0.user');
        $this->getJson('/api/v1/products/'.$product->slug)
            ->assertOk()
            ->assertJsonPath('data.merchant.regency', 'Kota Tegal')
            ->assertJsonPath('data.merchant.latitude', -6.88)
            ->assertJsonMissingPath('data.merchant.user');
        $this->getJson('/api/v1/stores/'.$approvedStore->slug)
            ->assertOk()
            ->assertJsonPath('data.slug', $approvedStore->slug)
            ->assertJsonPath('data.products.0.slug', $product->slug)
            ->assertJsonMissingPath('data.user');
    }

    public function test_customer_cannot_manage_another_approved_merchants_product(): void
    {
        $ownStore = $this->createStore($this->customer, ['is_verified' => true]);
        $otherUser = User::factory()->create(['role' => 'customer']);
        $otherStore = $this->createStore($otherUser, ['is_verified' => true]);
        $category = Category::create(['name' => 'Makanan', 'slug' => 'seller-food-'.uniqid()]);
        $otherProduct = $otherStore->products()->create([
            'category_id' => $category->id,
            'name' => 'Produk Toko Lain',
            'slug' => 'other-store-product-'.uniqid(),
            'description' => 'Produk.',
            'price' => 1000,
            'stock' => 1,
            'is_available' => true,
            'image_url' => 'https://example.test/product.jpg',
        ]);

        $this->assertNotSame($ownStore->id, $otherStore->id);
        Sanctum::actingAs($this->customer);
        $this->putJson("/api/v1/merchant/products/{$otherProduct->id}", ['name' => 'Diubah'])->assertNotFound();
        $this->assertSame('Produk Toko Lain', $otherProduct->fresh()->name);
    }

    private function createStore(User $user, array $attributes = []): Merchant
    {
        $merchant = $user->merchant()->create([
            'store_name' => 'Toko '.uniqid(),
            'slug' => 'toko-'.uniqid(),
            'description' => null,
            'address' => 'Jl. Test No. 1',
            'province' => 'Jawa Tengah',
            'regency' => 'Kota Tegal',
            'district' => 'Tegal Timur',
            'village' => 'Kejambon',
            'latitude' => -6.88,
            'longitude' => 109.14,
            'location_checked_at' => now(),
        ]);
        $merchant->forceFill($attributes)->save();

        return $merchant;
    }

    private function fakeCityTegalLocation(): void
    {
        Http::fake([
            'nominatim.openstreetmap.org/reverse*' => Http::response([
                'address' => [
                    'state' => 'Jawa Tengah',
                    'city' => 'Tegal',
                    'city_district' => 'Tegal Timur',
                    'village' => 'Kejambon',
                ],
            ]),
        ]);
    }

    private function cityTegalFields(): array
    {
        return [
            'province' => 'Jawa Tengah',
            'regency' => 'Kota Tegal',
            'district' => 'Tegal Timur',
            'village' => 'Kejambon',
            'latitude' => -6.88,
            'longitude' => 109.14,
        ];
    }
}
