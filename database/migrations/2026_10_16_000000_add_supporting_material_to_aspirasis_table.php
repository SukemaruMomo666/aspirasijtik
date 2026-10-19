<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('aspirasis', function (Blueprint $table) {
            $table->text('saran_pelapor')->nullable()->after('isi');
            $table->json('tautan_pendukung')->nullable()->after('saran_pelapor');
            $table->json('lampiran')->nullable()->after('tautan_pendukung');
        });
    }

    public function down(): void
    {
        Schema::table('aspirasis', function (Blueprint $table) {
            $table->dropColumn(['saran_pelapor', 'tautan_pendukung', 'lampiran']);
        });
    }
};
