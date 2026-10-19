<?php

namespace App\Http\Controllers;

use App\Models\Admin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Utils\TurnstileVerifier;

class AuthController extends Controller
{
    /**
     * Admin login
     */
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string|min:6',
        ]);

        $admin = Admin::where('email', $validated['email'])->first();

        if (! $admin || ! Hash::check($validated['password'], $admin->password)) {
            return response()->json([
                'message' => 'Email atau password salah',
            ], 401);
        }

        if (! $admin->is_active) {
            return response()->json([
                'message' => 'Akun admin tidak aktif',
            ], 403);
        }

        // Update last login
        $admin->update(['last_login' => now()]);

        // Generate token (using Sanctum)
        $token = $admin->createToken('admin-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'admin' => $admin,
            'message' => 'Login berhasil',
        ]);
    }

    /**
     * Admin logout
     */
    public function logout(Request $request): JsonResponse
    {
        auth('admin')->user()?->tokens()->delete();

        return response()->json([
            'message' => 'Logout berhasil',
        ]);
    }

    /**
     * Verify captcha token
     */
    public function verifyCaptcha(Request $request): JsonResponse
    {
        if (! TurnstileVerifier::configured()) {
            return response()->json([
                'message' => 'Verifikasi CAPTCHA belum dikonfigurasi',
            ], 503);
        }

        $validated = $request->validate([
            'token' => 'required|string',
        ]);

        if (! TurnstileVerifier::verify($validated['token'], $request->ip())) {
            return response()->json(['message' => 'Verifikasi CAPTCHA gagal. Silakan coba lagi.'], 422);
        }

        return response()->json([
            'verified' => true,
            'message' => 'Verifikasi CAPTCHA berhasil',
        ]);
    }
}
