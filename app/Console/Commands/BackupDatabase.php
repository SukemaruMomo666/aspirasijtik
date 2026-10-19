<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Symfony\Component\Process\Process;

class BackupDatabase extends Command
{
    protected $signature = 'db:backup';

    protected $description = 'Simpan salinan database ke storage privat aplikasi';

    public function handle(): int
    {
        $connection = config('database.default');
        $folder = storage_path('app/private/backups');
        File::ensureDirectoryExists($folder, 0700, true);
        @chmod($folder, 0700);
        $path = $folder.'/'.now()->format('Ymd-His').'-'.$connection.'.'.($connection === 'sqlite' ? 'sqlite' : 'sql');

        try {
            if ($connection === 'sqlite') {
                $source = config('database.connections.sqlite.database');
                if (! is_file($source)) {
                    $this->error('File database SQLite tidak ditemukan.');
                    return self::FAILURE;
                }
                DB::connection()->getPdo()->exec('PRAGMA wal_checkpoint(FULL)');
                if (! copy($source, $path)) throw new \RuntimeException('Gagal menyalin file database.');
            } elseif (in_array($connection, ['mysql', 'mariadb'], true)) {
                $db = config("database.connections.{$connection}");
                $handle = fopen($path, 'wb');
                if (! $handle) throw new \RuntimeException('Gagal membuat file backup.');
                $process = new Process([
                    'mysqldump', '--host='.$db['host'], '--port='.$db['port'], '--user='.$db['username'],
                    '--single-transaction', '--quick', '--routines', '--triggers', $db['database'],
                ], base_path(), ['MYSQL_PWD' => $db['password']]);
                $process->setTimeout(1200);
                $process->run(static function (string $type, string $buffer) use ($handle): void {
                    if ($type === Process::OUT) fwrite($handle, $buffer);
                });
                fclose($handle);
                if (! $process->isSuccessful()) {
                    @unlink($path);
                    throw new \RuntimeException('mysqldump gagal: '.trim($process->getErrorOutput()));
                }
            } else {
                $this->error("Driver database {$connection} belum didukung untuk backup otomatis.");
                return self::FAILURE;
            }

            @chmod($path, 0600);
            $this->info("Backup tersimpan: {$path}");
            $retentionDays = max(1, (int) config('database.backup.keep_days', 14));
            foreach (File::files($folder) as $file) {
                if ($file->getMTime() < now()->subDays($retentionDays)->timestamp) File::delete($file->getPathname());
            }

            return self::SUCCESS;
        } catch (\Throwable $exception) {
            @unlink($path);
            report($exception);
            $this->error('Backup database gagal: '.$exception->getMessage());
            return self::FAILURE;
        }
    }
}
