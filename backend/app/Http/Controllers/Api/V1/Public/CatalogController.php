<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\MerchantLocationResource;
use App\Models\Category;
use App\Models\HomeBanner;
use App\Models\Merchant;
use App\Models\Product;
use App\Models\SiteSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CatalogController extends Controller
{
    public function categories(): JsonResponse
    {
        return response()->json(['data' => Category::query()->where('is_active', true)->orderBy('name')->get()]);
    }

    public function homeContent(): JsonResponse
    {
        return response()->json([
            'settings' => SiteSetting::query()->firstOrFail(),
            'categories' => Category::query()->where('is_active', true)->orderBy('name')->get(),
            'banners' => HomeBanner::query()->where('is_active', true)->orderBy('sort_order')->orderBy('id')->get(),
        ]);
    }

    public function stores(): AnonymousResourceCollection
    {
        return MerchantLocationResource::collection(
            Merchant::query()->publiclyLocated()->orderBy('store_name')->get(),
        );
    }

    public function store(string $slug): JsonResponse
    {
        $merchant = Merchant::query()->publiclyLocated()->where('slug', $slug)->firstOrFail();
        $store = (new MerchantLocationResource($merchant))->resolve(request());
        $store['products'] = $merchant->is_open
            ? $merchant->products()
                ->with('category:id,name,slug,image_url')
                ->where('is_available', true)
                ->where('stock', '>', 0)
                ->latest()
                ->get(['id', 'merchant_id', 'category_id', 'name', 'slug', 'description', 'price', 'stock', 'image_url'])
            : collect();

        return response()->json(['data' => $store]);
    }

    public function products(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'category' => ['nullable', 'string', 'exists:categories,slug'],
            'search' => ['nullable', 'string', 'max:100'],
            'min_price' => ['nullable', 'numeric', 'min:0'],
            'max_price' => ['nullable', 'numeric', 'gte:min_price'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $products = Product::query()
            ->with(['merchant:id,store_name,slug', 'category:id,name,slug,image_url'])
            ->where('is_available', true)
            ->where('stock', '>', 0)
            ->whereHas('merchant', fn ($query) => $query->publiclyLocated()->where('is_open', true))
            ->when($filters['category'] ?? null, fn ($query, $category) => $query->whereHas('category', fn ($categoryQuery) => $categoryQuery->where('slug', $category)))
            ->when($filters['search'] ?? null, fn ($query, $search) => $query->where(fn ($searchQuery) => $searchQuery->where('name', 'like', "%{$search}%")->orWhere('description', 'like', "%{$search}%")))
            ->when(isset($filters['min_price']), fn ($query) => $query->where('price', '>=', $filters['min_price']))
            ->when(isset($filters['max_price']), fn ($query) => $query->where('price', '<=', $filters['max_price']))
            ->latest()
            ->paginate($filters['per_page'] ?? 12);

        return response()->json($products);
    }

    public function show(string $slug): JsonResponse
    {
        $product = Product::query()
            ->with(['merchant:id,store_name,slug,description,address,province,regency,district,village,latitude,longitude,location_checked_at,is_open', 'category:id,name,slug,image_url'])
            ->where('slug', $slug)
            ->where('is_available', true)
            ->whereHas('merchant', fn ($query) => $query->publiclyLocated())
            ->firstOrFail();

        return response()->json(['data' => $product]);
    }
}
