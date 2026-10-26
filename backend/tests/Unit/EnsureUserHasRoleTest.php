<?php

namespace Tests\Unit;

use App\Http\Middleware\EnsureUserHasRole;
use App\Models\User;
use Illuminate\Http\Request;
use Tests\TestCase;

class EnsureUserHasRoleTest extends TestCase
{
    public function test_it_authorizes_using_the_refreshed_user_role(): void
    {
        $request = $this->requestWithRefreshedRole('customer', 'MERCHANT');

        $response = (new EnsureUserHasRole())->handle(
            $request,
            fn () => response()->json(['data' => 'authorized']),
            'merchant',
        );

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('{"data":"authorized"}', $response->getContent());
    }

    public function test_it_denies_a_user_whose_refreshed_role_is_not_allowed(): void
    {
        $request = $this->requestWithRefreshedRole('merchant', 'customer');

        $response = (new EnsureUserHasRole())->handle(
            $request,
            fn () => response()->json(['data' => 'authorized']),
            'merchant',
        );

        $this->assertSame(403, $response->getStatusCode());
        $this->assertSame(
            ['message' => 'You do not have permission to access this resource.'],
            json_decode($response->getContent(), true),
        );
    }

    private function requestWithRefreshedRole(string $staleRole, string $databaseRole): Request
    {
        $user = new class extends User {
            public User $databaseRecord;

            public function fresh($with = [])
            {
                return $this->databaseRecord;
            }
        };
        $user->setAttribute('role', $staleRole);
        $user->databaseRecord = new User(['role' => $databaseRole]);

        $request = Request::create('/api/v1/merchant/products', 'GET', [], [], [], [
            'HTTP_ACCEPT' => 'application/json',
        ]);
        $request->setUserResolver(static fn () => $user);

        return $request;
    }
}
