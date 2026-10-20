<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\AspirasiController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\KategoriController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::post('/aspirasi/submit', [AspirasiController::class, 'submit']);
Route::get('/aspirasi/status/{ticketCode}', [AspirasiController::class, 'status'])->middleware('throttle:30,1');
Route::get('/aspirasi/status/{ticketCode}/balasan/{balasan}/lampiran/{index}', [AspirasiController::class, 'downloadReplyAttachment'])->middleware('throttle:30,1');
Route::get('/aspirasi/public', [AspirasiController::class, 'publicList']);
Route::get('/aspirasi/public/{aspirasi}/lampiran/{index}', [AspirasiController::class, 'downloadPublicAttachment'])->middleware('throttle:30,1');
Route::get('/aspirasi/public/{aspirasi}/balasan/{balasan}/lampiran/{index}', [AspirasiController::class, 'downloadPublicReplyAttachment'])->middleware('throttle:30,1');
Route::get('/kategori', [KategoriController::class, 'index']);

// Auth routes
Route::post('/admin/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
Route::post('/auth/captcha-verify', [AuthController::class, 'verifyCaptcha']);

// Admin routes (protected)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/admin/logout', [AuthController::class, 'logout']);

    // Admin aspirasi management
    Route::get('/admin/aspirasi', [AdminController::class, 'index']);
    Route::get('/admin/aspirasi-export', [AdminController::class, 'export']);
    Route::get('/admin/aspirasi/{aspirasi}', [AdminController::class, 'show']);
    Route::get('/admin/aspirasi/{aspirasi}/lampiran/{index}', [AdminController::class, 'downloadAttachment']);
    Route::get('/admin/aspirasi/{aspirasi}/balasan/{balasan}/lampiran/{index}', [AdminController::class, 'downloadReplyAttachment']);
    Route::patch('/admin/aspirasi/{aspirasi}/status', [AdminController::class, 'updateStatus']);
    Route::patch('/admin/aspirasi/{aspirasi}/publik', [AdminController::class, 'togglePublic']);
    Route::patch('/admin/aspirasi/{aspirasi}/privat', [AdminController::class, 'togglePrivate']);
    Route::post('/admin/aspirasi/{aspirasi}/balas', [AdminController::class, 'reply']);

    // Admin statistics and profile
    Route::get('/admin/statistik', [AdminController::class, 'statistik']);
    Route::get('/admin/profile', [AdminController::class, 'profile']);

    // Admin user / pengurus management (Khusus Administrator)
    Route::get('/admin/users', [AdminUserController::class, 'index']);
    Route::post('/admin/users', [AdminUserController::class, 'store']);
    Route::get('/admin/users/{targetAdmin}', [AdminUserController::class, 'show']);
    Route::put('/admin/users/{targetAdmin}', [AdminUserController::class, 'update']);
    Route::patch('/admin/users/{targetAdmin}/password', [AdminUserController::class, 'updatePassword']);
    Route::patch('/admin/users/{targetAdmin}/toggle-status', [AdminUserController::class, 'toggleStatus']);
    Route::delete('/admin/users/{targetAdmin}', [AdminUserController::class, 'destroy']);
});
