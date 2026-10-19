<?php

namespace App\Utils;

class IPHasher
{
    public static function hash(string $ip): string
    {
        return hash('sha256', $ip . config('app.key'));
    }

    public static function fromRequest(): string
    {
        $ip = request()->ip() ?? '0.0.0.0';
        return self::hash($ip);
    }
}
