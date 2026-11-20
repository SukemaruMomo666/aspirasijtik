<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Aspirasi;
use App\Models\Balasan;
use App\Models\Kategori;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\RequiresPhpExtension;
use Tests\TestCase;

#[RequiresPhpExtension('pdo_sqlite')]
class AdminUserManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_user_management(): void
    {
        $this->getJson('/api/admin/users')->assertUnauthorized();
        $this->postJson('/api/admin/users', [])->assertUnauthorized();
    }

    public function test_admin_can_list_and_create_users(): void
    {
        $admin = Admin::create([
            'nama' => 'Admin Utama',
            'email' => 'admin@jtik.polsub.ac.id',
            'password' => Hash::make('password123'),
            'is_active' => true,
            'role' => 'admin',
        ]);

        $token = $admin->createToken('admin-token')->plainTextToken;

        // List
        $res = $this->withToken($token)->getJson('/api/admin/users')->assertOk();
        $this->assertEquals(1, $res->json('counts.total'));
        $this->assertEquals(1, $res->json('counts.admin'));

        // Create new admin user
        $createRes = $this->withToken($token)->postJson('/api/admin/users', [
            'nama' => 'Dosen Peninjau',
            'email' => 'peninjau@jtik.polsub.ac.id',
            'password' => 'password123',
            'is_active' => true,
        ])->assertCreated();

        $this->assertDatabaseHas('admins', [
            'email' => 'peninjau@jtik.polsub.ac.id',
            'role' => 'admin',
        ]);
    }

    public function test_admin_cannot_deactivate_or_delete_self(): void
    {
        $admin = Admin::create([
            'nama' => 'Admin Utama',
            'email' => 'admin@jtik.polsub.ac.id',
            'password' => Hash::make('password123'),
            'is_active' => true,
            'role' => 'admin',
        ]);

        $token = $admin->createToken('admin-token')->plainTextToken;

        // Try deactivating self
        $this->withToken($token)->putJson("/api/admin/users/{$admin->id}", [
            'nama' => 'Admin Utama',
            'email' => 'admin@jtik.polsub.ac.id',
            'is_active' => false,
        ])->assertUnprocessable();

        // Try quick toggle self
        $this->withToken($token)->patchJson("/api/admin/users/{$admin->id}/toggle-status")
            ->assertUnprocessable();

        // Try delete self
        $this->withToken($token)->deleteJson("/api/admin/users/{$admin->id}")
            ->assertUnprocessable();
    }

    public function test_cannot_delete_or_deactivate_last_active_admin(): void
    {
        $admin = Admin::create([
            'nama' => 'Satu Satunya Admin',
            'email' => 'onlyadmin@jtik.polsub.ac.id',
            'password' => Hash::make('password123'),
            'is_active' => true,
            'role' => 'admin',
        ]);

        $admin2 = Admin::create([
            'nama' => 'Admin Kedua',
            'email' => 'admin2@jtik.polsub.ac.id',
            'password' => Hash::make('password123'),
            'is_active' => true,
            'role' => 'admin',
        ]);

        $token1 = $admin->createToken('admin-token')->plainTextToken;

        // Deactivate admin2 -> success because admin1 is still active
        $this->withToken($token1)->patchJson("/api/admin/users/{$admin2->id}/toggle-status")->assertOk();

        // Now admin2 is inactive. Trying to deactivate admin1 must fail
        $this->withToken($token1)->putJson("/api/admin/users/{$admin->id}", [
            'nama' => 'Admin Update',
            'email' => 'onlyadmin@jtik.polsub.ac.id',
            'is_active' => false,
        ])->assertUnprocessable();
    }

    public function test_cannot_delete_user_who_has_replied_to_aspirasi(): void
    {
        $admin = Admin::create([
            'nama' => 'Admin Utama',
            'email' => 'admin@jtik.polsub.ac.id',
            'password' => Hash::make('password123'),
            'is_active' => true,
            'role' => 'admin',
        ]);

        $admin2 = Admin::create([
            'nama' => 'Admin Aktif',
            'email' => 'admin2@jtik.polsub.ac.id',
            'password' => Hash::make('password123'),
            'is_active' => true,
            'role' => 'admin',
        ]);

        $kategori = Kategori::create(['nama' => 'Akademik']);
        $aspirasi = Aspirasi::create([
            'kategori_id' => $kategori->id,
            'kode_tiket' => 'JTIK-TEST-1234',
            'judul' => 'Judul Test',
            'isi' => 'Isi aspirasi test',
            'is_anonim' => true,
            'ip_hash' => str_repeat('a', 64),
        ]);

        Balasan::create([
            'aspirasi_id' => $aspirasi->id,
            'admin_id' => $admin2->id,
            'isi' => 'Tanggapan resmi dari pengurus',
        ]);

        $token = $admin->createToken('admin-token')->plainTextToken;

        // Try deleting admin who has reply history -> should reject with 422 to preserve data integrity
        $this->withToken($token)->deleteJson("/api/admin/users/{$admin2->id}")
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Pengurus ini telah memiliki riwayat tanggapan pada aspirasi mahasiswa. Demi menjaga keaslian arsip, silakan nonaktifkan akun ini sebagai gantinya.');
    }
}
