<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SpamTrack extends Model
{
    protected $fillable = [
        'ip_hash',
        'count',
        'reset_at',
    ];

    protected $casts = [
        'reset_at' => 'datetime',
    ];
}
