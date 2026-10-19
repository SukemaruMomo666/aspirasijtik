<?php

namespace App\Utils;

use App\Models\Aspirasi;

class TicketGenerator
{
    public static function generate(): string
    {
        $characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        $code = '';

        do {
            $code = '';
            for ($i = 0; $i < 8; $i++) {
                $code .= $characters[random_int(0, strlen($characters) - 1)];
            }
        } while (Aspirasi::where('kode_tiket', $code)->exists());

        return $code;
    }
}
