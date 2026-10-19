<?php

namespace Tests\Feature;

use Tests\TestCase;

class ApiBoundaryTest extends TestCase
{
    public function test_admin_routes_reject_guests(): void
    {
        $this->getJson('/api/admin/profile')->assertUnauthorized();
    }

    public function test_login_validates_email_before_database_access(): void
    {
        $this->postJson('/api/admin/login', [
            'email' => 'not-an-email',
            'password' => 'short',
        ])->assertUnprocessable()->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_captcha_does_not_accept_unverified_tokens(): void
    {
        $this->postJson('/api/auth/captcha-verify', ['token' => 'anything'])
            ->assertStatus(503)
            ->assertJsonPath('message', 'Verifikasi CAPTCHA belum dikonfigurasi');
    }
}
