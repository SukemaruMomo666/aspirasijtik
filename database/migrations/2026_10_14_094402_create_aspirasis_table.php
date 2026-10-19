<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('aspirasis', function (Blueprint $table) {
            $table->id();
            $table->foreignId('kategori_id')->constrained('kategoris');
            $table->string('kode_tiket', 8)->unique();
            $table->string('judul');
            $table->text('isi');
            $table->string('nama')->nullable();
            $table->string('nim', 20)->nullable();
            $table->boolean('is_anonim')->default(false);
            $table->enum('status', ['Diterima', 'Diproses', 'Selesai', 'Ditolak'])->default('Diterima');
            $table->boolean('is_publik')->default(false);
            $table->boolean('is_privat')->default(false);
            $table->string('ip_hash', 64);
            $table->boolean('has_badwords')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('aspirasis');
    }
};
