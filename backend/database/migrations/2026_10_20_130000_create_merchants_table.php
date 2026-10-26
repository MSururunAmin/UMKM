<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('merchants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('store_name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->text('address');
            $table->boolean('is_verified')->default(false);
            $table->boolean('is_open')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void { Schema::dropIfExists('merchants'); }
};
