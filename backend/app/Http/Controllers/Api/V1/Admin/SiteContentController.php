<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\HomeBanner;
use App\Models\SiteSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SiteContentController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'categories' => Category::query()->orderBy('name')->get(),
            'banners' => HomeBanner::query()->orderBy('sort_order')->orderBy('id')->get(),
            'settings' => SiteSetting::query()->firstOrFail(),
        ]);
    }

    public function saveSettings(Request $request): JsonResponse
    {
        $settings = $request->validate([
            'home_badge' => ['required', 'string', 'max:120'],
            'home_title' => ['required', 'string', 'max:180'],
            'home_description' => ['required', 'string', 'max:1000'],
            'home_card_emoji' => ['required', 'string', 'max:16'],
            'home_card_label' => ['required', 'string', 'max:100'],
            'home_card_title' => ['required', 'string', 'max:120'],
            'category_eyebrow' => ['required', 'string', 'max:120'],
            'category_title' => ['required', 'string', 'max:120'],
            'featured_eyebrow' => ['required', 'string', 'max:120'],
            'featured_title' => ['required', 'string', 'max:120'],
            'seller_eyebrow' => ['required', 'string', 'max:120'],
            'seller_title' => ['required', 'string', 'max:180'],
            'seller_description' => ['required', 'string', 'max:1000'],
            'seller_button' => ['required', 'string', 'max:80'],
        ]);

        $record = SiteSetting::query()->firstOrFail();
        $record->update($settings);

        return response()->json(['data' => $record->fresh()]);
    }

    public function saveCategory(Request $request, ?Category $category = null): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'caption' => ['nullable', 'string', 'max:255'],
            'emoji' => ['required', 'string', 'max:16'],
            'image_url' => ['nullable', 'url:http,https', 'max:2048'],
            'is_active' => ['required', 'boolean'],
        ]);
        if (! $category?->exists || $category->name !== $data['name']) {
            $baseSlug = Str::slug($data['name']);
            $slug = $baseSlug;
            $suffix = 2;
            while (Category::query()->where('slug', $slug)->when($category?->exists, fn ($query) => $query->whereKeyNot($category->id))->exists()) {
                $slug = $baseSlug.'-'.$suffix++;
            }
            $data['slug'] = $slug;
        }

        $category ??= new Category;
        $category->fill($data)->save();

        return response()->json(['data' => $category->fresh()], $category->wasRecentlyCreated ? 201 : 200);
    }

    public function deleteCategory(Category $category): JsonResponse
    {
        if ($category->products()->exists()) {
            return response()->json([
                'message' => 'Kategori masih digunakan produk. Nonaktifkan kategori agar tidak muncul untuk produk baru.',
            ], 409);
        }

        $category->delete();

        return response()->json(['message' => 'Kategori berhasil dihapus.']);
    }

    public function saveBanner(Request $request, ?HomeBanner $banner = null): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:1000'],
            'image_url' => ['nullable', 'url:http,https', 'max:2048'],
            'link_url' => [
                'nullable',
                'string',
                'max:2048',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (
                        ! is_string($value)
                        || (str_starts_with($value, '/') && str_starts_with($value, '//'))
                        || (! str_starts_with($value, '/') && ! str_starts_with($value, 'https://'))
                    ) {
                        $fail('Tautan harus berupa path lokal atau URL HTTPS.');
                    }
                },
            ],
            'is_active' => ['required', 'boolean'],
            'sort_order' => ['required', 'integer', 'min:0', 'max:65535'],
        ]);

        $banner ??= new HomeBanner;
        $banner->fill($data)->save();

        return response()->json(['data' => $banner->fresh()], $banner->wasRecentlyCreated ? 201 : 200);
    }

    public function deleteBanner(HomeBanner $banner): JsonResponse
    {
        $banner->delete();

        return response()->json(['message' => 'Banner berhasil dihapus.']);
    }
}
