<?php

namespace App\Utils;

use Illuminate\Support\Facades\Http;

class TurnstileVerifier
{
    /**
     * Cek apakah Google reCAPTCHA telah dikonfigurasi (secret key & site key).
     */
    public static function configured(): bool
    {
        return filled(config('services.recaptcha.secret_key'))
            && filled(config('services.recaptcha.site_key'));
    }

    /**
     * Verifikasi token ke endpoint Google reCAPTCHA v2.
     */
    public static function verify(string $token, ?string $ipAddress = null): bool
    {
        if (! self::configured()) {
            return false;
        }

        try {
            $response = Http::asForm()->acceptJson()->timeout(5)->post(
                config('services.recaptcha.verify_url', 'https://www.google.com/recaptcha/api/siteverify'),
                array_filter([
                    'secret' => config('services.recaptcha.secret_key'),
                    'response' => $token,
                    'remoteip' => $ipAddress,
                ], static fn ($value) => $value !== null && $value !== '')
            );

            return $response->successful() && $response->json('success') === true;
        } catch (\Throwable) {
            return false;
        }
    }
}
