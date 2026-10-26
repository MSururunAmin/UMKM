<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderMessageController extends Controller
{
    public function index(Request $request, Order $order): JsonResponse
    {
        $this->authorizeOrderParticipant($request, $order);

        $messages = $order->messages()
            ->with('user:id,name')
            ->latest('id')
            ->limit(100)
            ->get()
            ->reverse()
            ->values();

        return response()->json(['data' => $messages]);
    }

    public function store(Request $request, Order $order): JsonResponse
    {
        $this->authorizeOrderParticipant($request, $order);
        $data = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
        ]);

        $message = $order->messages()->create([
            'user_id' => $request->user()->id,
            'message' => trim($data['message']),
        ]);

        return response()->json(['data' => $message->load('user:id,name')], 201);
    }

    private function authorizeOrderParticipant(Request $request, Order $order): void
    {
        $user = $request->user();
        $isCustomer = $order->user_id === $user->id;
        $merchant = $user->merchant;
        $isMerchant = $merchant
            && $merchant->id === $order->merchant_id
            && $merchant->is_verified
            && ! $merchant->rejected_at;

        abort_unless($isCustomer || $isMerchant, 404);
    }
}
