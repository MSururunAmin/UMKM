<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SiteSetting extends Model
{
    protected $fillable = [
        'home_badge',
        'home_title',
        'home_description',
        'home_card_emoji',
        'home_card_label',
        'home_card_title',
        'category_eyebrow',
        'category_title',
        'featured_eyebrow',
        'featured_title',
        'seller_eyebrow',
        'seller_title',
        'seller_description',
        'seller_button',
    ];
}
