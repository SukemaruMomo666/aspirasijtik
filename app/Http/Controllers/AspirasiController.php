<?php

namespace App\Http\Controllers;

use App\Models\Aspirasi;
use App\Models\Balasan;
use App\Models\SpamTrack;
use App\Utils\IPHasher;
use App\Utils\TicketGenerator;
use App\Utils\TurnstileVerifier;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AspirasiController extends Controller
{
    private const MAX_ASPIRASI_PER_DAY = 5;

    /**
     * Submit aspirasi baru (public endpoint)
     */
    public function submit(Request $request): JsonResponse
    {
        if (! TurnstileVerifier::configured()) {
            return response()->json([
                'message' => 'Formulir belum dapat menerima aspirasi karena CAPTCHA belum dikonfigurasi.',
            ], 503);
        }

        $validated = $request->validate([
            'kategori_id' => 'required|exists:kategoris,id',
            'judul' => 'required|string|max:255',
            'isi' => 'required|string|max:5000',
            'saran_pelapor' => 'nullable|string|max:2000',
            'tautan_pendukung' => 'nullable|array|max:5',
            'tautan_pendukung.*' => ['nullable', 'url', 'max:2048', 'regex:/^https?:\\/\\//i'],
            'lampiran' => 'nullable|array|max:3',
            'lampiran.*' => 'file|mimes:jpg,jpeg,png,webp,pdf|max:5120',
            'nama' => 'nullable|string|max:100',
            'nim' => 'nullable|string|max:20',
            'is_anonim' => 'required|boolean',
            'captcha_token' => 'required|string|max:4096',
        ]);

        if (! TurnstileVerifier::verify($validated['captcha_token'], $request->ip())) {
            return response()->json(['message' => 'Verifikasi CAPTCHA gagal. Silakan coba lagi.'], 422);
        }

        // Check spam
        $ipHash = IPHasher::fromRequest();
        $spamTrack = SpamTrack::where('ip_hash', $ipHash)->first();

        if ($spamTrack && (! $spamTrack->reset_at || $spamTrack->reset_at->isPast())) {
            $spamTrack->update([
                'count' => 0,
                'reset_at' => now()->addDay(),
            ]);
        }

        if ($spamTrack && $spamTrack->count >= self::MAX_ASPIRASI_PER_DAY) {
            return response()->json([
                'message' => 'Anda telah mencapai batas pengiriman hari ini',
                'limit' => self::MAX_ASPIRASI_PER_DAY,
            ], 429);
        }

        // Generate ticket
        $kodeTicket = TicketGenerator::generate();

        $tautanPendukung = array_values(array_filter(
            $validated['tautan_pendukung'] ?? [],
            static fn ($url) => is_string($url) && trim($url) !== ''
        ));
        $lampiran = [];
        foreach ($request->file('lampiran', []) as $file) {
            $path = $file->store("aspirasi/{$kodeTicket}", 'local');
            if ($path) {
                $lampiran[] = [
                    'path' => $path,
                    'name' => $file->getClientOriginalName(),
                    'mime_type' => $file->getMimeType(),
                    'size' => $file->getSize(),
                ];
            }
        }

        // Check for bad words (simple implementation)
        $hasBadwords = $this->containsBadwords($validated['judul'].' '.$validated['isi']);

        // Create aspirasi
        $aspirasi = Aspirasi::create([
            'kategori_id' => $validated['kategori_id'],
            'kode_tiket' => $kodeTicket,
            'judul' => $validated['judul'],
            'isi' => $validated['isi'],
            'saran_pelapor' => $validated['saran_pelapor'] ?? null,
            'tautan_pendukung' => $tautanPendukung,
            'lampiran' => $lampiran,
            'nama' => $validated['is_anonim'] ? null : $validated['nama'],
            'nim' => $validated['is_anonim'] ? null : $validated['nim'],
            'is_anonim' => $validated['is_anonim'],
            'ip_hash' => $ipHash,
            'has_badwords' => $hasBadwords,
        ]);
        $aspirasi->makeHidden(['nama', 'nim', 'ip_hash', 'saran_pelapor', 'tautan_pendukung', 'lampiran']);

        // Update spam track
        if ($spamTrack) {
            // Check if reset time has passed
            if ($spamTrack->reset_at < now()) {
                $spamTrack->update([
                    'count' => 1,
                    'reset_at' => now()->addDay(),
                ]);
            } else {
                $spamTrack->increment('count');
            }
        } else {
            try {
                SpamTrack::create([
                    'ip_hash' => $ipHash,
                    'count' => 1,
                    'reset_at' => now()->addDay(),
                ]);
            } catch (QueryException $e) {
                // Race condition: ip_hash already exists
                $spamTrack = SpamTrack::where('ip_hash', $ipHash)->first();
                if ($spamTrack) {
                    $spamTrack->increment('count');
                }
            }
        }

        return response()->json([
            'message' => 'Aspirasi berhasil dikirim',
            'kode_tiket' => $kodeTicket,
            'aspirasi' => $aspirasi,
        ], 201);
    }

    /**
     * Check status aspirasi by ticket code (public endpoint)
     */
    public function status(string $ticketCode): JsonResponse
    {
        $aspirasi = Aspirasi::with([
            'kategori:id,nama',
            'balasans:id,aspirasi_id,admin_id,isi,lampiran,created_at',
            'balasans.admin:id,nama',
        ])
            ->where('kode_tiket', $ticketCode)
            ->first();

        if (! $aspirasi) {
            return response()->json([
                'message' => 'Kode tiket tidak ditemukan',
            ], 404);
        }

        $aspirasi->makeHidden(['nama', 'nim', 'ip_hash', 'saran_pelapor', 'tautan_pendukung', 'lampiran']);
        if ($aspirasi->is_privat) {
            $aspirasi->makeHidden(['judul', 'isi', 'kategori', 'balasans']);
        } else {
            foreach ($aspirasi->balasans as $balasan) {
                $balasan->setAttribute('lampiran', collect($balasan->lampiran ?? [])->map(
                    static fn (array $file) => [
                        'name' => $file['name'] ?? 'Lampiran',
                        'mime_type' => $file['mime_type'] ?? 'application/octet-stream',
                        'size' => $file['size'] ?? 0,
                    ]
                )->values()->all());
            }
        }

        return response()->json(['aspirasi' => $aspirasi]);
    }

    public function downloadReplyAttachment(string $ticketCode, Balasan $balasan, int $index)
    {
        $aspirasi = $balasan->aspirasi;
        abort_unless($aspirasi && hash_equals(strtoupper($aspirasi->kode_tiket), strtoupper($ticketCode)), 404);
        abort_if($aspirasi->is_privat, 404);

        $attachment = $balasan->lampiran[$index] ?? null;
        abort_unless(is_array($attachment) && isset($attachment['path']), 404);
        abort_unless(str_starts_with($attachment['path'], "aspirasi/{$aspirasi->kode_tiket}/balasan/{$balasan->id}/"), 404);
        abort_unless(Storage::disk('local')->exists($attachment['path']), 404);

        return Storage::disk('local')->download(
            $attachment['path'],
            basename((string) ($attachment['name'] ?? 'lampiran'))
        );
    }

    public function downloadPublicAttachment(Aspirasi $aspirasi, int $index)
    {
        abort_unless($aspirasi->is_publik && ! $aspirasi->is_privat, 404);

        $attachment = $aspirasi->lampiran[$index] ?? null;
        abort_unless(is_array($attachment) && isset($attachment['path']), 404);
        abort_unless(dirname($attachment['path']) === "aspirasi/{$aspirasi->kode_tiket}", 404);
        abort_unless(Storage::disk('local')->exists($attachment['path']), 404);

        return Storage::disk('local')->download(
            $attachment['path'],
            basename((string) ($attachment['name'] ?? 'lampiran'))
        );
    }

    public function downloadPublicReplyAttachment(Aspirasi $aspirasi, Balasan $balasan, int $index)
    {
        abort_unless($aspirasi->is_publik && ! $aspirasi->is_privat, 404);
        abort_unless($balasan->aspirasi_id === $aspirasi->id, 404);

        $attachment = $balasan->lampiran[$index] ?? null;
        abort_unless(is_array($attachment) && isset($attachment['path']), 404);
        abort_unless(str_starts_with($attachment['path'], "aspirasi/{$aspirasi->kode_tiket}/balasan/{$balasan->id}/"), 404);
        abort_unless(Storage::disk('local')->exists($attachment['path']), 404);

        return Storage::disk('local')->download(
            $attachment['path'],
            basename((string) ($attachment['name'] ?? 'lampiran'))
        );
    }

    /**
     * Get public aspirasi (public endpoint)
     */
    public function publicList(): JsonResponse
    {
        $aspirasi = Aspirasi::query()
            ->select([
                'id', 'kategori_id', 'judul', 'isi', 'is_anonim', 'lampiran',
                'status', 'is_publik', 'is_privat', 'has_badwords', 'created_at', 'updated_at',
            ])
            ->with([
                'kategori:id,nama',
                'balasans:id,aspirasi_id,admin_id,isi,lampiran,created_at',
                'balasans.admin:id,nama',
            ])
            ->where('is_publik', true)
            ->where('is_privat', false)
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        foreach ($aspirasi as $item) {
            $item->setAttribute('lampiran', collect($item->lampiran ?? [])->map(
                static fn (array $file) => [
                    'name' => $file['name'] ?? 'Lampiran',
                    'mime_type' => $file['mime_type'] ?? 'application/octet-stream',
                    'size' => $file['size'] ?? 0,
                ]
            )->values()->all());

            foreach ($item->balasans as $balasan) {
                $balasan->setAttribute('lampiran', collect($balasan->lampiran ?? [])->map(
                    static fn (array $file) => [
                        'name' => $file['name'] ?? 'Lampiran',
                        'mime_type' => $file['mime_type'] ?? 'application/octet-stream',
                        'size' => $file['size'] ?? 0,
                    ]
                )->values()->all());
            }
        }

        return response()->json($aspirasi);
    }

    private function containsBadwords(string $text): bool
    {
        $normalizedText = mb_strtolower($text);
        foreach (config('aspirasi.badwords', []) as $word) {
            $pattern = '/(?<![\\p{L}\\p{N}_])'.preg_quote($word, '/').'(?![\\p{L}\\p{N}_])/u';
            if (preg_match($pattern, $normalizedText) === 1) {
                return true;
            }
        }

        return false;
    }
}
