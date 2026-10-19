<?php

namespace App\Http\Controllers;

use App\Models\Admin;
use App\Models\Aspirasi;
use App\Models\AuditTrail;
use App\Models\Balasan;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminController extends Controller
{
    /**
     * Get list aspirasi with filters
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'kategori_id' => 'sometimes|integer|exists:kategoris,id',
            'status' => 'sometimes|in:Diterima,Diproses,Selesai,Ditolak,Antrean',
            'sort_order' => 'sometimes|in:asc,desc',
            'search' => 'sometimes|string|max:120',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after_or_equal:start_date',
            'has_badwords' => 'sometimes|boolean',
            'per_page' => 'sometimes|integer|min:1|max:100',
        ]);
        $query = Aspirasi::with('kategori', 'balasans.admin');

        // Filter by kategori
        if (isset($filters['kategori_id'])) {
            $query->where('kategori_id', $filters['kategori_id']);
        }

        // Filter by status
        if (($filters['status'] ?? null) === 'Antrean') {
            $query->whereIn('status', ['Diterima', 'Diproses']);
        } elseif (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (isset($filters['search']) && trim($filters['search']) !== '') {
            $search = trim($filters['search']);
            $query->where(function ($searchQuery) use ($search) {
                $searchQuery->where('kode_tiket', 'like', "%{$search}%")
                    ->orWhere('judul', 'like', "%{$search}%");
            });
        }

        // Filter by date range
        if (isset($filters['start_date'])) $query->where('created_at', '>=', Carbon::parse($filters['start_date'])->startOfDay());
        if (isset($filters['end_date'])) $query->where('created_at', '<=', Carbon::parse($filters['end_date'])->endOfDay());

        // Filter by has_badwords
        if (isset($filters['has_badwords'])) {
            $query->where('has_badwords', $filters['has_badwords']);
        }

        $sortDirection = $filters['sort_order'] ?? (($filters['status'] ?? null) === 'Antrean' ? 'asc' : 'desc');
        $aspirasi = $query->orderBy('created_at', $sortDirection)->paginate($filters['per_page'] ?? 15);

        return response()->json($aspirasi);
    }

    /**
     * Get single aspirasi detail
     */
    public function show(Aspirasi $aspirasi): JsonResponse
    {
        $aspirasi->load('kategori', 'balasans.admin', 'auditTrails.admin');

        return response()->json($aspirasi);
    }

    public function downloadAttachment(Aspirasi $aspirasi, int $index)
    {
        $attachment = $aspirasi->lampiran[$index] ?? null;

        abort_unless(is_array($attachment) && isset($attachment['path']), 404);
        abort_unless(str_starts_with($attachment['path'], "aspirasi/{$aspirasi->kode_tiket}/"), 404);
        abort_unless(Storage::disk('local')->exists($attachment['path']), 404);

        $filename = basename((string) ($attachment['name'] ?? 'lampiran'));

        return Storage::disk('local')->download($attachment['path'], $filename);
    }

    public function downloadReplyAttachment(Aspirasi $aspirasi, Balasan $balasan, int $index)
    {
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
     * Update aspirasi status
     */
    public function updateStatus(Request $request, Aspirasi $aspirasi): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:Diterima,Diproses,Selesai,Ditolak',
        ]);

        $aspirasi = DB::transaction(function () use ($request, $aspirasi, $validated) {
            $lockedAspirasi = Aspirasi::query()->lockForUpdate()->findOrFail($aspirasi->id);
            $oldStatus = $lockedAspirasi->status;
            if ($oldStatus !== $validated['status']) {
                $lockedAspirasi->update(['status' => $validated['status']]);
                AuditTrail::create([
                    'aspirasi_id' => $lockedAspirasi->id,
                    'admin_id' => $request->user()->id,
                    'action' => 'status_changed',
                    'old_value' => $oldStatus,
                    'new_value' => $validated['status'],
                ]);
            }

            return $lockedAspirasi;
        });

        return response()->json([
            'message' => 'Status berhasil diperbarui',
            'aspirasi' => $aspirasi,
        ]);
    }

    /**
     * Toggle aspirasi visibility
     */
    public function togglePublic(Request $request, Aspirasi $aspirasi): JsonResponse
    {
        abort_unless($request->user()?->role === 'admin', 403, 'Hanya Admin yang dapat mengubah visibilitas aspirasi.');

        $validated = $request->validate([
            'is_publik' => 'required|boolean',
        ]);

        $newVisibility = (bool) $validated['is_publik'];
        $result = DB::transaction(function () use ($request, $aspirasi, $newVisibility) {
            $lockedAspirasi = Aspirasi::query()->lockForUpdate()->findOrFail($aspirasi->id);
            if ($newVisibility && $lockedAspirasi->is_privat) {
                return null;
            }

            $oldVisibility = (bool) $lockedAspirasi->is_publik;
            if ($oldVisibility !== $newVisibility) {
                $lockedAspirasi->update(['is_publik' => $newVisibility]);
                AuditTrail::create([
                    'aspirasi_id' => $lockedAspirasi->id,
                    'admin_id' => $request->user()->id,
                    'action' => 'public_visibility_changed',
                    'old_value' => $oldVisibility ? 'Publik' : 'Tersembunyi',
                    'new_value' => $newVisibility ? 'Publik' : 'Tersembunyi',
                ]);
            }

            return $lockedAspirasi;
        });
        if (! $result) {
            return response()->json([
                'message' => 'Aspirasi privat tidak dapat ditampilkan di halaman publik.',
            ], 422);
        }
        $aspirasi = $result;

        return response()->json([
            'message' => 'Visibilitas berhasil diperbarui',
            'aspirasi' => $aspirasi,
        ]);
    }

    public function togglePrivate(Request $request, Aspirasi $aspirasi): JsonResponse
    {
        abort_unless($request->user()?->role === 'admin', 403, 'Hanya Admin yang dapat mengubah status privat.');

        $validated = $request->validate(['is_privat' => 'required|boolean']);
        $isPrivate = (bool) $validated['is_privat'];
        $aspirasi = DB::transaction(function () use ($request, $aspirasi, $isPrivate) {
            $lockedAspirasi = Aspirasi::query()->lockForUpdate()->findOrFail($aspirasi->id);
            $oldPrivate = (bool) $lockedAspirasi->is_privat;
            $oldPublic = (bool) $lockedAspirasi->is_publik;
            $newPublic = $isPrivate ? false : $oldPublic;
            if ($oldPrivate !== $isPrivate || $oldPublic !== $newPublic) {
                $lockedAspirasi->update(['is_privat' => $isPrivate, 'is_publik' => $newPublic]);
                if ($oldPrivate !== $isPrivate) {
                    AuditTrail::create([
                        'aspirasi_id' => $lockedAspirasi->id,
                        'admin_id' => $request->user()->id,
                        'action' => 'privacy_changed',
                        'old_value' => $oldPrivate ? 'Privat' : 'Tidak privat',
                        'new_value' => $isPrivate ? 'Privat' : 'Tidak privat',
                    ]);
                }
                if ($oldPublic !== $newPublic) {
                    AuditTrail::create([
                        'aspirasi_id' => $lockedAspirasi->id,
                        'admin_id' => $request->user()->id,
                        'action' => 'public_visibility_changed',
                        'old_value' => $oldPublic ? 'Publik' : 'Tersembunyi',
                        'new_value' => $newPublic ? 'Publik' : 'Tersembunyi',
                    ]);
                }
            }

            return $lockedAspirasi;
        });

        return response()->json([
            'message' => 'Status privat berhasil diperbarui',
            'aspirasi' => $aspirasi,
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $filters = $request->validate([
            'kategori_id' => 'sometimes|integer|exists:kategoris,id',
            'status' => 'sometimes|in:Diterima,Diproses,Selesai,Ditolak,Antrean',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after_or_equal:start_date',
            'has_badwords' => 'sometimes|boolean',
            'search' => 'sometimes|string|max:120',
        ]);

        $rows = Aspirasi::query()->with('kategori')->orderByDesc('created_at');
        if (isset($filters['kategori_id'])) $rows->where('kategori_id', $filters['kategori_id']);
        if (isset($filters['search']) && trim($filters['search']) !== '') {
            $search = trim($filters['search']);
            $rows->where(fn ($query) => $query->where('kode_tiket', 'like', "%{$search}%")
                ->orWhere('judul', 'like', "%{$search}%"));
        }
        if (($filters['status'] ?? null) === 'Antrean') {
            $rows->whereIn('status', ['Diterima', 'Diproses']);
        } elseif (isset($filters['status'])) {
            $rows->where('status', $filters['status']);
        }
        if (isset($filters['start_date'])) $rows->where('created_at', '>=', Carbon::parse($filters['start_date'])->startOfDay());
        if (isset($filters['end_date'])) $rows->where('created_at', '<=', Carbon::parse($filters['end_date'])->endOfDay());
        if (isset($filters['has_badwords'])) $rows->where('has_badwords', $filters['has_badwords']);

        return response()->streamDownload(function () use ($rows) {
            $output = fopen('php://output', 'w');
            fwrite($output, "\xEF\xBB\xBF");
            fputcsv($output, ['Kode tiket', 'Kategori', 'Judul', 'Isi', 'Nama', 'NIM', 'Anonim', 'Status', 'Publik', 'Privat', 'Terindikasi kata kasar', 'Tanggal']);
            $rows->chunk(500, function ($aspirasis) use ($output) {
                foreach ($aspirasis as $item) {
                    $cells = [
                        $item->kode_tiket, $item->kategori?->nama, $item->judul, $item->isi,
                        $item->is_anonim ? '' : $item->nama,
                        $item->is_anonim ? '' : $item->nim,
                        $item->is_anonim ? 'Ya' : 'Tidak', $item->status,
                        $item->is_publik ? 'Ya' : 'Tidak', $item->is_privat ? 'Ya' : 'Tidak',
                        $item->has_badwords ? 'Ya' : 'Tidak', $item->created_at?->toDateTimeString(),
                    ];
                    fputcsv($output, array_map(static function ($value) {
                        $value = (string) ($value ?? '');
                        return preg_match('/^[=+@\\-\\t\\r]/u', $value) ? "'".$value : $value;
                    }, $cells));
                }
            });
            fclose($output);
        }, 'rekap-aspirasi-'.now()->format('Ymd-His').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * Add reply to aspirasi
     */
    public function reply(Request $request, Aspirasi $aspirasi): JsonResponse
    {
        $validated = $request->validate([
            'isi' => 'required|string|max:5000',
            'lampiran' => 'nullable|array|max:3',
            'lampiran.*' => 'file|mimes:jpg,jpeg,png,webp,pdf|max:5120',
        ]);

        $balasan = DB::transaction(function () use ($request, $aspirasi, $validated) {
            $balasan = Balasan::create([
                'aspirasi_id' => $aspirasi->id,
                'admin_id' => $request->user()->id,
                'isi' => $validated['isi'],
            ]);

            $lampiran = [];
            foreach ($request->file('lampiran', []) as $file) {
                $path = $file->store("aspirasi/{$aspirasi->kode_tiket}/balasan/{$balasan->id}", 'local');
                if ($path) {
                    $lampiran[] = [
                        'path' => $path,
                        'name' => $file->getClientOriginalName(),
                        'mime_type' => $file->getMimeType(),
                        'size' => $file->getSize(),
                    ];
                }
            }
            if ($lampiran) {
                $balasan->update(['lampiran' => $lampiran]);
            }
            AuditTrail::create([
                'aspirasi_id' => $aspirasi->id,
                'admin_id' => $request->user()->id,
                'action' => 'reply_sent',
            ]);

            return $balasan;
        });

        $balasan->load('admin');

        return response()->json([
            'message' => 'Balasan berhasil ditambahkan',
            'balasan' => $balasan,
        ], 201);
    }

    /**
     * Get statistics
     */
    public function statistik(): JsonResponse
    {
        $total = Aspirasi::count();

        $byKategori = Aspirasi::with('kategori')
            ->selectRaw('kategori_id, COUNT(*) as jumlah, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as selesai', ['Selesai'])
            ->selectRaw('SUM(CASE WHEN status IN (?, ?) THEN 1 ELSE 0 END) as pending', ['Diterima', 'Diproses'])
            ->groupBy('kategori_id')
            ->get()
            ->map(fn ($item) => [
                'kategori' => $item->kategori->nama ?? 'Unknown',
                'jumlah' => $item->jumlah,
                'selesai' => $item->selesai,
                'pending' => $item->pending,
            ]);

        $byStatus = Aspirasi::selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->get()
            ->pluck('count', 'status')
            ->toArray();

        $startDate = now()->startOfMonth()->subMonths(11);
        $monthExpression = match (DB::connection()->getDriverName()) {
            'sqlite' => "strftime('%Y-%m', created_at)",
            'pgsql' => "TO_CHAR(created_at, 'YYYY-MM')",
            default => "DATE_FORMAT(created_at, '%Y-%m')",
        };
        $monthlyRows = Aspirasi::query()
            ->where('created_at', '>=', $startDate)
            ->selectRaw("{$monthExpression} as month_key, status, COUNT(*) as total")
            ->groupByRaw("{$monthExpression}, status")
            ->get();

        $monthlyStats = collect(range(0, 11))->mapWithKeys(function (int $offset) use ($startDate) {
            $month = $startDate->copy()->addMonths($offset)->locale('id');

            return [$month->format('Y-m') => [
                'bulan' => $month->translatedFormat('M Y'),
                'total' => 0,
                'by_status' => [
                    'Diterima' => 0,
                    'Diproses' => 0,
                    'Selesai' => 0,
                    'Ditolak' => 0,
                ],
            ]];
        });

        foreach ($monthlyRows as $row) {
            if ($monthlyStats->has($row->month_key)) {
                $month = $monthlyStats->get($row->month_key);
                $month['total'] += (int) $row->total;
                $month['by_status'][$row->status] = (int) $row->total;
                $monthlyStats->put($row->month_key, $month);
            }
        }

        $oldestPending = Aspirasi::with('kategori')
            ->whereIn('status', ['Diterima', 'Diproses'])
            ->orderBy('created_at')
            ->limit(5)
            ->get(['id', 'kode_tiket', 'kategori_id', 'judul', 'status', 'created_at'])
            ->map(fn (Aspirasi $item) => [
                'id' => $item->id,
                'kode_tiket' => $item->kode_tiket,
                'kategori' => $item->kategori->nama ?? 'Tanpa kategori',
                'judul' => $item->judul,
                'status' => $item->status,
                'created_at' => $item->created_at,
            ]);

        return response()->json([
            'total' => $total,
            'by_kategori' => $byKategori,
            'by_status' => $byStatus,
            'per_bulan' => $monthlyStats->values(),
            'oldest_pending' => $oldestPending,
        ]);
    }

    /**
     * Get admin profile
     */
    public function profile(): JsonResponse
    {
        $admin = auth('admin')->user();

        return response()->json($admin);
    }
}
