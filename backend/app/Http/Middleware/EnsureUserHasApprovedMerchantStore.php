<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasApprovedMerchantStore
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        $merchant = $user?->merchant;
        $eligibleRole = in_array(strtolower(trim((string) $user?->role)), ['customer', 'merchant'], true);

        if (! $user || ! $eligibleRole || ! $merchant?->is_verified || $merchant->rejected_at !== null) {
            $message = 'An approved merchant store is required to access this resource.';

            if ($request->expectsJson()) {
                return response()->json(['message' => $message], 403);
            }

            abort(403, $message);
        }

        return $next($request);
    }
}
