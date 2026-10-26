<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Merchant;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class MerchantVerificationController extends Controller
{
    public function pending(): JsonResponse
    {
        $stores = Merchant::query()
            ->with('user:id,name')
            ->where('is_verified', false)
            ->whereNull('rejected_at')
            ->latest()
            ->get();

        return response()->json(['data' => $stores]);
    }

    public function rejected(): JsonResponse
    {
        $stores = Merchant::query()
            ->with('user:id,name')
            ->where('is_verified', false)
            ->whereNotNull('rejected_at')
            ->latest('rejected_at')
            ->get();

        return response()->json(['data' => $stores]);
    }

    public function approve(Merchant $merchant): JsonResponse
    {
        abort_unless($merchant->hasVerifiedTegalLocation(), 422, 'Store location must be checked and within the permitted Tegal area before approval.');

        $approved = DB::transaction(function () use ($merchant): Merchant {
            $store = Merchant::query()->lockForUpdate()->findOrFail($merchant->id);
            abort_unless($store->hasVerifiedTegalLocation(), 422, 'Store location must be checked and within the permitted Tegal area before approval.');
            $store->forceFill(['is_verified' => true, 'rejected_at' => null])->save();

            return $store->load('user:id,name');
        });

        return response()->json([
            'message' => 'Store approved successfully.',
            'data' => $approved,
        ]);
    }

    public function reject(Merchant $merchant): JsonResponse
    {
        $rejected = DB::transaction(function () use ($merchant): Merchant {
            $store = Merchant::query()->lockForUpdate()->findOrFail($merchant->id);
            $store->forceFill(['is_verified' => false, 'rejected_at' => now()])->save();

            return $store->load('user:id,name');
        });

        return response()->json([
            'message' => 'Store rejected successfully.',
            'data' => $rejected,
        ]);
    }
}
