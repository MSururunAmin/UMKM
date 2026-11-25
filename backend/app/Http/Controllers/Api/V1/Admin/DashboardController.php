<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Merchant;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $paidStatuses = ['paid', 'processing', 'completed'];

        $chart = collect(range(6, 0))->map(function (int $daysAgo): array {
            $date = Carbon::today()->subDays($daysAgo);

            return [
                'label' => $date->translatedFormat('D'),
                'orders' => Order::query()->whereDate('created_at', $date)->count(),
                'revenue' => (float) Order::query()
                    ->whereDate('created_at', $date)
                    ->whereIn('status', ['paid', 'processing', 'completed'])
                    ->sum('total_amount'),
            ];
        })->values();

        $recentOrders = Order::query()
            ->with(['user:id,name', 'merchant:id,store_name'])
            ->latest()
            ->limit(6)
            ->get(['id', 'order_number', 'total_amount', 'status', 'created_at', 'user_id', 'merchant_id']);

        $recentStores = Merchant::query()
            ->with('user:id,name')
            ->latest()
            ->limit(5)
            ->get(['id', 'store_name', 'address', 'is_verified', 'rejected_at', 'created_at', 'user_id']);

        return response()->json([
            'data' => [
                'metrics' => [
                    'users' => User::query()->count(),
                    'customers' => User::query()->where('role', 'customer')->count(),
                    'merchants' => Merchant::query()->where('is_verified', true)->count(),
                    'pending_merchants' => Merchant::query()->where('is_verified', false)->whereNull('rejected_at')->count(),
                    'products' => Product::query()->count(),
                    'orders' => Order::query()->count(),
                    'active_orders' => Order::query()->whereIn('status', ['pending', 'paid', 'processing'])->count(),
                    'revenue' => (float) Order::query()->whereIn('status', $paidStatuses)->sum('total_amount'),
                ],
                'chart' => $chart,
                'recent_orders' => $recentOrders,
                'recent_stores' => $recentStores,
            ],
        ]);
    }
}
