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
                'nama' => 'Moderator JTIK',
                'email' => 'moderator@jtik.polsub.ac.id',
                'password' => Hash::make('moderator123'),
                'is_active' => true,
                'role' => 'moderator',
            ],
        ];

        foreach ($admins as $admin) {
            $record = Admin::firstOrCreate(
                ['email' => $admin['email']],
                $admin
            );
            $record->update([
                'nama' => $admin['nama'],
                'password' => $admin['password'],
                'role' => $admin['role'],
                'is_active' => $admin['is_active'],
            ]);
        }

        $this->command->info('✓ Admin users seeded successfully!');
        $this->command->info('  Test credentials:');
        $this->command->info('  Email: kajur@jtik.polsub.ac.id | Password: kajur123 (Administrator)');
        $this->command->info('  Email: moderator@jtik.polsub.ac.id | Password: moderator123 (Moderator)');
    }
}
