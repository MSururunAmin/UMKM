<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Merchant extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_name',
        'slug',
        'description',
        'address',
        'is_open',
        'province',
        'regency',
        'district',
        'village',
        'latitude',
        'longitude',
        'location_checked_at',
    ];

    protected function casts(): array
    {
        return [
            'is_verified' => 'boolean',
            'is_open' => 'boolean',
            'rejected_at' => 'datetime',
            'location_checked_at' => 'datetime',
            'latitude' => 'float',
            'longitude' => 'float',
        ];
    }

    public function scopePubliclyLocated(Builder $query): Builder
    {
        return $query
            ->where('is_verified', true)
            ->whereNotNull('location_checked_at')
            ->where('province', 'Jawa Tengah')
            ->whereIn('regency', ['Kota Tegal', 'Kabupaten Tegal'])
            ->whereBetween('latitude', [-90, 90])
            ->whereBetween('longitude', [-180, 180]);
    }

    public function hasVerifiedTegalLocation(): bool
    {
        return $this->location_checked_at !== null
            && $this->province === 'Jawa Tengah'
            && in_array($this->regency, ['Kota Tegal', 'Kabupaten Tegal'], true)
            && $this->latitude !== null
            && $this->longitude !== null
            && $this->latitude >= -90
            && $this->latitude <= 90
            && $this->longitude >= -180
            && $this->longitude <= 180;
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }
}
