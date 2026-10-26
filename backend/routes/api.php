<?php

use App\Http\Controllers\Api\V1\Admin\MerchantVerificationController;
use App\Http\Controllers\Api\V1\Admin\SiteContentController;
use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\Customer\OrderController;
use App\Http\Controllers\Api\V1\Merchant\MerchantController;
use App\Http\Controllers\Api\V1\Merchant\ProductController;
use App\Http\Controllers\Api\V1\OrderMessageController;
use App\Http\Controllers\Api\V1\Public\CatalogController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('categories', [CatalogController::class, 'categories']);
    Route::get('stores', [CatalogController::class, 'stores']);
    Route::get('stores/{slug}', [CatalogController::class, 'store']);
    Route::get('home-content', [CatalogController::class, 'homeContent']);
    Route::get('products', [CatalogController::class, 'products']);
    Route::get('products/{slug}', [CatalogController::class, 'show']);

    Route::prefix('auth')->group(function (): void {
        Route::post('register', [AuthController::class, 'register']);
        Route::post('login', [AuthController::class, 'login']);

        Route::middleware('auth:sanctum')->group(function (): void {
            Route::post('logout', [AuthController::class, 'logout']);
            Route::get('me', [AuthController::class, 'me']);
        });
    });

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('orders/{order}/messages', [OrderMessageController::class, 'index'])->middleware('throttle:60,1');
        Route::post('orders/{order}/messages', [OrderMessageController::class, 'store'])->middleware('throttle:60,1');
        Route::get('seller/store', [MerchantController::class, 'application'])->middleware('throttle:60,1');
        Route::post('seller/store', [MerchantController::class, 'store'])->middleware('throttle:6,1');
        Route::put('seller/store', [MerchantController::class, 'updateApplication'])->middleware('throttle:6,1');
        Route::post('seller/location/resolve', [MerchantController::class, 'resolveLocation'])->middleware('throttle:6,1');
        Route::post('seller/location/search', [MerchantController::class, 'searchLocation'])->middleware('throttle:6,1');
        Route::post('merchant/register-store', [MerchantController::class, 'store'])->middleware('throttle:6,1');
    });

    Route::middleware('auth:sanctum')->prefix('customer')->group(function (): void {
        Route::get('orders', [OrderController::class, 'index']);
        Route::post('orders', [OrderController::class, 'store']);
        if (app()->environment(['local', 'testing'])) {
            Route::post('orders/test', [OrderController::class, 'storeTest'])->middleware('role:customer');
        }
    });

    Route::middleware(['auth:sanctum', 'role:admin', 'throttle:60,1'])->prefix('admin')->name('admin.')->group(function (): void {
        Route::get('site-content', [SiteContentController::class, 'index']);
        Route::put('site-content/settings', [SiteContentController::class, 'saveSettings']);
        Route::post('site-content/categories', [SiteContentController::class, 'saveCategory']);
        Route::put('site-content/categories/{category}', [SiteContentController::class, 'saveCategory']);
        Route::delete('site-content/categories/{category}', [SiteContentController::class, 'deleteCategory']);
        Route::post('site-content/banners', [SiteContentController::class, 'saveBanner']);
        Route::put('site-content/banners/{banner}', [SiteContentController::class, 'saveBanner']);
        Route::delete('site-content/banners/{banner}', [SiteContentController::class, 'deleteBanner']);
        Route::get('merchant-stores/pending', [MerchantVerificationController::class, 'pending'])->name('merchant-stores.pending');
        Route::get('merchant-stores/rejected', [MerchantVerificationController::class, 'rejected'])->name('merchant-stores.rejected');
        Route::post('merchant-stores/{merchant}/approve', [MerchantVerificationController::class, 'approve'])->name('merchant-stores.approve');
        Route::post('merchant-stores/{merchant}/reject', [MerchantVerificationController::class, 'reject'])->name('merchant-stores.reject');
    });

    Route::middleware(['auth:sanctum', 'approved-merchant'])->prefix('merchant')->group(function (): void {
        Route::get('my-store', [MerchantController::class, 'show']);
        Route::put('my-store', [MerchantController::class, 'update']);
        Route::get('products', [MerchantController::class, 'products']);
        Route::post('products', [ProductController::class, 'store']);
        Route::put('products/{product}', [ProductController::class, 'update']);
        Route::delete('products/{product}', [ProductController::class, 'destroy']);
        Route::get('orders', [MerchantController::class, 'orders']);
        Route::patch('orders/{order}/status', [MerchantController::class, 'updateOrderStatus']);
    });
});
