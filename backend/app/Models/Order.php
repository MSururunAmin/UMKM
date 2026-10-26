<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    protected $fillable = ['order_number', 'merchant_id', 'total_amount', 'status', 'shipping_type', 'delivery_address', 'snap_token', 'is_test'];
    protected function casts(): array { return ['total_amount' => 'decimal:2', 'is_test' => 'boolean']; }
    public function user() { return $this->belongsTo(User::class); }
    public function merchant() { return $this->belongsTo(Merchant::class); }
    public function items() { return $this->hasMany(OrderItem::class); }
    public function messages() { return $this->hasMany(OrderMessage::class); }
}
