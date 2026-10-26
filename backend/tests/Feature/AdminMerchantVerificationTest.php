<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Merchant;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminMerchantVerificationTest extends TestCase
{
    use DatabaseTransactions;

    private User $admin;

    private User $merchantUser;

    private User $customer;

    private Merchant $pendingStore;

    private Product $product;

    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->merchantUser = User::factory()->create(['role' => 'merchant']);
        $this->customer = User::factory()->create(['role' => 'customer']);
        $this->category = Category::create(['name' => 'Camilan', 'slug' => 'verification-snacks-'.uniqid()]);
        $this->pendingStore = $this->merchantUser->merchant()->create([
            'store_name' => 'Pending Store',
            'slug' => 'pending-store-'.uniqid(),
            'description' => 'Store awaiting review.',
            'address' => 'Test address',
            'province' => 'Jawa Tengah',
            'regency' => 'Kota Tegal',
            'district' => 'Tegal Timur',
            'village' => 'Kejambon',
            'latitude' => -6.88,
            'longitude' => 109.14,
            'location_checked_at' => now(),
            'is_verified' => false,
            'is_open' => true,
        ]);
        $this->product = $this->pendingStore->products()->create([
            'category_id' => $this->category->id,
            'name' => 'Pending Store Product',
            'slug' => 'pending-store-product-'.uniqid(),
            'description' => 'Visible after approval.',
            'price' => 3000,
            'stock' => 20,
            'is_available' => true,
            'image_url' => 'https://example.test/product.jpg',
        ]);
    }

    public function test_only_authenticated_administrators_can_access_review_endpoints(): void
    {
        $this->getJson('/api/v1/admin/merchant-stores/pending')->assertUnauthorized();
        $this->getJson('/api/v1/admin/merchant-stores/rejected')->assertUnauthorized();
        $this->postJson("/api/v1/admin/merchant-stores/{$this->pendingStore->id}/approve")->assertUnauthorized();
        $this->postJson("/api/v1/admin/merchant-stores/{$this->pendingStore->id}/reject")->assertUnauthorized();

        foreach ([$this->merchantUser, $this->customer] as $user) {
            Sanctum::actingAs($user);
            $this->getJson('/api/v1/admin/merchant-stores/pending')->assertForbidden();
            $this->getJson('/api/v1/admin/merchant-stores/rejected')->assertForbidden();
            $this->postJson("/api/v1/admin/merchant-stores/{$this->pendingStore->id}/approve")->assertForbidden();
            $this->postJson("/api/v1/admin/merchant-stores/{$this->pendingStore->id}/reject")->assertForbidden();
        }
    }

    public function test_admin_can_list_pending_stores_and_approve_one_for_public_catalog(): void
    {
        Sanctum::actingAs($this->admin);

        $this->getJson('/api/v1/admin/merchant-stores/pending')
            ->assertOk()
            ->assertJsonPath('data.0.id', $this->pendingStore->id)
            ->assertJsonPath('data.0.user.name', $this->merchantUser->name);

        $this->getJson('/api/v1/products?category='.$this->category->slug)
            ->assertOk()
            ->assertJsonMissing(['slug' => $this->product->slug]);

        $this->postJson("/api/v1/admin/merchant-stores/{$this->pendingStore->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.is_verified', true)
            ->assertJsonPath('data.rejected_at', null);

        $this->assertTrue($this->pendingStore->fresh()->is_verified);
        $this->getJson('/api/v1/admin/merchant-stores/pending')
            ->assertOk()
            ->assertJsonMissing(['slug' => $this->pendingStore->slug]);
        $this->getJson('/api/v1/admin/merchant-stores/rejected')
            ->assertOk()
            ->assertJsonMissing(['slug' => $this->pendingStore->slug]);
        $this->getJson('/api/v1/products?category='.$this->category->slug)
            ->assertOk()
            ->assertJsonFragment(['slug' => $this->product->slug]);
    }

    public function test_admin_can_reject_pending_store_without_publishing_its_products(): void
    {
        Sanctum::actingAs($this->admin);

        $this->postJson("/api/v1/admin/merchant-stores/{$this->pendingStore->id}/reject")
            ->assertOk()
            ->assertJsonPath('data.is_verified', false)
            ->assertJsonPath('message', 'Store rejected successfully.');

        $this->assertNotNull($this->pendingStore->fresh()->rejected_at);
        $this->getJson('/api/v1/admin/merchant-stores/pending')
            ->assertOk()
            ->assertJsonMissing(['slug' => $this->pendingStore->slug]);
        $this->getJson('/api/v1/products?category='.$this->category->slug)
            ->assertOk()
            ->assertJsonMissing(['slug' => $this->product->slug]);

        $repeatRejection = $this->postJson("/api/v1/admin/merchant-stores/{$this->pendingStore->id}/reject")
            ->assertOk()
            ->assertJsonPath('data.is_verified', false);
        $this->assertNotNull($repeatRejection->json('data.rejected_at'));
    }

    public function test_admin_can_approve_a_previously_rejected_store(): void
    {
        $this->pendingStore->forceFill(['rejected_at' => now()])->save();
        Sanctum::actingAs($this->admin);

        $this->getJson('/api/v1/admin/merchant-stores/pending')
            ->assertOk()
            ->assertJsonMissing(['slug' => $this->pendingStore->slug]);
        $this->getJson('/api/v1/admin/merchant-stores/rejected')
            ->assertOk()
            ->assertJsonFragment(['slug' => $this->pendingStore->slug]);

        $this->postJson("/api/v1/admin/merchant-stores/{$this->pendingStore->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.is_verified', true)
            ->assertJsonPath('data.rejected_at', null);

        $this->assertTrue($this->pendingStore->fresh()->is_verified);
        $this->assertNull($this->pendingStore->fresh()->rejected_at);
        $this->getJson('/api/v1/admin/merchant-stores/rejected')
            ->assertOk()
            ->assertJsonMissing(['slug' => $this->pendingStore->slug]);
        $this->getJson('/api/v1/products?category='.$this->category->slug)
            ->assertOk()
            ->assertJsonFragment(['slug' => $this->product->slug]);
    }

    public function test_admin_cannot_approve_a_store_without_a_checked_tegal_location(): void
    {
        $this->pendingStore->forceFill(['location_checked_at' => null])->save();
        Sanctum::actingAs($this->admin);

        $this->postJson("/api/v1/admin/merchant-stores/{$this->pendingStore->id}/approve")
            ->assertUnprocessable();

        $this->assertFalse($this->pendingStore->fresh()->is_verified);
    }

    public function test_rejecting_an_approved_store_revokes_catalog_visibility(): void
    {
        $this->pendingStore->forceFill(['is_verified' => true])->save();
        Sanctum::actingAs($this->admin);

        $rejection = $this->postJson("/api/v1/admin/merchant-stores/{$this->pendingStore->id}/reject")
            ->assertOk()
            ->assertJsonPath('data.is_verified', false);

        $this->assertFalse($this->pendingStore->fresh()->is_verified);
        $this->assertNotNull($this->pendingStore->fresh()->rejected_at);
        $this->assertNotNull($rejection->json('data.rejected_at'));
        $this->getJson('/api/v1/products?category='.$this->category->slug)
            ->assertOk()
            ->assertJsonMissing(['slug' => $this->product->slug]);
    }

    public function test_invalid_store_ids_return_not_found(): void
    {
        Sanctum::actingAs($this->admin);

        $this->postJson('/api/v1/admin/merchant-stores/999999999/approve')->assertNotFound();
        $this->postJson('/api/v1/admin/merchant-stores/999999999/reject')->assertNotFound();
    }

    public function test_pending_merchants_cannot_access_store_update(): void
    {
        Sanctum::actingAs($this->merchantUser);

        $this->putJson('/api/v1/merchant/my-store', [
            'is_verified' => true,
            'rejected_at' => null,
        ])->assertForbidden();

        $this->assertFalse($this->pendingStore->fresh()->is_verified);
        $this->assertNull($this->pendingStore->fresh()->rejected_at);
    }
}
