<?php

namespace App\Http\Controllers\Api\V1\Customer;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Services\MidtransSnapService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

class OrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $orders = $request->user()->orders()
            ->with(['merchant:id,store_name', 'items.product:id,name'])
            ->latest()
            ->get();

        return response()->json(['data' => $orders]);
    }

    public function store(Request $request, MidtransSnapService $snap): JsonResponse
    {
        $data = $this->validateOrder($request);
        try {
            $order = $this->createOrderRecord($request, $data);
            $order->update(['snap_token' => $snap->createToken($order)]);

            return response()->json(['data' => $order->fresh('items.product'), 'snap_token' => $order->snap_token], 201);
        } catch (Throwable $exception) {
            return response()->json(
                ['message' => $exception->getMessage()],
                $exception->getCode() === 422 ? 422 : 503,
            );
        }
    }

    public function storeTest(Request $request): JsonResponse
    {
        abort_unless(app()->environment(['local', 'testing']), 404);

        $order = $this->createOrderRecord($request, $this->validateOrder($request), true);

        return response()->json(['data' => $order->fresh(['merchant:id,store_name', 'items.product:id,name'])], 201);
    }

    private function validateOrder(Request $request): array
    {
        return $request->validate([
            'shipping_type' => ['required', 'in:delivery,pickup'],
            'delivery_address' => ['required_if:shipping_type,delivery', 'nullable', 'string', 'max:2000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);
    }

    private function createOrderRecord(Request $request, array $data, bool $isTest = false): Order
    {
        return DB::transaction(function () use ($request, $data, $isTest) {
            $products = Product::with('merchant')->lockForUpdate()->findMany(collect($data['items'])->pluck('product_id'));
            if (
                $products->count() !== count($data['items'])
                || $products->pluck('merchant_id')->unique()->count() !== 1
            ) {
                abort(422, 'Checkout hanya dapat memuat produk dari satu toko.');
            }

            $total = 0;
            foreach ($data['items'] as $item) {
                $product = $products->find($item['product_id']);
                if (! $product->is_available || $product->stock < $item['quantity']) {
                    abort(422, "Stok {$product->name} tidak mencukupi.");
                }
                $total += $product->price * $item['quantity'];
            }

            $order = $request->user()->orders()->create([
                'order_number' => 'RSL-'.now()->format('Ymd').'-'.strtoupper(Str::random(6)),
                'merchant_id' => $products->first()->merchant_id,
                'total_amount' => $total,
                'shipping_type' => $data['shipping_type'],
                'delivery_address' => $data['delivery_address'] ?? null,
                'is_test' => $isTest,
            ]);
            foreach ($data['items'] as $item) {
                $product = $products->find($item['product_id']);
                $order->items()->create([
                    'product_id' => $product->id,
                    'quantity' => $item['quantity'],
                    'price' => $product->price,
                    'subtotal' => $product->price * $item['quantity'],
                ]);
                if (! $isTest) {
                    $product->decrement('stock', $item['quantity']);
                }
            }

            return $order->load(['user', 'items.product']);
        });
    }
}
