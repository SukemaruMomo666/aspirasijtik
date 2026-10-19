import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { aspirasiAPI } from '../services/api';
import { Aspirasi } from '../types';
import SiteFooter from '../components/SiteFooter';
import SiteHeader from '../components/SiteHeader';
import FeedbackPanel from '../components/FeedbackPanel';

export default function Home() {
  const [publicAspirasis, setPublicAspirasis] = useState<Aspirasi[]>([]);
  const [publicLoading, setPublicLoading] = useState(true);
  const [publicError, setPublicError] = useState<string | null>(null);

  useEffect(() => {
    loadPublicPreview();
  }, []);

  const loadPublicPreview = async () => {
    setPublicLoading(true);
    setPublicError(null);
    try {
      const response = await aspirasiAPI.getPublic();
      setPublicAspirasis((response.data.data || []).slice(0, 3));
    } catch (error) {
      console.error('Gagal memuat cuplikan aspirasi publik:', error);
      setPublicError('Cuplikan aspirasi publik gagal dimuat.');
    } finally {
      setPublicLoading(false);
    }
  };

  return (
    <div className="app-site public-page public-home">
      <SiteHeader active="home" />
      <main id="main-content" className="public-main" tabIndex={-1}>
        <div className="public-container">
          <section className="home-hero" aria-labelledby="home-title">
            <div className="home-hero-copy">
              <span className="public-eyebrow home-kicker">Ruang aspirasi mahasiswa JTIK</span>
              <h1 id="home-title">Sampaikan suaramu.<br /><span>Pantau tindak lanjutnya.</span></h1>
              <p className="home-hero-description">
                Saran, keluhan, dan ide untuk jurusan tercatat dengan rapi. Kirim tanpa login, pilih anonim bila perlu, lalu simpan kode tiket untuk melihat perkembangannya.
              </p>
              <div className="home-hero-actions">
                <Link className="button-primary" to="/form">Mulai tulis aspirasi <span aria-hidden="true">→</span></Link>
                <Link className="button-secondary" to="/status">Cek status tiket</Link>
              </div>
              <div className="home-assurances" aria-label="Keunggulan layanan">
                <span><b aria-hidden="true">✓</b> Tanpa login</span>
                <span><b aria-hidden="true">✓</b> Bisa anonim</span>
                <span><b aria-hidden="true">✓</b> Dapat kode tiket</span>
              </div>
            </div>

            <div className="home-visual" aria-label="Ilustrasi mahasiswa dan contoh tiket aspirasi">
              <div className="home-visual-art">
                <img
                  src="/images/mahasiswa-aspirasi-flat.webp"
                  alt=""
                  width="900"
                  height="675"
                  fetchPriority="high"
                  decoding="async"
                />
                <span className="home-visual-note">Ruang untuk suaramu</span>
              </div>
              <article className="home-ticket">
                <div className="home-ticket-main">
                  <div className="home-ticket-brand">
                    <span className="home-ticket-category"><i aria-hidden="true" /> TIKET ASPIRASI · JTIK</span>
                    <span className="home-ticket-sample">CONTOH</span>
                  </div>
                  <div className="home-ticket-details">
                    <span>Fasilitas</span>
                    <span className="home-ticket-status">Diproses</span>
                  </div>
                  <h2>Perbaikan fasilitas ruang praktikum</h2>
                  <p>Dikirim 12 Okt 2026 <span>·</span> anonim</p>
                  <div className="home-ticket-code">
                    <span>KODE PELACAKAN</span>
                    <strong>JTIK–7Q4M–2XB9</strong>
                  </div>
                </div>
                <div className="home-ticket-stub" aria-hidden="true">
                  <span className="home-ticket-stub-label">SIMPAN KODE INI</span>
                  <b>JTIK</b>
                  <span className="home-ticket-barcode" />
                  <small>UNTUK CEK STATUS</small>
                </div>
              </article>
            </div>
          </section>

          <section className="public-section home-process" aria-labelledby="process-title">
            <div className="section-heading">
              <div><span className="public-eyebrow">Mudah dan terlacak</span><h2 id="process-title">Tiga langkah sederhana</h2></div>
              <p>Seluruh proses bisa dilakukan lewat ponsel, kapan saja.</p>
            </div>
            <div className="process-grid">
              <article className="process-card"><span>01</span><div><h3>Tulis aspirasi</h3><p>Pilih kategori dan ceritakan hal yang perlu diketahui jurusan.</p></div></article>
              <article className="process-card"><span>02</span><div><h3>Simpan kode tiket</h3><p>Kode unik diberikan setelah aspirasi berhasil dikirim.</p></div></article>
              <article className="process-card"><span>03</span><div><h3>Pantau kabar terbaru</h3><p>Gunakan kode tiket untuk melihat status dan balasan.</p></div></article>
            </div>
          </section>

          <section className="public-section home-privacy" aria-labelledby="privacy-title">
            <div className="privacy-intro">
              <span className="public-eyebrow">Privasi tetap dijaga</span>
              <h2 id="privacy-title">Kamu yang menentukan identitasmu.</h2>
              <p>Mode anonim tidak menyimpan nama dan NIM. Aspirasi yang tampil untuk publik disetujui lebih dulu oleh pengurus.</p>
            </div>
            <div className="privacy-points">
              <div><span aria-hidden="true">01</span><p><b>Tanpa akun mahasiswa</b>Formulir bisa langsung digunakan.</p></div>
              <div><span aria-hidden="true">02</span><p><b>Anonim sesuai pilihanmu</b>Nama dan NIM tidak disimpan saat anonim aktif.</p></div>
              <div><span aria-hidden="true">03</span><p><b>Publik setelah ditinjau</b>Pengurus menyetujui aspirasi sebelum ditampilkan.</p></div>
            </div>
          </section>

          <section className="public-section home-public-preview" aria-labelledby="public-preview-title">
            <div className="section-heading">
              <div><span className="public-eyebrow">Terbuka untuk dilihat</span><h2 id="public-preview-title">Tanggapan dari jurusan</h2></div>
              <Link className="text-link" to="/publik">Lihat semua aspirasi <span aria-hidden="true">→</span></Link>
            </div>
            {publicError && <FeedbackPanel variant="error" title="Aspirasi publik tidak tersedia" message={publicError} actionLabel="Coba lagi" onAction={loadPublicPreview} actionDisabled={publicLoading} />}
            {publicLoading && <FeedbackPanel variant="loading" title="Memuat aspirasi publik…" />}
            {!publicLoading && !publicError && publicAspirasis.length > 0 && (
              <div className="home-public-list">
                {publicAspirasis.map((item) => (
                  <article key={item.id}>
                    <div className="home-public-meta"><span>{item.kategori?.nama || 'Aspirasi'}</span><span>{item.status}</span></div>
                    <h3>{item.judul}</h3>
                    <p>{new Date(item.created_at).toLocaleDateString('id-ID')}</p>
                    {item.balasans?.[0] && <blockquote>{item.balasans[0].isi}</blockquote>}
                  </article>
                ))}
              </div>
            )}
            {!publicLoading && !publicError && publicAspirasis.length === 0 && <FeedbackPanel variant="empty" title="Belum ada aspirasi publik" message="Aspirasi yang disetujui untuk ditampilkan akan muncul di sini." />}
          </section>

          <section className="home-final-cta">
            <div><span className="public-eyebrow">Punya saran atau kendala?</span><h2>Ceritakan kepada kami.</h2><p>Setiap aspirasi membantu jurusan memahami kebutuhan mahasiswa.</p></div>
            <Link className="button-primary button-light" to="/form">Mulai tulis aspirasi <span aria-hidden="true">→</span></Link>
            <div className="home-cta-illustration" aria-hidden="true"><img src="/images/hero-arah-cta.webp" width="1536" height="1024" alt="" loading="lazy" /></div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
