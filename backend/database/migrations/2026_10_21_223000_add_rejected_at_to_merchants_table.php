<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('merchants', function (Blueprint $table) {
            $table->timestamp('rejected_at')->nullable()->after('is_verified');
            $table->index(['is_verified', 'rejected_at']);
        });
    }

    public function down(): void
    {
        Schema::table('merchants', function (Blueprint $table) {
            $table->dropIndex(['is_verified', 'rejected_at']);
            $table->dropColumn('rejected_at');
        });
    }
};
