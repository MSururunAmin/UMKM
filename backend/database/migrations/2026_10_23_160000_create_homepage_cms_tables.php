<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table): void {
            $table->string('emoji', 16)->default('🍽️');
            $table->string('caption', 255)->default('');
            $table->boolean('is_active')->default(true)->index();
        });
        foreach ([
            'makanan-berat' => ['🍛', 'Masakan rumahan yang mengenyangkan'],
            'jajanan-pasar' => ['🍡', 'Jajanan tradisional penuh cerita'],
            'minuman' => ['🥤', 'Segar untuk menemani harimu'],
            'camilan' => ['🍪', 'Teman santai buatan tetangga'],
        ] as $slug => [$emoji, $caption]) {
            DB::table('categories')->where('slug', $slug)->update(['emoji' => $emoji, 'caption' => $caption]);
        }

        Schema::create('home_banners', function (Blueprint $table): void {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('image_url', 2048)->nullable();
            $table->string('link_url', 2048)->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('site_settings', function (Blueprint $table): void {
            $table->id();
            $table->string('home_badge');
            $table->string('home_title');
            $table->text('home_description');
            $table->string('home_card_emoji', 16);
            $table->string('home_card_label');
            $table->string('home_card_title');
            $table->string('category_eyebrow');
            $table->string('category_title');
            $table->string('featured_eyebrow');
            $table->string('featured_title');
            $table->string('seller_eyebrow');
            $table->string('seller_title');
            $table->text('seller_description');
            $table->string('seller_button');
            $table->timestamps();
        });

        DB::table('site_settings')->insert([
            'home_badge' => 'Rasa dekat, dukung lokal',
            'home_title' => 'Cerita baik, dimulai dari sepiring rasa.',
            'home_description' => 'Temukan masakan rumahan dan jajanan autentik dari pelaku UMKM di sekitarmu. Setiap pesanan ikut menumbuhkan usaha lokal.',
            'home_card_emoji' => '🍲',
            'home_card_label' => 'Dari tetangga, untuk tetangga',
            'home_card_title' => 'Rasa rumahan, selalu punya cerita.',
            'category_eyebrow' => 'Ada rasa untuk setiap suasana',
            'category_title' => 'Mulai dari yang kamu suka',
            'featured_eyebrow' => 'Temukan favoritmu',
            'featured_title' => 'Menu dari dapur sekitar',
            'seller_eyebrow' => 'Punya usaha kuliner?',
            'seller_title' => 'Saatnya lebih banyak orang mencicipi karya terbaikmu.',
            'seller_description' => 'Bawa cerita dari dapurmu ke lebih banyak meja makan bersama Rasa Lokal.',
            'seller_button' => 'Daftarkan usahamu',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('site_settings');
        Schema::dropIfExists('home_banners');
        Schema::table('categories', function (Blueprint $table): void {
            $table->dropColumn(['emoji', 'caption', 'is_active']);
        });
    }
};
