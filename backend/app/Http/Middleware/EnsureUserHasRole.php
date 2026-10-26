<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user()?->fresh();
        $allowedRoles = array_map(static fn (string $role): string => strtolower(trim($role)), $roles);

        if (! $user || ! in_array(strtolower(trim((string) $user->role)), $allowedRoles, true)) {
            $message = 'You do not have permission to access this resource.';

            if ($request->expectsJson()) {
                return response()->json(['message' => $message], 403);
            }

            abort(403, $message);
        }

        return $next($request);
    }
}
