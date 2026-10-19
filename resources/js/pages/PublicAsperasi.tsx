import { useState, useEffect } from 'react';
import { aspirasiAPI } from '../services/api';
import { Aspirasi } from '../types';
import { colors, fonts } from '../utils/designTokens';
import SiteFooter from '../components/SiteFooter';
import SiteHeader from '../components/SiteHeader';
import FeedbackPanel from '../components/FeedbackPanel';

export default function PublicAsperasi() {
  const [aspirasis, setAspirasis] = useState<Aspirasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadPublicAsperasi(1);
  }, []);

  const loadPublicAsperasi = async (page = currentPage) => {
    try {
      setLoading(true);
      setError(null);
      const response = await aspirasiAPI.getPublic(page);
      setAspirasis(response.data.data || []);
      setCurrentPage(response.data.current_page || 1);
      setLastPage(response.data.last_page || 1);
      setTotal(response.data.total || 0);
    } catch (err) {
      console.error('Error loading public aspirasi:', err);
      setError('Gagal memuat aspirasi publik');
    } finally {
      setLoading(false);
    }
  };

  const statusColors: Record<string, { bg: string; color: string }> = {
    'Diterima': { bg: 'rgba(47,109,168,.13)', color: colors.status.diterima },
    'Diproses': { bg: 'rgba(154,107,18,.14)', color: colors.status.diproses },
    'Selesai': { bg: 'rgba(31,107,74,.13)', color: colors.status.selesai },
    'Ditolak': { bg: 'rgba(150,56,44,.13)', color: colors.status.ditolak },
  };
  const categories = ['Semua', ...Array.from(new Set(aspirasis.map((item) => item.kategori?.nama).filter(Boolean) as string[]))];
  const visibleAspirasis = selectedCategory === 'Semua'
    ? aspirasis
    : aspirasis.filter((item) => item.kategori?.nama === selectedCategory);

  return (
    <div className="app-site public-page public-feed-page" style={{
      backgroundColor: colors.paper,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <SiteHeader active="public" />

      {/* Main Content */}
      <main id="main-content" className="public-main" tabIndex={-1} style={{
        flex: 1,
        padding: '26px 18px 34px',
      }}>
        <div className="public-container feed-container" style={{
          width: '100%',
          maxWidth: '760px',
          margin: '0 auto',
        }}>
          <div className="feed-intro-layout">
          <div className="feed-intro">
          <div className="public-eyebrow">
            Aspirasi publik
          </div>
          <h1 className="small-title" style={{
            fontFamily: fonts.display,
            fontWeight: 700,
            fontSize: '25px',
            lineHeight: 1.13,
            letterSpacing: '-.024em',
            margin: '0 0 13px',
            color: colors.ink,
          }}>
            Aspirasi yang Telah Ditanggapi
          </h1>
          <p style={{
            fontSize: '15.5px',
            color: colors.ink2,
            margin: '0 0 22px',
            maxWidth: '56ch',
            lineHeight: 1.55,
          }}>
            Lihat aspirasi dan balasan dari jurusan yang telah disetujui untuk ditampilkan
          </p>
          </div>
          {(loading || error || visibleAspirasis.length > 0) && <img className="public-page-illustration feed-illustration" src="/images/mahasiswa-diskusi-aspirasi.webp" alt="" width="1536" height="1024" fetchPriority="high" decoding="async" />}
          </div>

          <div className="category-filters" role="group" aria-label="Saring aspirasi menurut kategori">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                aria-pressed={selectedCategory === category}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
            <span className="filter-count">{visibleAspirasis.length} aspirasi</span>
          </div>

          {/* Error Message */}
          {error && <FeedbackPanel variant="error" title="Aspirasi publik tidak tersedia" message={error} actionLabel="Coba lagi" onAction={() => loadPublicAsperasi(currentPage)} actionDisabled={loading} />}

          {/* Loading State */}
          {loading && <FeedbackPanel variant="loading" title="Memuat aspirasi publik…" />}

          {/* Aspirasi List */}
          {!loading && !error && visibleAspirasis.length > 0 && (
            <div className="public-feed-grid" style={{
              display: 'grid',
              gap: '24px',
            }}>
              {visibleAspirasis.map((aspirasi) => (
                <div key={aspirasi.id} className="public-aspiration-card" style={{
                  background: colors.card,
                  border: `1px solid ${colors.rule}`,
                  borderRadius: '12px',
                  boxShadow: `0 1px 0 ${colors.rule}, 0 16px 36px -22px rgba(15,50,96,.4)`,
                  overflow: 'hidden',
                }}>
                  {/* Header */}
                  <div style={{
                    padding: '18px 24px 17px',
                    borderBottom: `1px solid ${colors.rule2}`,
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '10px',
                      marginBottom: '12px',
                      flexWrap: 'wrap',
                    }}>
                      <h3 style={{
                        fontFamily: fonts.display,
                        fontWeight: 650,
                        fontSize: '16.5px',
                        lineHeight: 1.3,
                        margin: 0,
                        letterSpacing: '-.012em',
                        color: colors.ink,
                        flex: 1,
                      }}>
                        {aspirasi.judul}
                      </h3>
                      <p style={{
                        fontSize: '10.5px',
                        color: colors.ink3,
                        margin: 0,
                        fontFamily: fonts.mono,
                        flex: 'none',
                      }}>
                        {new Date(aspirasi.created_at).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      flexWrap: 'wrap',
                    }}>
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
                  </div>

                  {/* Content */}
                  <div style={{
                    padding: '16px 24px 18px',
                  }}>
                    {/* Isi Aspirasi */}
                    <p style={{
                      fontSize: '13px',
                      color: colors.ink2,
                      margin: '0 0 16px',
                      lineHeight: 1.7,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}>
                      {aspirasi.isi}
                    </p>

                    {!!aspirasi.lampiran?.length && (
                      <section aria-label="Lampiran bukti aspirasi" style={{ margin: '0 0 16px', padding: '12px', border: `1px solid ${colors.rule}`, borderRadius: '9px', background: colors.paper }}>
                        <h4 style={{ margin: '0 0 8px', color: colors.ink, fontSize: '12px' }}>Lampiran aspirasi</h4>
                        <ul style={{ display: 'grid', gap: '7px', padding: 0, margin: 0, listStyle: 'none' }}>
                          {aspirasi.lampiran.map((file, index) => (
                            <li key={`${file.name}-${index}`}>
                              <a
                                href={`/api/aspirasi/public/${aspirasi.id}/lampiran/${index}`}
                                style={{ color: colors.seal, fontSize: '12px', fontWeight: 600, overflowWrap: 'anywhere' }}
                              >
                                Unduh bukti: {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
                              </a>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {/* Balasan */}
                    {aspirasi.balasans && aspirasi.balasans.length > 0 && (
                      <div style={{
                        borderTop: `1px solid ${colors.rule}`,
                        paddingTop: '16px',
                      }}>
                        <h4 style={{
                          fontFamily: fonts.display,
                          fontWeight: 650,
                          fontSize: '13px',
                          margin: '0 0 12px',
                          textTransform: 'uppercase',
                          letterSpacing: '.03em',
                          color: colors.ink,
                        }}>
                          Balasan dari Jurusan
                        </h4>
                        {aspirasi.balasans.map((balasan) => (
                          <div key={balasan.id} style={{
                            borderLeft: `2.5px solid ${colors.status.selesai}`,
                            background: '#F2F8F4',
                            padding: '11px 13px',
                            fontSize: '12.5px',
                            color: '#2C4A3A',
                            borderRadius: '0 7px 7px 0',
                            marginBottom: '12px',
                            lineHeight: 1.6,
                          }}>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              gap: '8px',
                              marginBottom: '8px',
                            }}>
                              <b style={{
                                fontFamily: fonts.mono,
                                fontSize: '9.5px',
                                letterSpacing: '.07em',
                                textTransform: 'uppercase',
                                color: colors.status.selesai,
                                fontWeight: 600,
                              }}>
                                {balasan.admin?.nama || 'Admin'}
                              </b>
                              <p style={{
                                fontSize: '9.5px',
                                color: colors.ink3,
                                margin: 0,
                              }}>
                                {new Date(balasan.created_at).toLocaleDateString('id-ID')}
                              </p>
                            </div>
                            <p style={{
                              margin: 0,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                            }}>
                              {balasan.isi}
                            </p>
                            {!!balasan.lampiran?.length && <ul aria-label="Lampiran bukti balasan" style={{ display: 'grid', gap: '7px', padding: 0, margin: '10px 0 0', listStyle: 'none' }}>
                              {balasan.lampiran.map((file, index) => (
                                <li key={`${file.name}-${index}`}>
                                  <a
                                    href={`/api/aspirasi/public/${aspirasi.id}/balasan/${balasan.id}/lampiran/${index}`}
                                    style={{ color: colors.seal, fontSize: '12px', fontWeight: 600, overflowWrap: 'anywhere' }}
                                  >
                                    Unduh bukti balasan: {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
                                  </a>
                                </li>
                              ))}
                            </ul>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && visibleAspirasis.length === 0 && (
            <section className="public-illustrated-empty public-feed-empty" role="status">
              <img src="/images/mahasiswa-diskusi-aspirasi.webp" alt="" width="1536" height="1024" loading="lazy" />
              <div><b>{selectedCategory === 'Semua' ? 'Belum ada aspirasi publik' : `Belum ada aspirasi kategori ${selectedCategory}`}</b><p>Aspirasi yang disetujui untuk tampil publik akan muncul di sini.</p></div>
            </section>
          )}
          {!loading && !error && lastPage > 1 && (
            <nav className="admin-pagination" aria-label="Halaman aspirasi publik">
              <span>{total} aspirasi · halaman {currentPage} dari {lastPage}</span>
              <div>
                <button type="button" onClick={() => loadPublicAsperasi(currentPage - 1)} disabled={currentPage <= 1 || loading}>Sebelumnya</button>
                <button type="button" onClick={() => loadPublicAsperasi(currentPage + 1)} disabled={currentPage >= lastPage || loading}>Berikutnya</button>
              </div>
            </nav>
          )}
        </div>
      </main>

      <SiteFooter />

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
