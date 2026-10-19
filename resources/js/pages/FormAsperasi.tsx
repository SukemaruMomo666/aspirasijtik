import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { aspirasiAPI, kategoriAPI } from '../services/api';
import { Kategori } from '../types';
import { colors, fonts } from '../utils/designTokens';
import SiteFooter from '../components/SiteFooter';
import SiteHeader from '../components/SiteHeader';
import FeedbackPanel from '../components/FeedbackPanel';
import TurnstileCaptcha from '../components/TurnstileCaptcha';

interface FormData {
  kategori_id: number;
  judul: string;
  isi: string;
  nama: string;
  nim: string;
  is_anonim: boolean;
  saran_pelapor: string;
}

export default function FormAsperasi() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<FormData>({
    defaultValues: { is_anonim: true },
  });

  const [kategoris, setKategoris] = useState<Kategori[]>([]);
  const [kategoriLoading, setKategoriLoading] = useState(true);
  const [kategoriError, setKategoriError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [ticketCode, setTicketCode] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaVersion, setCaptchaVersion] = useState(0);
  const [lampiranFiles, setLampiranFiles] = useState<File[]>([]);
  const [lampiranError, setLampiranError] = useState<string | null>(null);
  const [tautanText, setTautanText] = useState('');

  const isAnonim = watch('is_anonim');
  const isiLength = watch('isi')?.length || 0;

  useEffect(() => {
    loadKategoris();
  }, []);

  const loadKategoris = async () => {
    try {
      setKategoriLoading(true);
      setKategoriError(null);
      const response = await kategoriAPI.getAll();
      // Handle both array and object responses
      const data = Array.isArray(response.data) ? response.data : response.data.data || [];
      setKategoris(data);
    } catch (err) {
      console.error('Error loading kategoris:', err);
      setKategoriError('Daftar kategori gagal dimuat.');
    } finally {
      setKategoriLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    const tautan = tautanText.split(/\r?\n/).map((url) => url.trim()).filter(Boolean);
    if (tautan.length > 5) {
      setError('Maksimal 5 tautan pendukung.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = new window.FormData();
      payload.append('kategori_id', String(Number(data.kategori_id)));
      payload.append('judul', data.judul);
      payload.append('isi', data.isi);
      payload.append('saran_pelapor', data.saran_pelapor || '');
      payload.append('nama', data.is_anonim ? '' : data.nama || '');
      payload.append('nim', data.is_anonim ? '' : data.nim || '');
      payload.append('is_anonim', data.is_anonim ? '1' : '0');
      payload.append('captcha_token', captchaToken);
      tautan.forEach((url) => payload.append('tautan_pendukung[]', url));
      lampiranFiles.forEach((file) => payload.append('lampiran[]', file));

      const response = await aspirasiAPI.submit(payload);

      setTicketCode(response.data.kode_tiket);
      setSuccess(true);

      setTimeout(() => {
        navigate(`/status?ticket=${response.data.kode_tiket}`);
      }, 3000);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Gagal mengirim aspirasi';
      setError(message);
      setCaptchaToken('');
      setCaptchaVersion((version) => version + 1);
    } finally {
      setLoading(false);
    }
  };

  if (success && ticketCode) {
    return (
      <div className="app-site public-page public-form-page" style={{
        backgroundColor: colors.paper,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <SiteHeader active="form" />

        {/* Main */}
        <main id="main-content" className="public-main" tabIndex={-1} style={{
          flex: 1,
          padding: '26px 18px 34px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div className="submission-success-card" style={{
            width: '100%',
            maxWidth: '400px',
            background: colors.card,
            border: `1px solid ${colors.rule}`,
            borderRadius: '12px',
            padding: '20px',
            boxShadow: `0 12px 30px -20px rgba(15,50,96,.35)`,
            textAlign: 'center',
          }}>
            <img className="public-page-illustration success-illustration" src="/images/mahasiswa-menulis-aspirasi.webp" alt="" width="1448" height="1086" />
            <div style={{
              width: '64px',
              height: '64px',
              background: '#E8F5E9',
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 20px',
              fontSize: '32px',
            }}>
              ✓
            </div>
            <h2 style={{
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: '19px',
              letterSpacing: '-.02em',
              margin: '0 0 12px',
              color: colors.ink,
            }}>
              Aspirasi Berhasil Dikirim!
            </h2>
            <p style={{
              fontSize: '13px',
              color: colors.ink2,
              margin: '0 0 20px',
              lineHeight: 1.6,
            }}>
              Simpan kode tiket Anda untuk melacak status aspirasi Anda.
            </p>
            <div style={{
              background: '#FCF8EF',
              border: `1px solid #E8D6AC`,
              borderRadius: '10px',
              padding: '13px 15px',
              margin: '0 0 20px',
            }}>
              <p style={{
                fontFamily: fonts.mono,
                fontSize: '9.5px',
                letterSpacing: '.07em',
                textTransform: 'uppercase',
                color: colors.status.diproses,
                margin: '0 0 8px',
                fontWeight: 600,
              }}>
                Kode Tiket
              </p>
              <p style={{
                fontFamily: fonts.mono,
                fontWeight: 600,
                fontSize: '20px',
                letterSpacing: '.1em',
                color: colors.ink,
                margin: 0,
                wordBreak: 'break-all',
              }}>
                {ticketCode}
              </p>
            </div>
            <p style={{
              fontSize: '11.5px',
              color: colors.ink3,
              margin: '0 0 20px',
            }}>
              Anda akan diarahkan ke halaman status dalam beberapa detik...
            </p>
            <button
              onClick={() => navigate(`/status?ticket=${ticketCode}`)}
              style={{
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 18px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
                border: '1px solid transparent',
                background: colors.seal,
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Lihat Status Sekarang
            </button>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="app-site public-page public-form-page" style={{
      backgroundColor: colors.paper,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <SiteHeader active="form" />

      {/* Main Content */}
      <main id="main-content" className="public-main" tabIndex={-1} style={{
        flex: 1,
        padding: '26px 18px 34px',
      }}>
        <div className="public-container form-container" style={{
          width: '100%',
          maxWidth: '760px',
          margin: '0 auto',
        }}>
          <div className="form-intro-layout">
          <div className="form-intro">
          <div className="public-eyebrow">
            Langkah 1 dari 2
          </div>
          <h1 className="small-title" style={{
            fontFamily: fonts.display,
            fontWeight: 700,
            fontSize: '22px',
            lineHeight: 1.18,
            letterSpacing: '-.024em',
            margin: '0 0 13px',
            color: colors.ink,
          }}>
            Tulis aspirasimu
          </h1>
          <p style={{
            fontSize: '15.5px',
            color: colors.ink2,
            margin: '0 0 22px',
            maxWidth: '56ch',
            lineHeight: 1.55,
          }}>
            Isi sekitar 1–2 menit. Semakin spesifik lokasinya, semakin mudah ditindaklanjuti.
          </p>
          </div>
          <img className="public-page-illustration form-illustration" src="/images/mahasiswa-menulis-aspirasi.webp" alt="" width="1448" height="1086" fetchPriority="high" decoding="async" />
          </div>

          {/* Form */}
          <form className="public-form-card" onSubmit={handleSubmit(onSubmit)}>
            {error && <FeedbackPanel variant="error" title="Aspirasi belum terkirim" message={error} />}

            {/* Kategori */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                fontSize: '12.5px',
                fontWeight: 600,
                display: 'block',
                marginBottom: '7px',
              }}>
                Kategori <span style={{ color: colors.status.ditolak }}>*</span>
              </label>
              <p style={{
                fontSize: '11.5px',
                color: colors.ink3,
                margin: '-3px 0 8px',
                lineHeight: 1.5,
              }}>
                Pilih satu yang paling mendekati.
              </p>
              {kategoriError && <FeedbackPanel variant="error" title="Kategori tidak tersedia" message={kategoriError} actionLabel="Coba lagi" onAction={loadKategoris} actionDisabled={kategoriLoading} />}
              {kategoriLoading && <FeedbackPanel variant="loading" title="Memuat kategori…" />}
              {!kategoriLoading && !kategoriError && kategoris.length === 0 && <FeedbackPanel variant="empty" title="Belum ada kategori" message="Formulir belum dapat dikirim sampai kategori tersedia." />}
              {!kategoriLoading && kategoris.length > 0 && <div className="form-categories" style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
              }}>
                {kategoris.map((k) => (
                  <label key={k.id} className="form-category" style={{
                    position: 'relative',
                    fontSize: '12.5px',
                    fontWeight: 500,
                    padding: '9px 14px',
                    border: `1px solid #C3CFDC`,
                    borderRadius: '8px',
                    background: colors.card,
                    cursor: 'pointer',
                    transition: 'all .14s',
                  }}>
                    <input
                      type="radio"
                      value={k.id}
                      {...register('kategori_id', { required: true })}
                      style={{
                        position: 'absolute',
                        opacity: 0,
                        width: 0,
                        height: 0,
                      }}
                    />
                    <span>{k.nama}</span>
                  </label>
                ))}
              </div>}
              {errors.kategori_id && (
                <p style={{
                  fontSize: '12px',
                  color: colors.status.ditolak,
                  marginTop: '6px',
                  fontWeight: 500,
                }}>
                  Pilih kategori dulu.
                </p>
              )}
            </div>

            {/* Judul */}
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="judul" style={{
                fontSize: '12.5px',
                fontWeight: 600,
                display: 'block',
                marginBottom: '7px',
              }}>
                Judul <span style={{ color: colors.status.ditolak }}>*</span>
              </label>
              <p style={{
                fontSize: '11.5px',
                color: colors.ink3,
                margin: '-3px 0 8px',
                lineHeight: 1.5,
              }}>
                Satu kalimat. Contoh: "Proyektor Lab Multimedia 2 tidak menyala".
              </p>
              <input
                id="judul"
                type="text"
                maxLength={90}
                placeholder="Ringkas aspirasi kamu dalam satu kalimat"
                {...register('judul', {
                  required: 'Judul minimal 8 karakter',
                  minLength: { value: 8, message: 'Judul minimal 8 karakter' },
                })}
                style={{
                  width: '100%',
                  background: colors.card,
                  border: `1px solid #C3CFDC`,
                  borderRadius: '8px',
                  padding: '11px 13px',
                  fontSize: '14px',
                  color: colors.ink,
                  transition: 'border-color .14s, box-shadow .14s',
                }}
              />
              {errors.judul && (
                <p style={{
                  fontSize: '12px',
                  color: colors.status.ditolak,
                  marginTop: '6px',
                  fontWeight: 500,
                }}>
                  {errors.judul.message}
                </p>
              )}
            </div>

            {/* Isi Aspirasi */}
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="isi" style={{
                fontSize: '12.5px',
                fontWeight: 600,
                display: 'block',
                marginBottom: '7px',
              }}>
                Isi aspirasi <span style={{ color: colors.status.ditolak }}>*</span>
              </label>
              <p style={{
                fontSize: '11.5px',
                color: colors.ink3,
                margin: '-3px 0 8px',
                lineHeight: 1.5,
              }}>
                Ceritakan apa yang terjadi, kapan, dan di mana. Tanpa nama orang pun tidak apa-apa.
              </p>
              <textarea
                id="isi"
                maxLength={700}
                placeholder="Contoh: Setiap habis dzuhur listrik di Lab Jaringan 3 selalu turun..."
                {...register('isi', {
                  required: 'Isi aspirasi minimal 20 karakter',
                  minLength: { value: 20, message: 'Isi aspirasi minimal 20 karakter' },
                })}
                style={{
                  width: '100%',
                  background: colors.card,
                  border: `1px solid #C3CFDC`,
                  borderRadius: '8px',
                  padding: '11px 13px',
                  fontSize: '14px',
                  color: colors.ink,
                  minHeight: '132px',
                  resize: 'vertical',
                  lineHeight: 1.65,
                  fontFamily: fonts.sans,
                  transition: 'border-color .14s, box-shadow .14s',
                }}
              />
              <div style={{
                fontFamily: fonts.mono,
                fontSize: '10.5px',
                color: isiLength > 650 ? colors.status.diproses : isiLength > 700 ? colors.status.ditolak : colors.ink3,
                textAlign: 'right',
                marginTop: '5px',
              }}>
                {isiLength} / 700 karakter
              </div>
              {errors.isi && (
                <p style={{
                  fontSize: '12px',
                  color: colors.status.ditolak,
                  marginTop: '6px',
                  fontWeight: 500,
                }}>
                  {errors.isi.message}
                </p>
              )}
            </div>

            {/* Saran dari pelapor */}
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="saran-pelapor" style={{ fontSize: '12.5px', fontWeight: 600, display: 'block', marginBottom: '7px' }}>
                Saran atau solusi <span style={{ color: colors.ink3, fontWeight: 400 }}>(opsional)</span>
              </label>
              <p style={{ fontSize: '11.5px', color: colors.ink3, margin: '-3px 0 8px', lineHeight: 1.5 }}>
                Jika ada ide penyelesaian, tuliskan agar pengurus dapat mempertimbangkannya.
              </p>
              <textarea
                id="saran-pelapor"
                maxLength={2000}
                rows={3}
                placeholder="Contoh: Mungkin jadwal pemeliharaan lab bisa diumumkan sebelumnya."
                {...register('saran_pelapor')}
                style={{ width: '100%', background: colors.card, border: '1px solid #C3CFDC', borderRadius: '8px', padding: '11px 13px', fontSize: '14px', color: colors.ink, resize: 'vertical', lineHeight: 1.55, fontFamily: fonts.sans }}
              />
            </div>

            {/* Optional links and evidence */}
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="tautan-pendukung" style={{ fontSize: '12.5px', fontWeight: 600, display: 'block', marginBottom: '7px' }}>
                Tautan pendukung <span style={{ color: colors.ink3, fontWeight: 400 }}>(opsional)</span>
              </label>
              <p style={{ fontSize: '11.5px', color: colors.ink3, margin: '-3px 0 8px', lineHeight: 1.5 }}>
                Tempel maksimal 5 tautan, satu tautan per baris.
              </p>
              <textarea
                id="tautan-pendukung"
                rows={2}
                value={tautanText}
                onChange={(event) => setTautanText(event.target.value)}
                placeholder="https://contoh.ac.id/dokumen"
                style={{ width: '100%', background: colors.card, border: '1px solid #C3CFDC', borderRadius: '8px', padding: '11px 13px', fontSize: '14px', color: colors.ink, resize: 'vertical', lineHeight: 1.55, fontFamily: fonts.sans }}
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label htmlFor="lampiran-bukti" style={{ fontSize: '12.5px', fontWeight: 600, display: 'block', marginBottom: '7px' }}>
                Lampiran bukti <span style={{ color: colors.ink3, fontWeight: 400 }}>(opsional)</span>
              </label>
              <p style={{ fontSize: '11.5px', color: colors.ink3, margin: '-3px 0 8px', lineHeight: 1.5 }}>
                Maksimal 3 file, masing-masing 5 MB. Format JPG, PNG, WEBP, atau PDF.
              </p>
              <input
                id="lampiran-bukti"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                multiple
                onChange={(event) => {
                  const files = Array.from(event.target.files || []);
                  const invalid = files.length > 3
                    ? 'Pilih maksimal 3 file.'
                    : files.some((file) => file.size > 5 * 1024 * 1024)
                      ? 'Ukuran setiap file maksimal 5 MB.'
                      : null;
                  setLampiranError(invalid);
                  if (!invalid) setLampiranFiles(files);
                  event.target.value = '';
                }}
                style={{ display: 'block', width: '100%', fontSize: '13px', color: colors.ink2 }}
              />
              {lampiranError && <p role="alert" style={{ color: colors.status.ditolak, fontSize: '12px', margin: '7px 0 0' }}>{lampiranError}</p>}
              {lampiranFiles.length > 0 && (
                <ul style={{ display: 'grid', gap: '5px', padding: 0, margin: '9px 0 0', listStyle: 'none' }}>
                  {lampiranFiles.map((file, index) => (
                    <li key={`${file.name}-${file.lastModified}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', color: colors.ink2, fontSize: '12px' }}>
                      <span style={{ overflowWrap: 'anywhere' }}>{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</span>
                      <button type="button" onClick={() => setLampiranFiles((current) => current.filter((_, i) => i !== index))} aria-label={`Hapus ${file.name}`} style={{ color: colors.status.ditolak, flex: 'none' }}>Hapus</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Anonim Checkbox */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'flex',
                gap: '11px',
                alignItems: 'flex-start',
                background: colors.card,
                border: `1px solid #C3CFDC`,
                borderRadius: '9px',
                padding: '13px 15px',
                cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  {...register('is_anonim')}
                  style={{
                    width: '17px',
                    height: '17px',
                    margin: '2px 0 0',
                    accentColor: colors.seal,
                    flex: 'none',
                  }}
                />
                <div>
                  <b style={{
                    display: 'block',
                    fontSize: '13px',
                    marginBottom: '3px',
                    color: colors.ink,
                  }}>
                    Kirim tanpa nama (anonim)
                  </b>
                  <p style={{
                    margin: 0,
                    fontSize: '12px',
                    color: colors.ink2,
                    lineHeight: 1.55,
                  }}>
                    Nama dan NIM tidak akan disimpan. Pengurus jurusan tidak bisa mengetahui siapa pengirimnya.
                  </p>
                </div>
              </label>
            </div>

            {/* Nama & NIM (conditionally shown) */}
            {!isAnonim && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label htmlFor="nama" style={{
                    fontSize: '12.5px',
                    fontWeight: 600,
                    display: 'block',
                    marginBottom: '7px',
                  }}>
                    Nama lengkap
                  </label>
                  <p style={{
                    fontSize: '11.5px',
                    color: colors.ink3,
                    margin: '-3px 0 8px',
                  }}>
                    Opsional. Isi kalau kamu bersedia dihubungi soal aspirasi ini.
                  </p>
                  <input
                    id="nama"
                    type="text"
                    placeholder="Nama kamu"
                    {...register('nama')}
                    style={{
                      width: '100%',
                      background: colors.card,
                      border: `1px solid #C3CFDC`,
                      borderRadius: '8px',
                      padding: '11px 13px',
                      fontSize: '14px',
                      color: colors.ink,
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label htmlFor="nim" style={{
                    fontSize: '12.5px',
                    fontWeight: 600,
                    display: 'block',
                    marginBottom: '7px',
                  }}>
                    NIM
                  </label>
                  <p style={{
                    fontSize: '11.5px',
                    color: colors.ink3,
                    margin: '-3px 0 8px',
                  }}>
                    Opsional. Hanya dipakai untuk mencocokkan status, tidak pernah tampil di halaman publik.
                  </p>
                  <input
                    id="nim"
                    type="text"
                    inputMode="numeric"
                    placeholder="2121007"
                    {...register('nim')}
                    style={{
                      width: '100%',
                      background: colors.card,
                      border: `1px solid #C3CFDC`,
                      borderRadius: '8px',
                      padding: '11px 13px',
                      fontSize: '14px',
                      color: colors.ink,
                    }}
                  />
                </div>
              </>
            )}

            {/* Submit Button */}
            <div style={{ marginTop: '18px' }}>
              <TurnstileCaptcha key={captchaVersion} onToken={setCaptchaToken} />
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '14px',
              flexWrap: 'wrap',
              marginTop: '22px',
              paddingTop: '18px',
              borderTop: `1px solid ${colors.rule}`,
            }}>
              <p style={{
                fontSize: '11.5px',
                color: colors.ink3,
                maxWidth: '34ch',
                lineHeight: 1.5,
                margin: 0,
              }}>
                Dengan mengirim, kamu menyetujui isi aspirasi dibaca pengurus jurusan dan bisa ditampilkan di publik setelah disetujui.
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '8px 13px',
                    borderRadius: '7px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    border: `1px solid #BCCBDD`,
                    background: colors.card,
                    color: colors.seal,
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading || !captchaToken}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 18px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    border: '1px solid transparent',
                    background: colors.seal,
                    color: '#fff',
                    cursor: loading || !captchaToken ? 'not-allowed' : 'pointer',
                    opacity: loading || !captchaToken ? 0.5 : 1,
                  }}
                >
                  {loading ? 'Mengirim...' : 'Kirim aspirasi'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
