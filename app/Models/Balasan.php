<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Balasan extends Model
{
    protected $fillable = [
        'aspirasi_id',
        'admin_id',
        'isi',
        'lampiran',
    ];

    protected $casts = [
        'lampiran' => 'array',
    ];

    public function aspirasi(): BelongsTo
    {
        return $this->belongsTo(Aspirasi::class);
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(Admin::class);
    }
}
