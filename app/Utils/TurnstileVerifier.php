<?php

namespace App\Utils;

use Illuminate\Support\Facades\Http;

class TurnstileVerifier
{
    public static function configured(): bool
    {
        return filled(config('services.turnstile.secret_key'))
            && filled(config('services.turnstile.site_key'));
    }

    public static function verify(string $token, ?string $ipAddress = null): bool
    {
        if (! self::configured()) {
            return false;
        }

        try {
            $response = Http::asForm()->acceptJson()->timeout(5)->post(
                config('services.turnstile.verify_url'),
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
}
