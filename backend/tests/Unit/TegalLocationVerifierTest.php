<?php

namespace Tests\Unit;

use App\Exceptions\LocationVerificationUnavailable;
use App\Services\TegalLocationVerifier;
use GuzzleHttp\Exception\RequestException;
use GuzzleHttp\Psr7\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TegalLocationVerifierTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        config([
            'services.nominatim.url' => 'https://nominatim.openstreetmap.org/reverse',
            'services.nominatim.user_agent' => 'Rasa Lokal test',
        ]);
    }

    public function test_location_lookup_accepts_kota_tegal_administrative_data(): void
    {
        Http::fake([
            'nominatim.openstreetmap.org/reverse*' => Http::response([
                'address' => [
                    'state' => 'Jawa Tengah',
                    'city' => 'Tegal',
                    'city_district' => 'Tegal Timur',
                    'village' => 'Kejambon',
                ],
            ]),
        ]);

        $location = app(TegalLocationVerifier::class)->lookup(-6.88, 109.14);

        $this->assertSame([
            'province' => 'Jawa Tengah',
            'regency' => 'Kota Tegal',
            'district' => 'Tegal Timur',
            'village' => 'Kejambon',
        ], $location);
    }

    public function test_location_lookup_accepts_kabupaten_tegal_administrative_data(): void
    {
        Http::fake([
            'nominatim.openstreetmap.org/reverse*' => Http::response([
                'address' => [
                    'state' => 'Jawa Tengah',
                    'county' => 'Tegal',
                    'state_district' => 'Kecamatan Slawi',
                    'village' => 'Slawi Kulon',
                ],
            ]),
        ]);

        $location = app(TegalLocationVerifier::class)->lookup(-6.9812, 109.1401);

        $this->assertSame('Kabupaten Tegal', $location['regency']);
        $this->assertSame('Kecamatan Slawi', $location['district']);
        $this->assertSame('Slawi Kulon', $location['village']);
    }

    public function test_location_verification_rejects_a_user_selected_regency_that_disagrees_with_coordinates(): void
    {
        Http::fake([
            'nominatim.openstreetmap.org/reverse*' => Http::response([
                'address' => [
                    'state' => 'Jawa Tengah',
                    'county' => 'Brebes',
                    'state_district' => 'Kecamatan Brebes',
                    'village' => 'Brebes',
                ],
            ]),
        ]);

        $location = app(TegalLocationVerifier::class)->verify(
            -6.87,
            109.04,
            'Jawa Tengah',
            'Kabupaten Tegal',
            'Brebes',
            'Brebes',
        );

        $this->assertNull($location);
    }

    public function test_location_verification_accepts_a_tegal_point_when_osm_has_no_district_and_discards_unverified_district_input(): void
    {
        Http::fake([
            'nominatim.openstreetmap.org/reverse*' => Http::response([
                'address' => [
                    'state' => 'Jawa Tengah',
                    'city' => 'Tegal',
                    'village' => 'Debong Lor',
                ],
            ]),
        ]);

        $location = app(TegalLocationVerifier::class)->verify(
            -6.8797,
            109.1256,
            'Jawa Tengah',
            'Kota Tegal',
            'Kecamatan yang tidak diverifikasi',
            'Debong Lor',
        );

        $this->assertSame([
            'province' => 'Jawa Tengah',
            'regency' => 'Kota Tegal',
            'district' => '',
            'village' => 'Debong Lor',
        ], $location);
    }

    public function test_location_verification_fails_explicitly_when_nominatim_is_unavailable(): void
    {
        Http::fake([
            'nominatim.openstreetmap.org/reverse*' => Http::response([], 503),
        ]);

        $this->expectException(LocationVerificationUnavailable::class);

        app(TegalLocationVerifier::class)->lookup(-6.88, 109.14);
    }

    public function test_address_search_only_returns_locations_in_the_permitted_tegal_areas(): void
    {
        Http::fake([
            'nominatim.openstreetmap.org/search*' => Http::response([
                [
                    'lat' => '-6.88',
                    'lon' => '109.14',
                    'display_name' => 'Kejambon, Kota Tegal, Jawa Tengah, Indonesia',
                    'address' => [
                        'state' => 'Jawa Tengah',
                        'city' => 'Kota Tegal',
                        'city_district' => 'Tegal Timur',
                        'village' => 'Kejambon',
                    ],
                ],
                [
                    'lat' => '-6.87',
                    'lon' => '109.04',
                    'display_name' => 'Brebes, Jawa Tengah, Indonesia',
                    'address' => [
                        'state' => 'Jawa Tengah',
                        'county' => 'Brebes',
                        'state_district' => 'Brebes',
                        'village' => 'Brebes',
                    ],
                ],
            ]),
        ]);

        $locations = app(TegalLocationVerifier::class)->search('Jalan Kejambon');

        $this->assertCount(1, $locations);
        $this->assertSame('Kota Tegal', $locations[0]['regency']);
        $this->assertSame(-6.88, $locations[0]['latitude']);
        $this->assertSame(109.14, $locations[0]['longitude']);
    }

    public function test_address_search_fails_explicitly_when_nominatim_is_unavailable(): void
    {
        Http::fake([
            'nominatim.openstreetmap.org/search*' => Http::response([], 503),
        ]);

        $this->expectException(LocationVerificationUnavailable::class);

        app(TegalLocationVerifier::class)->search('Jalan Kejambon, Tegal');
    }

    public function test_address_search_converts_transport_errors_to_location_unavailable(): void
    {
        Http::fake(fn () => throw new RequestException(
            'cURL error 77: error setting certificate file',
            new Request('GET', 'https://nominatim.openstreetmap.org/search'),
        ));

        $this->expectException(LocationVerificationUnavailable::class);

        app(TegalLocationVerifier::class)->search('Jalan Kejambon, Tegal');
    }
}
