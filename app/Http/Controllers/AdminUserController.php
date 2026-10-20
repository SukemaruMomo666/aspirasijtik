<?php

namespace App\Http\Controllers;

use App\Models\Admin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AdminUserController extends Controller
{
    /**
     * Pastikan pengguna terautentikasi adalah Pengurus/Admin JTIK.
     */
    private function authorizeAdmin(Request $request): void
    {
        abort_unless(
            $request->user()?->role === 'admin',
            403,
            'Akses ditolak. Anda tidak memiliki izin untuk mengelola akun pengurus.'
        );
    }

    /**
     * Dapatkan daftar seluruh pengurus/admin dengan filter pencarian dan status.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $query = Admin::query()->withCount('balasans');

        // Filter pencarian nama atau email
        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('nama', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Filter status aktif (true/false)
        if ($request->has('is_active') && $request->input('is_active') !== '' && $request->input('is_active') !== null) {
            $isActive = filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($isActive !== null) {
                $query->where('is_active', $isActive);
            }
        }

        $users = $query->orderBy('nama', 'asc')->get();

        // Agregasi statistik pengurus (1 Role: Administrator)
        $allAdmins = Admin::all();
        $counts = [
            'total' => $allAdmins->count(),
            'admin' => $allAdmins->count(),
            'active' => $allAdmins->where('is_active', true)->count(),
            'inactive' => $allAdmins->where('is_active', false)->count(),
        ];

        return response()->json([
            'users' => $users,
            'counts' => $counts,
        ]);
    }

    /**
     * Tambah akun pengurus/admin baru.
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'nama' => 'required|string|max:100',
            'email' => 'required|email|max:150|unique:admins,email',
            'password' => 'required|string|min:8|max:100',
            'is_active' => 'sometimes|boolean',
        ], [
            'nama.required' => 'Nama lengkap wajib diisi.',
            'email.required' => 'Alamat email wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'email.unique' => 'Email ini sudah terdaftar sebagai pengurus.',
            'password.required' => 'Password wajib diisi.',
            'password.min' => 'Password minimal terdiri dari 8 karakter.',
        ]);

        $admin = Admin::create([
            'nama' => trim($validated['nama']),
            'email' => strtolower(trim($validated['email'])),
            'password' => Hash::make($validated['password']),
            'role' => 'admin',
            'is_active' => $validated['is_active'] ?? true,
        ]);

        $admin->loadCount('balasans');

        return response()->json([
            'message' => 'Pengurus baru berhasil ditambahkan.',
            'user' => $admin,
        ], 201);
    }

    /**
     * Detail pengurus.
     */
    public function show(Request $request, Admin $targetAdmin): JsonResponse
    {
        $this->authorizeAdmin($request);

        $targetAdmin->loadCount('balasans');

        return response()->json([
            'user' => $targetAdmin,
        ]);
    }

    /**
     * Perbarui data profil pengurus.
     */
    public function update(Request $request, Admin $targetAdmin): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'nama' => 'required|string|max:100',
            'email' => ['required', 'email', 'max:150', Rule::unique('admins', 'email')->ignore($targetAdmin->id)],
            'is_active' => 'required|boolean',
        ], [
            'nama.required' => 'Nama lengkap wajib diisi.',
            'email.required' => 'Alamat email wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'email.unique' => 'Email ini sudah digunakan oleh akun lain.',
            'is_active.required' => 'Status keaktifan akun wajib ditentukan.',
        ]);

        $isSelf = (int) $request->user()->id === (int) $targetAdmin->id;

        // Proteksi: tidak boleh menonaktifkan akun sendiri
        if ($isSelf && ! $validated['is_active']) {
            return response()->json([
                'message' => 'Anda tidak dapat menonaktifkan akun yang sedang Anda gunakan saat ini.',
            ], 422);
        }

        // Proteksi: harus ada minimal 1 Pengurus/Admin aktif di sistem
        if (! $validated['is_active']) {
            $otherActiveAdmins = Admin::where('is_active', true)
                ->where('id', '!=', $targetAdmin->id)
                ->count();

            if ($otherActiveAdmins < 1) {
                return response()->json([
                    'message' => 'Operasi ditolak. Sistem wajib memiliki minimal satu akun Pengurus yang aktif.',
                ], 422);
            }
        }

        $targetAdmin->update([
            'nama' => trim($validated['nama']),
            'email' => strtolower(trim($validated['email'])),
            'role' => 'admin',
            'is_active' => (bool) $validated['is_active'],
        ]);

        // Jika dinonaktifkan, cabut semua sesi login pengguna ini
        if (! $targetAdmin->is_active && ! $isSelf) {
            $targetAdmin->tokens()->delete();
        }

        $targetAdmin->loadCount('balasans');

        return response()->json([
            'message' => 'Data pengurus berhasil diperbarui.',
            'user' => $targetAdmin,
        ]);
    }

    /**
     * Ganti / Reset password pengurus.
     */
    public function updatePassword(Request $request, Admin $targetAdmin): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'password' => 'required|string|min:8|max:100',
        ], [
            'password.required' => 'Password baru wajib diisi.',
            'password.min' => 'Password baru minimal harus 8 karakter.',
        ]);

        $targetAdmin->update([
            'password' => Hash::make($validated['password']),
        ]);

        // Jika bukan akun sendiri, cabut sesi login lama agar harus login ulang dengan password baru
        if ((int) $request->user()->id !== (int) $targetAdmin->id) {
            $targetAdmin->tokens()->delete();
        }

        return response()->json([
            'message' => 'Password pengurus berhasil diperbarui.',
        ]);
    }

    /**
     * Ubah status aktif / nonaktif pengurus dengan cepat.
     */
    public function toggleStatus(Request $request, Admin $targetAdmin): JsonResponse
    {
        $this->authorizeAdmin($request);

        // Proteksi: tidak boleh menonaktifkan akun sendiri
        if ((int) $request->user()->id === (int) $targetAdmin->id) {
            return response()->json([
                'message' => 'Anda tidak dapat menonaktifkan akun Anda sendiri.',
            ], 422);
        }

        $newStatus = ! $targetAdmin->is_active;

        // Jika akan dinonaktifkan, pastikan ada admin aktif lain
        if (! $newStatus) {
            $otherActiveAdmins = Admin::where('is_active', true)
                ->where('id', '!=', $targetAdmin->id)
                ->count();

            if ($otherActiveAdmins < 1) {
                return response()->json([
                    'message' => 'Operasi ditolak. Sistem wajib memiliki minimal satu Pengurus yang aktif.',
                ], 422);
            }
        }

        $targetAdmin->update(['is_active' => $newStatus]);

        if (! $newStatus) {
            $targetAdmin->tokens()->delete();
        }

        $targetAdmin->loadCount('balasans');

        return response()->json([
            'message' => $newStatus ? 'Akun pengurus berhasil diaktifkan kembali.' : 'Akun pengurus berhasil dinonaktifkan.',
            'user' => $targetAdmin,
        ]);
    }

    /**
     * Hapus akun pengurus.
     */
    public function destroy(Request $request, Admin $targetAdmin): JsonResponse
    {
        $this->authorizeAdmin($request);

        // Proteksi: tidak boleh menghapus akun sendiri
        if ((int) $request->user()->id === (int) $targetAdmin->id) {
            return response()->json([
                'message' => 'Anda tidak dapat menghapus akun Anda sendiri.',
            ], 422);
        }

        // Proteksi: tidak boleh menghapus admin aktif terakhir
        $otherActiveAdmins = Admin::where('is_active', true)
            ->where('id', '!=', $targetAdmin->id)
            ->count();

        if ($otherActiveAdmins < 1) {
            return response()->json([
                'message' => 'Operasi ditolak. Tidak dapat menghapus satu-satunya Pengurus aktif yang tersisa.',
            ], 422);
        }

        // Proteksi integritas data: jika sudah pernah membalas aspirasi
        if ($targetAdmin->balasans()->exists()) {
            return response()->json([
                'message' => 'Pengurus ini telah memiliki riwayat tanggapan pada aspirasi mahasiswa. Demi menjaga keaslian arsip, silakan nonaktifkan akun ini sebagai gantinya.',
            ], 422);
        }

        $targetAdmin->tokens()->delete();
        $targetAdmin->delete();

        return response()->json([
            'message' => 'Akun pengurus berhasil dihapus.',
        ]);
    }
}
