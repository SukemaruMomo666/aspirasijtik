import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { aspirasiAPI } from '../services/api';
import { Aspirasi } from '../types';
import { colors, fonts } from '../utils/designTokens';
import SiteFooter from '../components/SiteFooter';
import SiteHeader from '../components/SiteHeader';
import FeedbackPanel from '../components/FeedbackPanel';

export default function StatusCheck() {
  const [searchParams] = useSearchParams();
  const [ticketCode, setTicketCode] = useState(searchParams.get('ticket') || '');
  const [aspirasi, setAsperasi] = useState<Aspirasi | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const statusColors: Record<string, { bg: string; color: string }> = {
    'Diterima': { bg: 'rgba(47,109,168,.13)', color: colors.status.diterima },
    'Diproses': { bg: 'rgba(154,107,18,.14)', color: colors.status.diproses },
    'Selesai': { bg: 'rgba(31,107,74,.13)', color: colors.status.selesai },
    'Ditolak': { bg: 'rgba(150,56,44,.13)', color: colors.status.ditolak },
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketCode.trim()) {
      setSearched(true);
      setAsperasi(null);
      setError('Masukkan kode tiket');
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const response = await aspirasiAPI.getStatus(ticketCode);
      setAsperasi(response.data.aspirasi);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Kode tiket tidak ditemukan';
      setError(message);
      setAsperasi(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-site public-page public-status-page" style={{
      backgroundColor: colors.paper,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <SiteHeader active="status" />

      {/* Main Content */}
      <main id="main-content" className="public-main" tabIndex={-1} style={{
        flex: 1,
        padding: '26px 18px 34px',
      }}>
        <div className="public-container status-container" style={{
          width: '100%',
          maxWidth: '760px',
          margin: '0 auto',
        }}>
          <div className="status-intro-layout">
          <div className="status-intro">
          <div className="public-eyebrow">
            Cek status tiketmu
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
            Cek Status Aspirasi
          </h1>
          <p style={{
            fontSize: '15.5px',
            color: colors.ink2,
            margin: '0 0 22px',
            maxWidth: '56ch',
            lineHeight: 1.55,
          }}>
            Masukkan kode tiket Anda untuk melacak status aspirasi
          </p>
          </div>
          {(!searched || aspirasi) && <img className="public-page-illustration status-illustration" src="/images/mahasiswa-cek-tiket.webp" alt="" width="1024" height="1536" fetchPriority="high" decoding="async" />}
          </div>

          {/* Search Form */}
          <form className="status-search-form" onSubmit={handleSearch} style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
              alignItems: 'flex-end',
            }}>
              <div style={{ flex: 1, minWidth: '210px' }}>
                <input
                  type="text"
                  value={ticketCode}
                  onChange={(e) => setTicketCode(e.target.value.toUpperCase())}
                  placeholder="Contoh: JTIK-7Q4M-2XB9"
                  style={{
                    width: '100%',
                    background: colors.card,
                    border: `1px solid #C3CFDC`,
                    borderRadius: '8px',
                    padding: '11px 13px',
                    fontSize: '15px',
                    fontFamily: fonts.mono,
                    letterSpacing: '.12em',
                    textTransform: 'uppercase',
                    color: colors.ink,
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 18px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  border: '1px solid transparent',
                  background: colors.seal,
                  color: '#fff',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                }}
              >
                {loading ? 'Mencari...' : 'Cari'}
              </button>
            </div>
          </form>

          {/* Error Message */}
          {error && searched && (
            <section className="public-illustrated-empty public-status-error" role="alert">
              <img src="/images/mahasiswa-cek-tiket.webp" alt="" width="1024" height="1536" loading="lazy" />
              <div><b>Pencarian tiket gagal</b><p>{error}</p></div>
            </section>
          )}
          {loading && <FeedbackPanel variant="loading" title="Mencari tiket…" />}

          {/* Result */}
          {aspirasi && searched && !loading && (
            <div className="ticket-result-card status-ticket-slip" style={{
              background: colors.card,
              border: `1px solid ${colors.rule}`,
              borderRadius: '12px',
              boxShadow: `0 1px 0 ${colors.rule}, 0 16px 36px -22px rgba(15,50,96,.4)`,
            }}>
              {/* Status Badge */}
              <div className="status-ticket-head" style={{
                padding: '18px 24px 17px',
                borderBottom: `1px dashed ${colors.rule}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap',
              }}>
                <div>
                  <span className="status-ticket-kicker">TIKET ASPIRASI · JTIK</span>
                  <p style={{
                    fontSize: '12.5px',
                    color: colors.ink3,
                    margin: '0 0 8px',
                    fontWeight: 500,
                  }}>
                    Status Aspirasi
                  </p>
                  <span style={{
                    fontFamily: fonts.mono,
                    fontSize: '10px',
                    fontWeight: 600,
                    letterSpacing: '.06em',
                    textTransform: 'uppercase',
                    padding: '4px 8px',
                    borderRadius: '5px',
                    display: 'inline-block',
                    background: statusColors[aspirasi.status]?.bg || '#EDF1F6',
                    color: statusColors[aspirasi.status]?.color || colors.ink2,
                  }}>
                    {aspirasi.status}
                  </span>
                </div>
                <div className="status-ticket-stamp" aria-hidden="true"><b>JTIK</b><small>TRACKING</small></div>
              </div>

              {/* Content */}
              <div className="status-ticket-content" style={{ padding: '16px 24px 18px' }}>
                {/* Judul */}
                <div style={{ marginBottom: '16px' }}>
                  <p style={{
                    fontFamily: fonts.display,
                    fontWeight: 650,
                    fontSize: '16.5px',
                    lineHeight: 1.3,
                    margin: '0 0 8px',
                    letterSpacing: '-.012em',
                    color: colors.ink,
                  }}>
                    {aspirasi.is_privat ? 'Aspirasi ditangani secara privat' : aspirasi.judul}
                  </p>
                  <p style={{
                    fontSize: '12.5px',
                    color: colors.ink3,
                    margin: 0,
                  }}>
                    Dikirim {new Date(aspirasi.created_at).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })} · {new Date(aspirasi.created_at).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                {/* Status Rail */}
                <ol aria-label={`Tahapan status aspirasi: ${aspirasi.status}`} style={{
                  listStyle: 'none',
                  display: 'flex',
                  margin: '18px 0 0',
                  padding: 0,
                }}>
                  {(aspirasi.status === 'Ditolak' ? ['Diterima', 'Ditolak'] : ['Diterima', 'Diproses', 'Selesai']).map((step, idx, steps) => {
                    const statusOrder = ['Diterima', 'Diproses', 'Selesai'];
                    const currentIdx = aspirasi.status === 'Ditolak' ? 1 : statusOrder.indexOf(aspirasi.status);
                    const isDone = idx < currentIdx;
                    const isNow = idx === currentIdx;
                    const stepColor = isDone
                      ? colors.status.diterima
                      : aspirasi.status === 'Ditolak'
                        ? colors.status.ditolak
                        : aspirasi.status === 'Diterima'
                          ? colors.status.diterima
                        : idx === 2
                          ? colors.status.selesai
                          : colors.status.diproses;

                    return (
                      <li key={idx} style={{
                        flex: 1,
                        position: 'relative',
                        textAlign: 'center',
                        paddingTop: '21px',
                        fontSize: '10.5px',
                        color: isNow ? stepColor : isDone ? colors.status.diterima : colors.ink3,
                        fontWeight: isNow || isDone ? 600 : 500,
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: '4px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '11px',
                          height: '11px',
                          borderRadius: '50%',
                          background: isDone ? colors.status.diterima : (isNow ? stepColor : colors.card),
                          border: `2px solid ${isDone ? colors.status.diterima : (isNow ? stepColor : '#C0CDDA')}`,
                          zIndex: 2,
                          boxShadow: isNow ? `0 0 0 4px ${aspirasi.status === 'Ditolak' ? 'rgba(150,56,44,.15)' : aspirasi.status === 'Diterima' ? 'rgba(47,109,168,.15)' : idx === 2 ? 'rgba(31,107,74,.16)' : 'rgba(154,107,18,.17)'}` : 'none',
                        }} />
                        <div style={{
                          position: 'absolute',
                          top: '9px',
                          left: '50%',
                          width: '100%',
                          height: '2px',
                          background: isDone ? colors.status.diterima : '#DDE4EC',
                          display: idx === steps.length - 1 ? 'none' : 'block',
                        }} />
                        <span style={{
                          color: isNow ? stepColor : isDone ? colors.status.diterima : colors.ink3,
                          fontWeight: isNow || isDone ? 600 : 500,
                        }}>
                          {step}
                        </span>
                      </li>
                    );
                  })}
                </ol>

                {/* Kategori */}
                {!aspirasi.is_privat && <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                  <span style={{
                    fontFamily: fonts.mono,
                    fontSize: '10px',
                    fontWeight: 600,
                    color: colors.ink2,
                    background: '#EDF1F6',
                    border: `1px solid ${colors.rule}`,
                    padding: '3px 9px',
                    borderRadius: '5px',
                    whiteSpace: 'nowrap',
                    display: 'inline-block',
                  }}>
                    {aspirasi.kategori?.nama}
                  </span>
                </div>}

                {/* Isi */}
                {!aspirasi.is_privat && <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                  <p style={{
                    fontSize: '13px',
                    color: colors.ink2,
                    margin: 0,
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                    {aspirasi.isi}
                  </p>
                </div>}

                {!aspirasi.is_privat && aspirasi.is_anonim && (
                  <div style={{
                    background: colors.sealSoft,
                    border: `1px solid #C9D9EA`,
                    borderRadius: '12px',
                    padding: '13px 15px',
                    marginTop: '16px',
                  }}>
                    <p style={{
                      fontSize: '12.5px',
                      color: colors.seal,
                      margin: 0,
                      lineHeight: 1.55,
                    }}>
                      ✓ Aspirasi ini dikirim secara anonim
                    </p>
                  </div>
                )}

                {/* Balasan */}
                {aspirasi.balasans && aspirasi.balasans.length > 0 && (
                  <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: `1px solid ${colors.rule}` }}>
                    <h3 style={{
                      fontFamily: fonts.display,
                      fontWeight: 650,
                      fontSize: '15px',
                      letterSpacing: '-.01em',
                      margin: '0 0 14px',
                      color: colors.ink,
                    }}>
                      Balasan ({aspirasi.balasans.length})
                    </h3>
                    {aspirasi.balasans.map((balasan) => (
                      <div key={balasan.id} style={{
                        borderLeft: `2.5px solid ${colors.status.selesai}`,
                        background: '#F2F8F4',
                        padding: '11px 13px',
                        fontSize: '12.5px',
                        color: '#2C4A3A',
                        borderRadius: '0 7px 7px 0',
                        marginBottom: '14px',
                        lineHeight: 1.6,
                      }}>
                        <b style={{
                          display: 'block',
                          fontFamily: fonts.mono,
                          fontSize: '9.5px',
                          letterSpacing: '.07em',
                          textTransform: 'uppercase',
                          color: colors.status.selesai,
                          marginBottom: '5px',
                          fontWeight: 600,
                        }}>
                          {balasan.admin?.nama || 'Admin'} · {new Date(balasan.created_at).toLocaleDateString('id-ID')}
                        </b>
                        <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {balasan.isi}
                        </p>
                        {!!balasan.lampiran?.length && <ul aria-label="Lampiran bukti dari pengurus" style={{ display: 'grid', gap: '6px', padding: 0, margin: '10px 0 0', listStyle: 'none' }}>
                          {balasan.lampiran.map((file, index) => (
                            <li key={`${file.name}-${index}`}>
                              <a
                                href={`/api/aspirasi/status/${encodeURIComponent(aspirasi.kode_tiket)}/balasan/${balasan.id}/lampiran/${index}`}
                                style={{ color: colors.seal, fontWeight: 600, overflowWrap: 'anywhere' }}
                              >
                                Unduh bukti: {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
                              </a>
                            </li>
                          ))}
                        </ul>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="status-ticket-perforation" aria-hidden="true" />
              <footer className="status-ticket-stub">
                <div><small>KODE TIKET · SIMPAN UNTUK CEK STATUS</small><strong>{aspirasi.kode_tiket}</strong></div>
                <span className="status-ticket-stub-mark" aria-hidden="true">JTIK<br /><small>ASPIRASI</small></span>
              </footer>
            </div>
          )}

          {/* Empty State */}
          {searched && !aspirasi && !error && !loading && (
            <section className="public-illustrated-empty" role="status">
              <img src="/images/mahasiswa-cek-tiket.webp" alt="" width="1024" height="1536" loading="lazy" />
              <div><b>Tiket tidak ditemukan</b><p>Periksa kembali kode tiket, lalu coba cari lagi.</p></div>
            </section>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
