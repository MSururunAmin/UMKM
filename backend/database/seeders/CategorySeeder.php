<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Makanan Berat', 'slug' => 'makanan-berat', 'emoji' => '🍛', 'caption' => 'Masakan rumahan yang mengenyangkan', 'image_url' => 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80'],
            ['name' => 'Jajanan Pasar', 'slug' => 'jajanan-pasar', 'emoji' => '🍡', 'caption' => 'Jajanan tradisional penuh cerita', 'image_url' => 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=600&q=80'],
            ['name' => 'Minuman', 'slug' => 'minuman', 'emoji' => '🥤', 'caption' => 'Segar untuk menemani harimu', 'image_url' => 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=600&q=80'],
            ['name' => 'Camilan', 'slug' => 'camilan', 'emoji' => '🍪', 'caption' => 'Teman santai buatan tetangga', 'image_url' => 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=600&q=80'],
        ];

        foreach ($categories as $category) {
            Category::updateOrCreate(['slug' => $category['slug']], $category);
        }
    }
}
