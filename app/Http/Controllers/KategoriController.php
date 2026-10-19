<?php

namespace App\Http\Controllers;

use App\Models\Kategori;
use Illuminate\Http\JsonResponse;

class KategoriController extends Controller
{
    /**
     * Get all kategori
     */
    public function index(): JsonResponse
    {
        $kategoris = Kategori::all();
        return response()->json($kategoris);
    }
}
