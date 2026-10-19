<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Aspirasi;
use App\Models\Kategori;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\RequiresPhpExtension;
use Tests\TestCase;

#[RequiresPhpExtension('pdo_sqlite')]
class AdminApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_login_and_use_sanctum_protected_api(): void
    {
        $admin = Admin::create([
            'nama' => 'Admin Test',
            'email' => 'admin@example.test',
            'password' => Hash::make('secret-password'),
            'is_active' => true,
            'role' => 'admin',
        ]);

        $login = $this->postJson('/api/admin/login', [
            'email' => 'admin@example.test',
            'password' => 'secret-password',
        ])->assertOk()->assertJsonStructure(['token', 'admin' => ['id', 'email']]);

        $token = $login->json('token');

        $this->withToken($token)
            ->getJson('/api/admin/profile')
            ->assertOk()
            ->assertJsonPath('id', $admin->id);

        $this->getJson('/api/admin/aspirasi?status=not-a-status')->assertUnprocessable();
        $this->getJson('/api/admin/aspirasi?per_page=1000')->assertUnprocessable();
    }

    public function test_admin_routes_reject_guests_and_login_rejects_bad_password(): void
    {
        $this->getJson('/api/admin/profile')->assertUnauthorized();

        Admin::create([
            'nama' => 'Admin Test',
            'email' => 'admin@example.test',
            'password' => Hash::make('secret-password'),
            'is_active' => true,
            'role' => 'admin',
        ]);

        $this->postJson('/api/admin/login', [
            'email' => 'admin@example.test',
            'password' => 'wrong-password',
        ])->assertUnauthorized();
    }

    public function test_only_admin_can_change_public_visibility(): void
    {
        $kategori = Kategori::create(['nama' => 'Akademik']);
        $aspirasi = Aspirasi::create([
            'kategori_id' => $kategori->id,
            'kode_tiket' => 'ROLE1234',
            'judul' => 'Usulan perbaikan jadwal kuliah',
            'isi' => 'Mohon jadwal kuliah diumumkan lebih awal setiap semester.',
            'is_anonim' => true,
            'ip_hash' => str_repeat('a', 64),
        ]);
        $moderator = Admin::create([
            'nama' => 'Moderator',
            'email' => 'moderator@example.test',
            'password' => Hash::make('secret-password'),
            'is_active' => true,
            'role' => 'moderator',
        ]);
        $admin = Admin::create([
            'nama' => 'Admin',
            'email' => 'admin@example.test',
            'password' => Hash::make('secret-password'),
            'is_active' => true,
            'role' => 'admin',
        ]);

        $this->withToken($moderator->createToken('test')->plainTextToken)
            ->patchJson("/api/admin/aspirasi/{$aspirasi->id}/publik", ['is_publik' => true])
            ->assertForbidden();

        $this->withToken($admin->createToken('test')->plainTextToken)
            ->patchJson("/api/admin/aspirasi/{$aspirasi->id}/publik", ['is_publik' => true])
            ->assertOk()
            ->assertJsonPath('aspirasi.is_publik', true);
    }

    public function test_moderator_can_update_status_and_reply(): void
    {
        $kategori = Kategori::create(['nama' => 'Fasilitas']);
        $aspirasi = Aspirasi::create([
            'kategori_id' => $kategori->id,
            'kode_tiket' => 'MOD12345',
            'judul' => 'Perbaikan ruang praktikum',
            'isi' => 'Mohon periksa pendingin udara di ruang praktikum.',
            'is_anonim' => true,
            'ip_hash' => str_repeat('b', 64),
        ]);
        $moderator = Admin::create([
            'nama' => 'Moderator',
            'email' => 'moderator@example.test',
            'password' => Hash::make('secret-password'),
            'is_active' => true,
            'role' => 'moderator',
        ]);

        $this->withToken($moderator->createToken('test')->plainTextToken)
            ->patchJson("/api/admin/aspirasi/{$aspirasi->id}/status", ['status' => 'Diproses'])
            ->assertOk()
            ->assertJsonPath('aspirasi.status', 'Diproses');

        $this->withToken($moderator->createToken('reply-test')->plainTextToken)
            ->postJson("/api/admin/aspirasi/{$aspirasi->id}/balas", ['isi' => 'Sudah kami teruskan ke bagian sarana.'])
            ->assertCreated()
            ->assertJsonPath('balasan.admin_id', $moderator->id);
    }

    public function test_admin_cannot_publish_private_aspiration(): void
    {
        $kategori = Kategori::create(['nama' => 'Akademik']);
        $aspirasi = Aspirasi::create([
            'kategori_id' => $kategori->id,
            'kode_tiket' => 'PRIV1234',
            'judul' => 'Aspirasi privat untuk jurusan',
            'isi' => 'Mohon tangani informasi ini secara privat.',
            'is_anonim' => true,
            'is_privat' => true,
            'ip_hash' => str_repeat('c', 64),
        ]);
        $admin = Admin::create([
            'nama' => 'Admin',
            'email' => 'admin@example.test',
            'password' => Hash::make('secret-password'),
            'is_active' => true,
            'role' => 'admin',
        ]);

        $this->withToken($admin->createToken('test')->plainTextToken)
            ->patchJson("/api/admin/aspirasi/{$aspirasi->id}/publik", ['is_publik' => true])
            ->assertUnprocessable();
    }
}
