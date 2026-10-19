<?php

namespace Tests\Feature;

use App\Models\Aspirasi;
use App\Models\Kategori;
use App\Models\SpamTrack;
use App\Utils\IPHasher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\RequiresPhpExtension;
use Tests\TestCase;

#[RequiresPhpExtension('pdo_sqlite')]
class AspirasiApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_submission_returns_ticket_and_status_does_not_expose_private_fields(): void
    {
        $kategori = Kategori::create(['nama' => 'Fasilitas']);

        $response = $this->postJson('/api/aspirasi/submit', [
            'kategori_id' => $kategori->id,
            'judul' => 'Perbaikan proyektor kelas',
            'isi' => 'Proyektor ruang kelas tidak menyala sejak minggu lalu.',
            'nama' => 'Mahasiswa Contoh',
            'nim' => '1234567890',
            'is_anonim' => false,
        ])->assertCreated()->assertJsonStructure(['kode_tiket', 'aspirasi' => ['id']]);

        $ticket = $response->json('kode_tiket');
        $this->assertSame(8, strlen($ticket));

        $this->getJson("/api/aspirasi/status/{$ticket}")
            ->assertOk()
            ->assertJsonMissingPath('aspirasi.nama')
            ->assertJsonMissingPath('aspirasi.nim')
            ->assertJsonMissingPath('aspirasi.ip_hash');
    }

    public function test_public_feed_excludes_private_submissions_and_personal_fields(): void
    {
        $kategori = Kategori::create(['nama' => 'Akademik']);
        $base = [
            'kategori_id' => $kategori->id,
            'judul' => 'Aspirasi publik',
            'isi' => 'Mohon evaluasi jadwal praktikum semester ini.',
            'nama' => 'Nama Rahasia',
            'nim' => '99887766',
            'is_anonim' => false,
            'ip_hash' => str_repeat('a', 64),
        ];

        Aspirasi::create($base + ['kode_tiket' => 'PUB12345', 'is_publik' => true]);
        Aspirasi::create($base + ['kode_tiket' => 'PRI12345', 'is_publik' => true, 'is_privat' => true]);

        $this->getJson('/api/aspirasi/public')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonMissingPath('data.0.nama')
            ->assertJsonMissingPath('data.0.nim')
            ->assertJsonMissingPath('data.0.ip_hash');
    }

    public function test_expired_daily_spam_limit_is_reset_before_submission(): void
    {
        $kategori = Kategori::create(['nama' => 'Lainnya']);
        SpamTrack::create([
            'ip_hash' => IPHasher::hash('127.0.0.1'),
            'count' => 5,
            'reset_at' => now()->subMinute(),
        ]);

        $this->postJson('/api/aspirasi/submit', [
            'kategori_id' => $kategori->id,
            'judul' => 'Permohonan fasilitas belajar',
            'isi' => 'Mohon disediakan tambahan tempat belajar bagi mahasiswa.',
            'is_anonim' => true,
        ])->assertCreated();

        $this->assertDatabaseHas('spam_tracks', [
            'ip_hash' => IPHasher::hash('127.0.0.1'),
            'count' => 1,
        ]);
    }
}
