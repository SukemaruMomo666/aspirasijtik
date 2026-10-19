<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Aspirasi extends Model
{
    protected $fillable = [
        'kategori_id',
        'kode_tiket',
        'judul',
        'isi',
        'saran_pelapor',
        'tautan_pendukung',
        'lampiran',
        'nama',
        'nim',
        'is_anonim',
        'status',
        'is_publik',
        'is_privat',
        'ip_hash',
        'has_badwords',
    ];

    protected $casts = [
        'is_anonim' => 'boolean',
        'is_publik' => 'boolean',
        'is_privat' => 'boolean',
        'has_badwords' => 'boolean',
        'tautan_pendukung' => 'array',
        'lampiran' => 'array',
    ];

    public function kategori(): BelongsTo
    {
        return $this->belongsTo(Kategori::class);
    }

    public function balasans(): HasMany
    {
        return $this->hasMany(Balasan::class);
    }

    public function auditTrails(): HasMany
    {
        return $this->hasMany(AuditTrail::class)->latest();
    }
}
