<?php

namespace App\Utils;

use Illuminate\Support\Facades\Http;

class TurnstileVerifier
{
    /**
     * Cek apakah Google reCAPTCHA telah dikonfigurasi lengkap (site key & secret key).
     */
    public static function hasRecaptcha(): bool
    {
        return filled(config('services.recaptcha.secret_key'))
            && filled(config('services.recaptcha.site_key'));
    }

    /**
     * Cek apakah Cloudflare Turnstile telah dikonfigurasi lengkap (site key & secret key).
     */
    public static function hasTurnstile(): bool
    {
        return filled(config('services.turnstile.secret_key'))
            && filled(config('services.turnstile.site_key'));
    }

    /**
     * Cek apakah minimal ada salah satu penyedia CAPTCHA yang dikonfigurasi.
     */
    public static function configured(): bool
    {
        return self::hasRecaptcha() || self::hasTurnstile();
    }

    /**
     * Verifikasi token CAPTCHA dengan mekanisme Graceful Fallback:
     * 1. Prioritas 1: Verifikasi token ke endpoint Google reCAPTCHA v2 jika kuncinya dikonfigurasi.
     * 2. Prioritas 2 (Fallback): Jika verifikasi Google gagal atau kuncinya belum lengkap,
     *    otomatis mencoba verifikasi token ke Cloudflare Turnstile.
     */
    public static function verify(string $token, ?string $ipAddress = null): bool
    {
        if (! self::configured()) {
            return false;
        }

        // Prioritas 1: Verifikasi token ke Google reCAPTCHA
        if (self::hasRecaptcha()) {
            try {
                $response = Http::asForm()->acceptJson()->timeout(5)->post(
                    config('services.recaptcha.verify_url', 'https://www.google.com/recaptcha/api/siteverify'),
                    array_filter([
                        'secret' => config('services.recaptcha.secret_key'),
                        'response' => $token,
                        'remoteip' => $ipAddress,
                    ], static fn ($value) => $value !== null && $value !== '')
                );

                if ($response->successful() && $response->json('success') === true) {
                    return true;
                }
            } catch (\Throwable) {
                // Terjadi timeout atau kendala jaringan saat menghubungi Google, fallback ke Turnstile
            }
        }

        // Prioritas 2 (Fallback): Coba verifikasi ke Cloudflare Turnstile
        if (self::hasTurnstile()) {
            try {
                $response = Http::asForm()->acceptJson()->timeout(5)->post(
                    config('services.turnstile.verify_url', 'https://challenges.cloudflare.com/turnstile/v0/siteverify'),
                    array_filter([
                        'secret' => config('services.turnstile.secret_key'),
                        'response' => $token,
                        'remoteip' => $ipAddress,
                    ], static fn ($value) => $value !== null && $value !== '')
                );

                return $response->successful() && $response->json('success') === true;
            } catch (\Throwable) {
                return false;
            }
        }

        return false;
    }
}
