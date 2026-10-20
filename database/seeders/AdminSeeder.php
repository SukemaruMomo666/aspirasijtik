<?php

namespace Database\Seeders;

use App\Models\Admin;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            $this->command->warn('AdminSeeder dilewati di luar environment local/testing.');

            return;
        }

        $admins = [
            [
                'nama' => 'Ketua Jurusan JTIK',
                'email' => 'kajur@jtik.polsub.ac.id',
                'password' => Hash::make('kajur123'),
                'is_active' => true,
                'role' => 'admin',
            ],
            [
                'nama' => 'Sekretaris Jurusan JTIK',
                'email' => 'sekjur@jtik.polsub.ac.id',
                'password' => Hash::make('sekjur123'),
                'is_active' => true,
                'role' => 'admin',
            ],
        ];

        // Hapus akun moderator lama jika ada
        Admin::where('role', 'moderator')->orWhere('email', 'admin@jtik.polsub.ac.id')->delete();

        foreach ($admins as $admin) {
            $record = Admin::firstOrCreate(
                ['email' => $admin['email']],
                $admin
            );
            $record->update([
                'nama' => $admin['nama'],
                'password' => $admin['password'],
                'role' => 'admin',
                'is_active' => $admin['is_active'],
            ]);
        }

        $this->command->info('✓ Admin users seeded successfully!');
        $this->command->info('  Akun Pengurus / Administrator:');
        $this->command->info('  1. Email: kajur@jtik.polsub.ac.id  | Password: kajur123  (Ketua Jurusan)');
        $this->command->info('  2. Email: sekjur@jtik.polsub.ac.id | Password: sekjur123 (Sekretaris Jurusan)');
    }
}
