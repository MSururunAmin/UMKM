<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'in:pending,paid,processing,completed,cancelled'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $orders = Order::query()
            ->with([
                'user:id,name,email',
                'merchant:id,store_name',
                'items.product:id,name',
            ])
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('order_number', 'like', "%{$search}%")
                        ->orWhereHas('user', fn ($userQuery) => $userQuery->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('merchant', fn ($merchantQuery) => $merchantQuery->where('store_name', 'like', "%{$search}%"));
                });
            })
            ->latest()
            ->paginate(15);

        return response()->json($orders);
    }
}
