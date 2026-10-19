<?php

namespace Database\Seeders;

use App\Models\Admin;
use App\Models\Aspirasi;
use App\Models\AuditTrail;
use App\Models\Balasan;
use App\Models\Kategori;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Replaces all ticket data with 20 clearly marked demo tickets.
 * Run explicitly with: php artisan db:seed --class=DemoAspirasiSeeder --force
 */
class DemoAspirasiSeeder extends Seeder
{
    public function run(): void
    {
        $records = [
            ['Fasilitas', '[SIMULASI] Komputer di Lab Rekayasa Perangkat Lunak lambat', 'DATA DUMMY untuk demo. Beberapa komputer membutuhkan waktu lama saat membuka proyek praktikum. Mohon pemeriksaan performa dan penyimpanan.', 'Diproses', 1, false, false, true],
            ['Fasilitas', '[SIMULASI] Koneksi jaringan di laboratorium tidak stabil', 'DATA DUMMY untuk demo. Koneksi jaringan beberapa kali terputus saat praktikum konfigurasi jaringan. Mohon pengecekan akses poin dan koneksi LAN.', 'Diterima', 2, true, false, false],
            ['Akademik', '[SIMULASI] Jadwal penggunaan laboratorium bertabrakan', 'DATA DUMMY untuk demo. Jadwal praktikum dua kelas tampak memakai laboratorium pada jam yang sama. Mohon jadwal penggunaan ruang diperiksa kembali.', 'Selesai', 3, false, false, true],
            ['Fasilitas', '[SIMULASI] Perlu pengecekan perangkat di Lab Komputer dan Jaringan', 'DATA DUMMY untuk demo. Salah satu perangkat praktik jaringan tidak menyala saat akan digunakan. Mohon pemeriksaan sebelum jadwal praktikum berikutnya.', 'Diproses', 4, false, false, true],
            ['Fasilitas', '[SIMULASI] Kursi di ruang praktikum kurang nyaman', 'DATA DUMMY untuk demo. Beberapa kursi di ruang praktikum terasa kurang stabil dan mengganggu kegiatan belajar dalam waktu lama. Mohon pengecekan kondisi inventaris.', 'Diterima', 5, true, true, false],
            ['Akademik', '[SIMULASI] Informasi perubahan jadwal belum diterima merata', 'DATA DUMMY untuk demo. Perubahan jadwal kuliah pada simulasi ini belum diketahui semua mahasiswa. Mohon informasi perubahan jadwal disebarkan melalui kanal resmi kelas.', 'Selesai', 6, false, false, true],
            ['Fasilitas', '[SIMULASI] Proyektor ruang kuliah perlu diperiksa', 'DATA DUMMY untuk demo. Tampilan proyektor pada ruang kuliah simulasi terlihat redup sehingga materi presentasi sulit dibaca dari belakang.', 'Ditolak', 7, false, false, false],
            ['Kegiatan', '[SIMULASI] Usulan klinik belajar pengembangan aplikasi', 'DATA DUMMY untuk demo. Kami mengusulkan sesi berbagi dan klinik belajar pengembangan aplikasi yang dapat diikuti mahasiswa lintas program studi.', 'Diproses', 8, true, false, true],
            ['Fasilitas', '[SIMULASI] Perangkat masukan di Lab Sistem Informasi perlu diganti', 'DATA DUMMY untuk demo. Beberapa tetikus di ruang praktikum simulasi tidak berfungsi dengan baik. Mohon pengecekan dan penggantian perangkat yang rusak.', 'Diterima', 9, false, false, false],
            ['Lainnya', '[SIMULASI] Permintaan penanganan pribadi terkait kendala akademik', 'DATA DUMMY untuk demo. Saya memiliki kendala akademik yang perlu dibicarakan secara pribadi dengan pihak jurusan. Mohon informasi prosedur konsultasi yang sesuai.', 'Diproses', 10, true, true, false],
            ['Dosen', '[SIMULASI] Usulan jadwal konsultasi tugas proyek', 'DATA DUMMY untuk demo. Mohon tersedia informasi jadwal konsultasi tugas proyek agar mahasiswa dapat menyiapkan pertanyaan dan bertemu dosen pembimbing dengan lebih teratur.', 'Selesai', 11, false, false, true],
            ['Fasilitas', '[SIMULASI] Perlu penataan ruang untuk kegiatan UX', 'DATA DUMMY untuk demo. Kegiatan diskusi dan uji coba rancangan antarmuka memerlukan susunan meja yang lebih mendukung kerja kelompok di ruang praktik.', 'Diterima', 12, false, false, true],
            ['Akademik', '[SIMULASI] Panduan pengumpulan tugas praktikum perlu diperjelas', 'DATA DUMMY untuk demo. Mohon format nama berkas dan lokasi pengumpulan tugas praktikum disampaikan lebih rinci agar tidak terjadi kekeliruan saat mengumpulkan.', 'Ditolak', 13, true, false, false],
            ['Kegiatan', '[SIMULASI] Usulan sesi berbagi keamanan jaringan', 'DATA DUMMY untuk demo. Mahasiswa mengusulkan sesi berbagi dasar keamanan jaringan dan praktik penggunaan jaringan yang bertanggung jawab.', 'Diproses', 14, false, false, true],
            ['Fasilitas', '[SIMULASI] Akses ke sumber daya praktikum bersama', 'DATA DUMMY untuk demo. Mohon informasi cara mengakses sumber daya praktikum bersama disertai panduan singkat dan kontak penanggung jawab.', 'Diterima', 15, false, true, false],
            ['Akademik', '[SIMULASI] Usulan repositori materi praktikum terpusat', 'DATA DUMMY untuk demo. Materi praktikum simulasi diusulkan tersimpan pada satu tempat yang mudah ditemukan, dengan informasi versi dan tanggal pembaruan.', 'Selesai', 16, true, false, true],
            ['Fasilitas', '[SIMULASI] Pemeriksaan stopkontak di ruang praktik', 'DATA DUMMY untuk demo. Beberapa stopkontak pada ruang praktik simulasi perlu diperiksa sebelum digunakan untuk kegiatan belajar.', 'Diproses', 17, false, false, false],
            ['Dosen', '[SIMULASI] Masukan tentang rubrik penilaian proyek', 'DATA DUMMY untuk demo. Mohon kriteria penilaian proyek dibagikan sebelum pengerjaan agar mahasiswa memahami aspek yang akan dinilai.', 'Diterima', 18, false, false, true],
            ['Fasilitas', '[SIMULASI] Pengecekan komputer untuk praktikum basis data', 'DATA DUMMY untuk demo. Komputer pada simulasi praktikum basis data membutuhkan pemeriksaan aplikasi dan koneksi ke lingkungan latihan.', 'Selesai', 19, true, true, false],
            ['Lainnya', '[SIMULASI] Usulan papan informasi aspirasi di lingkungan JTIK', 'DATA DUMMY untuk demo. Mohon tersedia informasi singkat mengenai kanal aspirasi, cara mengecek tiket, dan estimasi tahapan penanganan.', 'Ditolak', 20, false, false, true],
        ];

        DB::transaction(function () use ($records): void {
            // Related replies and audit events cascade when existing tickets are removed.
            Aspirasi::query()->delete();

            $categoryIds = [];
            foreach (['Akademik', 'Fasilitas', 'Dosen', 'Kegiatan', 'Lainnya'] as $name) {
                $categoryIds[$name] = Kategori::firstOrCreate(['nama' => $name])->id;
            }

            $admin = Admin::query()->where('is_active', true)->orderBy('id')->first();
            $replyIndexes = [2, 5, 7, 10, 15, 18];

            foreach ($records as $index => [$category, $title, $body, $status, $daysAgo, $anonymous, $private, $public]) {
                $createdAt = now()->subDays($daysAgo)->subHours($index % 8);
                $aspirasi = new Aspirasi([
                    'kategori_id' => $categoryIds[$category],
                    'kode_tiket' => $this->ticketCode(),
                    'judul' => $title,
                    'isi' => $body,
                    'nama' => $anonymous ? null : sprintf('Mahasiswa Dummy %02d', $index + 1),
                    'nim' => $anonymous ? null : sprintf('DUMMY-2026-%04d', $index + 1),
                    'is_anonim' => $anonymous,
                    'status' => $status,
                    'is_publik' => $private ? false : $public,
                    'is_privat' => $private,
                    'ip_hash' => hash('sha256', sprintf('demo-aspirasi-jtik-%02d', $index + 1)),
                    'has_badwords' => false,
                ]);
                $aspirasi->created_at = $createdAt;
                $aspirasi->updated_at = $createdAt;
                $aspirasi->save();

                if ($admin && $status !== 'Diterima') {
                    $this->recordAudit($aspirasi->id, $admin->id, 'status_changed', 'Diterima', $status, $createdAt->copy()->addHours(2));
                }
                if ($admin && $private) {
                    $this->recordAudit($aspirasi->id, $admin->id, 'privacy_changed', 'Tidak privat', 'Privat', $createdAt->copy()->addHours(3));
                } elseif ($admin && $public) {
                    $this->recordAudit($aspirasi->id, $admin->id, 'public_visibility_changed', 'Tersembunyi', 'Publik', $createdAt->copy()->addHours(3));
                }

                if ($admin && in_array($index + 1, $replyIndexes, true)) {
                    $replyAt = $createdAt->copy()->addHours(4);
                    $reply = new Balasan([
                        'aspirasi_id' => $aspirasi->id,
                        'admin_id' => $admin->id,
                        'isi' => 'TANGGAPAN SIMULASI: Terima kasih atas masukannya. Masukan ini sudah dicatat untuk ditinjau oleh pengurus JTIK.',
                    ]);
                    $reply->created_at = $replyAt;
                    $reply->updated_at = $replyAt;
                    $reply->save();
                    $this->recordAudit($aspirasi->id, $admin->id, 'reply_sent', null, null, $replyAt);
                }
            }
        });

        $this->command?->info('20 tiket simulasi JTIK berhasil dibuat.');
    }

    private function ticketCode(): string
    {
        do {
            $code = strtoupper(bin2hex(random_bytes(4)));
        } while (Aspirasi::query()->where('kode_tiket', $code)->exists());

        return $code;
    }

    private function recordAudit(int $aspirasiId, int $adminId, string $action, ?string $oldValue, ?string $newValue, Carbon $at): void
    {
        $event = new AuditTrail([
            'aspirasi_id' => $aspirasiId,
            'admin_id' => $adminId,
            'action' => $action,
            'old_value' => $oldValue,
            'new_value' => $newValue,
        ]);
        $event->created_at = $at;
        $event->updated_at = $at;
        $event->save();
    }
}
