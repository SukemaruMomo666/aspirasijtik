<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Kategori;

class KategoriSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $kategoris = [
            ['nama' => 'Akademik'],
            ['nama' => 'Fasilitas'],
            ['nama' => 'Dosen'],
            ['nama' => 'Kegiatan'],
            ['nama' => 'Lainnya'],
        ];

        foreach ($kategoris as $kategori) {
            Kategori::firstOrCreate($kategori);
        }

        $this->command->info('✓ Kategori seeded successfully!');
    }
}

