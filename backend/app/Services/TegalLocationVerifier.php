<?php

namespace App\Services;

use App\Exceptions\LocationVerificationUnavailable;
use GuzzleHttp\Exception\TransferException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class TegalLocationVerifier
{
    private const ALLOWED_REGENCIES = ['Kota Tegal', 'Kabupaten Tegal'];

    public function verify(
        float $latitude,
        float $longitude,
        string $province,
        string $regency,
        string $district,
        string $village,
    ): ?array {
        $actual = $this->lookup($latitude, $longitude);
        if ($actual === null) {
            return null;
        }

        if (
            $this->normalize($province) !== $this->normalize($actual['province'])
            || $regency !== $actual['regency']
            || ($actual['district'] !== '' && $this->normalize($district) !== $this->normalize($actual['district']))
            || $this->normalize($village) !== $this->normalize($actual['village'])
        ) {
            return null;
        }

        return $actual;
    }

    public function lookup(float $latitude, float $longitude): ?array
    {
        $result = $this->reverseGeocode($latitude, $longitude);

        return $this->tegalAdministrativeLocation($result['address'] ?? null);
    }

    public function search(string $query): array
    {
        $normalizedQuery = $this->normalize($query);
        $cacheKey = 'nominatim:search:'.hash('sha256', $normalizedQuery);
        $cached = Cache::get($cacheKey);
        if (is_array($cached)) {
            return $cached;
        }

        if (! Cache::add('nominatim:request-throttle', true, 2)) {
            throw new LocationVerificationUnavailable('Location lookup is temporarily rate limited.');
        }

        try {
            $response = $this->nominatimRequest()->get(config('services.nominatim.search_url'), [
                'format' => 'jsonv2',
                'q' => str_contains(mb_strtolower($query), 'tegal')
                    ? $query
                    : $query.', Tegal, Jawa Tengah, Indonesia',
                'addressdetails' => 1,
                'countrycodes' => 'id',
                'limit' => 5,
                'accept-language' => 'id',
            ]);
        } catch (ConnectionException|TransferException $exception) {
            throw new LocationVerificationUnavailable('Location search could not connect.', previous: $exception);
        }

        if (! $response->successful()) {
            throw new LocationVerificationUnavailable('Location search returned an unsuccessful response.');
        }

        $results = $response->json();
        if (! is_array($results)) {
            throw new LocationVerificationUnavailable('Location search returned an invalid response.');
        }

        $locations = [];
        foreach ($results as $result) {
            if (! is_array($result)) {
                continue;
            }
            $administrativeLocation = $this->tegalAdministrativeLocation($result['address'] ?? null);
            if ($administrativeLocation === null || ! is_numeric($result['lat'] ?? null) || ! is_numeric($result['lon'] ?? null)) {
                continue;
            }

            $latitude = (float) $result['lat'];
            $longitude = (float) $result['lon'];
            if ($latitude < -90 || $latitude > 90 || $longitude < -180 || $longitude > 180) {
                continue;
            }

            $locations[] = [
                ...$administrativeLocation,
                'latitude' => $latitude,
                'longitude' => $longitude,
                'display_name' => (string) ($result['display_name'] ?? ''),
            ];
        }

        Cache::put($cacheKey, $locations, now()->addDays(7));

        return $locations;
    }

    private function tegalAdministrativeLocation(mixed $address): ?array
    {
        if (! is_array($address)) {
            return null;
        }

        $province = $this->valueFrom($address, ['state', 'province']);
        $regency = $this->resolveRegency($address);
        $district = $this->valueFrom($address, [
            'city_district',
            'district',
            'state_district',
            'municipality',
        ]);
        $village = $this->valueFrom($address, [
            'village',
            'suburb',
            'neighbourhood',
            'hamlet',
            'quarter',
        ]);

        if (
            $this->normalize($province) !== $this->normalize('Jawa Tengah')
            || ! in_array($regency, self::ALLOWED_REGENCIES, true)
            || $village === ''
        ) {
            return null;
        }

        return [
            'province' => 'Jawa Tengah',
            'regency' => $regency,
            'district' => $district,
            'village' => $village,
        ];
    }

    private function reverseGeocode(float $latitude, float $longitude): array
    {
        $cacheKey = 'nominatim:reverse:'.hash('sha256', sprintf('%.7f,%.7f', $latitude, $longitude));
        $cached = Cache::get($cacheKey);

        if (is_array($cached)) {
            return $cached;
        }

        if (! Cache::add('nominatim:request-throttle', true, 2)) {
            throw new LocationVerificationUnavailable('Location lookup is temporarily rate limited.');
        }

        try {
            $response = $this->nominatimRequest()->get(config('services.nominatim.url'), [
                'format' => 'jsonv2',
                'lat' => $latitude,
                'lon' => $longitude,
                'zoom' => 18,
                'addressdetails' => 1,
                'accept-language' => 'id',
            ]);
        } catch (ConnectionException|TransferException $exception) {
            throw new LocationVerificationUnavailable('Location lookup could not connect.', previous: $exception);
        }

        if (! $response->successful()) {
            throw new LocationVerificationUnavailable('Location lookup returned an unsuccessful response.');
        }

        $result = $response->json();
        if (! is_array($result)) {
            throw new LocationVerificationUnavailable('Location lookup returned an invalid response.');
        }

        Cache::put($cacheKey, $result, now()->addDays(30));

        return $result;
    }

    private function nominatimRequest(): PendingRequest
    {
        $request = Http::acceptJson()
            ->withUserAgent(config('services.nominatim.user_agent'))
            ->timeout(10);
        $caBundle = config('services.nominatim.ca_bundle');

        if (is_string($caBundle) && $caBundle !== '') {
            $request = $request->withOptions(['verify' => $caBundle]);
        }

        return $request;
    }

    private function resolveRegency(array $address): ?string
    {
        foreach (['city', 'municipality', 'county', 'regency'] as $key) {
            $value = $this->valueFrom($address, [$key]);
            $normalized = mb_strtolower(trim($value));

            if (str_contains($normalized, 'kota tegal')) {
                return 'Kota Tegal';
            }
            if (str_contains($normalized, 'kabupaten tegal') || str_contains($normalized, 'kab. tegal')) {
                return 'Kabupaten Tegal';
            }
        }

        foreach (['city', 'municipality'] as $key) {
            if ($this->normalize($this->valueFrom($address, [$key])) === 'tegal') {
                return 'Kota Tegal';
            }
        }
        foreach (['county', 'regency'] as $key) {
            if ($this->normalize($this->valueFrom($address, [$key])) === 'tegal') {
                return 'Kabupaten Tegal';
            }
        }

        return null;
    }

    private function valueFrom(array $address, array $keys): string
    {
        foreach ($keys as $key) {
            if (is_string($address[$key] ?? null)) {
                return $address[$key];
            }
        }

        return '';
    }

    private function normalize(string $value): string
    {
        $value = mb_strtolower(trim($value));
        $value = preg_replace('/\b(?:kecamatan|kec\.?|desa|kelurahan|kel\.?|kabupaten|kab\.?|kota)\b/u', ' ', $value) ?? $value;
        $value = preg_replace('/[^\p{L}\p{N}]+/u', ' ', $value) ?? $value;

        return trim(preg_replace('/\s+/u', ' ', $value) ?? $value);
    }
}
