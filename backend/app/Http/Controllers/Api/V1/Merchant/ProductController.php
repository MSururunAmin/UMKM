<?php

namespace App\Http\Controllers\Api\V1\Merchant;

use App\Http\Controllers\Controller;
use App\Models\Merchant;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    private function rules(bool $partial = false): array
    {
        return [
            'category_id' => [$partial ? 'sometimes' : 'required', 'exists:categories,id'],
            'name' => [$partial ? 'sometimes' : 'required', 'string', 'max:255'],
            'description' => [$partial ? 'sometimes' : 'required', 'string'],
            'price' => [$partial ? 'sometimes' : 'required', 'numeric', 'min:0'],
            'stock' => ['sometimes', 'integer', 'min:0'],
            'is_available' => ['sometimes', 'boolean'],
            'image_url' => [$partial ? 'sometimes' : 'required_without:image', 'nullable', 'url', 'max:2048'],
            'image' => [$partial ? 'sometimes' : 'required_without:image_url', 'nullable', 'image', 'max:5120'],
        ];
    }

    private function storeUploadedImage(Request $request, array &$data): void
    {
        if ($request->hasFile('image')) {
            $data['image_url'] = $request->file('image')->store('products', 'public');
        }
        unset($data['image']);
    }

    public function store(Request $request): JsonResponse
    {
        $merchant = Merchant::where('user_id', $request->user()->id)->first();
        if (! $merchant) {
            return response()->json(['message' => 'Store profile not found for this user'], 403);
        }

        $data = $request->validate($this->rules());
        $this->storeUploadedImage($request, $data);
        $data['slug'] = Str::slug($data['name']).'-'.Str::lower(Str::random(5));
        $product = $merchant->products()->create($data);

        return response()->json(['data' => $product->load('category')], 201);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        abort_unless($product->merchant_id === $request->user()->merchant?->id, 404);
        $data = $request->validate($this->rules(true));
        $this->storeUploadedImage($request, $data);
        if (isset($data['name'])) {
            $data['slug'] = Str::slug($data['name']).'-'.Str::lower(Str::random(5));
        }
        $product->update($data);

        return response()->json(['data' => $product->fresh('category')]);
    }

    public function destroy(Request $request, Product $product): JsonResponse
    {
        abort_unless($product->merchant_id === $request->user()->merchant?->id, 404);
        $product->delete();

        return response()->json(status: 204);
    }
}
