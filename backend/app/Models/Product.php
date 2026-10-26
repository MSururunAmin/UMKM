<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class Product extends Model
{
    use HasFactory;

    protected $fillable = ['category_id', 'name', 'slug', 'description', 'price', 'stock', 'is_available', 'image_url'];
    protected function casts(): array { return ['price' => 'decimal:2', 'is_available' => 'boolean']; }
    protected function imageUrl(): \Illuminate\Database\Eloquent\Casts\Attribute
    {
        return \Illuminate\Database\Eloquent\Casts\Attribute::make(
            get: fn (?string $value): ?string => $value === null || Str::startsWith($value, ['http://', 'https://'])
                ? $value
                : Storage::disk('public')->url($value),
        );
    }
    public function merchant() { return $this->belongsTo(Merchant::class); }
    public function category() { return $this->belongsTo(Category::class); }
    public function orderItems() { return $this->hasMany(OrderItem::class); }
}
