<?php

namespace App\Http\Controllers\Api\V1\Merchant;

use App\Exceptions\LocationVerificationUnavailable;
use App\Http\Controllers\Controller;
use App\Models\Merchant;
use App\Models\Order;
use App\Services\TegalLocationVerifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MerchantController extends Controller
{
    public function store(Request $request, TegalLocationVerifier $locationVerifier): JsonResponse
    {
        if (! in_array(strtolower(trim((string) $request->user()->role)), ['customer', 'merchant'], true)) {
            return response()->json(['message' => 'Only customer accounts can register a store.'], 403);
        }

        $existing = $request->user()->merchant()->with('user:id,name,phone')->first();
        if ($existing) {
            return response()->json([
                'message' => 'A store application already exists for this account.',
                'data' => $existing,
            ]);
        }

        $data = $request->validate($this->applicationRules());
        $location = $this->verifiedLocation($data, $locationVerifier);
        if ($location instanceof JsonResponse) {
            return $location;
        }

        $hasPhone = array_key_exists('phone', $data);
        $phone = $data['phone'] ?? null;
        unset($data['phone']);
        $data = [...$data, ...$location, 'location_checked_at' => now()];

        [$merchant, $created] = DB::transaction(function () use ($request, $data, $hasPhone, $phone): array {
            $user = $request->user()->newQuery()->lockForUpdate()->findOrFail($request->user()->id);
            $existing = $user->merchant()->lockForUpdate()->first();

            if ($existing) {
                return [$existing, false];
            }

            if ($hasPhone) {
                $user->phone = $phone;
                $user->save();
            }

            $merchant = $user->merchant()->create([
                ...$data,
                'slug' => Str::slug($data['store_name']).'-'.Str::lower(Str::random(5)),
            ]);
            $merchant->forceFill([
                'is_verified' => false,
                'rejected_at' => null,
                'is_open' => true,
            ])->save();

            return [$merchant, true];
        });

        if (! $created) {
            return response()->json([
                'message' => 'A store application already exists for this account.',
                'data' => $merchant->load('user:id,name,phone'),
            ], 200);
        }

        return response()->json([
            'message' => 'Store application submitted for administrator review.',
            'data' => $merchant->load('user:id,name,phone'),
        ], 201);
    }

    public function updateApplication(Request $request, TegalLocationVerifier $locationVerifier): JsonResponse
    {
        $merchant = $request->user()->merchant()->firstOrFail();
        abort_if($merchant->is_verified || $merchant->rejected_at !== null, 403, 'Only pending store applications can be updated.');

        $data = $request->validate($this->applicationRules());
        $location = $this->verifiedLocation($data, $locationVerifier);
        if ($location instanceof JsonResponse) {
            return $location;
        }

        $phone = $data['phone'] ?? null;
        unset($data['phone']);
        $merchant->update([...$data, ...$location, 'location_checked_at' => now()]);
        if (array_key_exists('phone', $request->all())) {
            $request->user()->update(['phone' => $phone]);
        }

        return response()->json([
            'message' => 'Store application updated and remains pending administrator review.',
            'data' => $merchant->fresh()->load('user:id,name,phone'),
        ]);
    }

    private function applicationRules(): array
    {
        return [
            'store_name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'address' => ['required', 'string', 'max:2000'],
            'province' => ['required', 'string', 'max:100'],
            'regency' => ['required', 'string', 'in:Kota Tegal,Kabupaten Tegal'],
            'district' => ['nullable', 'string', 'max:150'],
            'village' => ['required', 'string', 'max:150'],
            'latitude' => ['required', 'numeric', 'decimal:0,7', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'decimal:0,7', 'between:-180,180'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:30'],
        ];
    }

    private function verifiedLocation(array $data, TegalLocationVerifier $locationVerifier): array|JsonResponse
    {
        try {
            $location = $locationVerifier->verify(
                (float) $data['latitude'],
                (float) $data['longitude'],
                $data['province'],
                $data['regency'],
                $data['district'] ?? '',
                $data['village'],
            );
        } catch (LocationVerificationUnavailable) {
            return response()->json([
                'message' => 'Lokasi belum dapat dicek melalui OpenStreetMap. Coba lagi beberapa saat.',
            ], 503);
        }

        if ($location === null) {
            return response()->json([
                'message' => 'Koordinat dan wilayah administratif tidak cocok atau berada di luar Kota/Kabupaten Tegal.',
                'errors' => [
                    'latitude' => ['Pilih titik lokasi usaha yang berada di wilayah Tegal dan sesuai dengan alamat administratif.'],
                    'regency' => ['Wilayah tidak dapat dikonfirmasi dari koordinat yang dipilih.'],
                    'district' => ['Kecamatan tidak cocok dengan hasil pemeriksaan koordinat.'],
                    'village' => ['Kelurahan/desa tidak cocok dengan hasil pemeriksaan koordinat.'],
                ],
            ], 422);
        }

        return $location;
    }

    public function application(Request $request): JsonResponse
    {
        $merchant = $request->user()->merchant()->with('user:id,name,phone')->first();

        return response()->json(['data' => $merchant]);
    }

    public function resolveLocation(Request $request, TegalLocationVerifier $locationVerifier): JsonResponse
    {
        $data = $request->validate([
            'latitude' => ['required', 'numeric', 'decimal:0,7', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'decimal:0,7', 'between:-180,180'],
        ]);

        try {
            $location = $locationVerifier->lookup((float) $data['latitude'], (float) $data['longitude']);
        } catch (LocationVerificationUnavailable) {
            return response()->json([
                'message' => 'Lokasi belum dapat dicek melalui OpenStreetMap. Coba lagi beberapa saat.',
            ], 503);
        }

        if ($location === null) {
            return response()->json([
                'message' => 'Titik tidak dapat dikonfirmasi berada di Kota Tegal atau Kabupaten Tegal.',
            ], 422);
        }

        return response()->json(['data' => $location]);
    }

    public function searchLocation(Request $request, TegalLocationVerifier $locationVerifier): JsonResponse
    {
        $data = $request->validate([
            'address' => ['required', 'string', 'min:8', 'max:500'],
        ]);

        try {
            $locations = $locationVerifier->search($data['address']);
        } catch (LocationVerificationUnavailable) {
            return response()->json([
                'message' => 'Alamat belum dapat dicari melalui OpenStreetMap. Coba lagi beberapa saat.',
            ], 503);
        }

        if ($locations === []) {
            return response()->json([
                'message' => 'Alamat belum ditemukan di OpenStreetMap. Coba masukkan nama jalan atau kelurahan saja; jika bangunan belum tercatat di peta, klik titik lokasi toko secara manual.',
            ], 404);
        }

        return response()->json(['data' => $locations]);
    }

    public function show(Request $request): JsonResponse
    {
        return response()->json(['data' => $request->user()->merchant()->with('products.category')->firstOrFail()]);
    }

    public function update(Request $request, TegalLocationVerifier $locationVerifier): JsonResponse
    {
        $merchant = $request->user()->merchant()->firstOrFail();
        $locationFields = ['address', 'province', 'regency', 'district', 'village', 'latitude', 'longitude'];
        $containsLocationChange = array_intersect($locationFields, array_keys($request->all())) !== [];
        $data = $request->validate([
            'store_name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'is_open' => ['sometimes', 'boolean'],
        ]);

        if ($containsLocationChange) {
            $locationData = $request->validate([
                'address' => ['required', 'string', 'max:2000'],
                'province' => ['required', 'string', 'max:100'],
                'regency' => ['required', 'string', 'in:Kota Tegal,Kabupaten Tegal'],
                'district' => ['nullable', 'string', 'max:150'],
                'village' => ['required', 'string', 'max:150'],
                'latitude' => ['required', 'numeric', 'decimal:0,7', 'between:-90,90'],
                'longitude' => ['required', 'numeric', 'decimal:0,7', 'between:-180,180'],
            ]);
            $location = $this->verifiedLocation($locationData, $locationVerifier);
            if ($location instanceof JsonResponse) {
                return $location;
            }
            $data = [...$data, ...$locationData, ...$location, 'location_checked_at' => now()];
        }

        $merchant->update($data);

        return response()->json(['data' => $merchant->fresh()]);
    }

    public function products(Request $request): JsonResponse
    {
        $merchant = Merchant::where('user_id', $request->user()->id)->first();
        if (! $merchant) {
            return response()->json(['message' => 'Store profile not found for this user'], 403);
        }

        return response()->json(['data' => $merchant->products()->with('category')->latest()->get()]);
    }

    public function orders(Request $request): JsonResponse
    {
        $merchant = Merchant::where('user_id', $request->user()->id)->first();
        if (! $merchant) {
            return response()->json(['message' => 'Store profile not found for this user'], 403);
        }

        return response()->json([
            'data' => $merchant->orders()->with(['merchant:id,store_name', 'user:id,name,phone', 'items.product'])->latest()->get(),
        ]);
    }

    public function updateOrderStatus(Request $request, Order $order): JsonResponse
    {
        abort_unless($order->merchant_id === $request->user()->merchant?->id, 404);
        $order->update($request->validate(['status' => ['required', 'in:processing,completed,cancelled']]));

        return response()->json(['data' => $order]);
    }
}
