<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SiteContentManagementTest extends TestCase
{
    use DatabaseTransactions;

    public function test_only_admins_can_manage_homepage_content_and_saved_content_is_public(): void
    {
        $this->getJson('/api/v1/home-content')
            ->assertOk()
            ->assertJsonPath('settings.home_title', 'Cerita baik, dimulai dari sepiring rasa.');

        Sanctum::actingAs(User::factory()->create(['role' => 'customer']));
        $this->getJson('/api/v1/admin/site-content')->assertForbidden();

        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $categoryResponse = $this->postJson('/api/v1/admin/site-content/categories', [
            'name' => 'Makanan Rumahan',
            'caption' => 'Menu harian khas rumah.',
            'emoji' => '🍲',
            'image_url' => null,
            'is_active' => true,
        ])->assertCreated()
            ->assertJsonPath('data.slug', 'makanan-rumahan');

        $categoryId = $categoryResponse->json('data.id');
        $this->putJson("/api/v1/admin/site-content/categories/{$categoryId}", [
            'name' => 'Masakan Rumahan',
            'caption' => 'Menu harian khas rumah.',
            'emoji' => '🍲',
            'image_url' => null,
            'is_active' => true,
        ])->assertOk()
            ->assertJsonPath('data.slug', 'masakan-rumahan');

        $bannerResponse = $this->postJson('/api/v1/admin/site-content/banners', [
            'title' => 'Promo akhir pekan',
            'description' => 'Jelajahi menu pilihan.',
            'image_url' => null,
            'link_url' => '/products',
            'is_active' => true,
            'sort_order' => 1,
        ])->assertCreated();

        $bannerId = $bannerResponse->json('data.id');
        $this->putJson("/api/v1/admin/site-content/banners/{$bannerId}", [
            'title' => 'Promo spesial akhir pekan',
            'description' => 'Jelajahi menu pilihan.',
            'image_url' => null,
            'link_url' => '/products',
            'is_active' => true,
            'sort_order' => 2,
        ])->assertOk();

        $this->putJson('/api/v1/admin/site-content/settings', [
            'home_badge' => 'Dukung usaha sekitar',
            'home_title' => 'Rasa lokal untuk semua.',
            'home_description' => 'Temukan menu favoritmu.',
            'home_card_emoji' => '🍛',
            'home_card_label' => 'Pilihan lokal',
            'home_card_title' => 'Dibuat dengan sepenuh hati.',
            'category_eyebrow' => 'Kategori',
            'category_title' => 'Pilih yang kamu suka',
            'featured_eyebrow' => 'Pilihan',
            'featured_title' => 'Menu unggulan',
            'seller_eyebrow' => 'Punya usaha?',
            'seller_title' => 'Jual menu terbaikmu.',
            'seller_description' => 'Bergabung bersama kami.',
            'seller_button' => 'Daftar toko',
        ])->assertOk();

        $this->getJson('/api/v1/home-content')
            ->assertOk()
            ->assertJsonPath('settings.home_title', 'Rasa lokal untuk semua.')
            ->assertJsonFragment(['title' => 'Promo spesial akhir pekan'])
            ->assertJsonFragment(['slug' => 'masakan-rumahan']);

        $this->deleteJson("/api/v1/admin/site-content/categories/{$categoryId}")->assertOk();
        $this->deleteJson("/api/v1/admin/site-content/banners/{$bannerId}")->assertOk();
    }

    public function test_banner_links_reject_non_https_external_urls(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->postJson('/api/v1/admin/site-content/banners', [
            'title' => 'Tautan tidak valid',
            'link_url' => 'javascript:alert(1)',
            'is_active' => true,
            'sort_order' => 0,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['link_url']);
    }
}
