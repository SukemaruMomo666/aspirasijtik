import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { adminAPI } from '../services/api';
import { Aspirasi, Balasan, Kategori, Statistik, StatusType } from '../types';
import { kategoriAPI } from '../services/api';
import { colors, fonts } from '../utils/designTokens';
import FeedbackPanel from '../components/FeedbackPanel';
import AdminUserManagement from '../components/AdminUserManagement';

type AdminDashboardProps = {
  initialSection?: 'summary' | 'queue' | 'all' | 'users';
};

export default function AdminDashboard({ initialSection = 'summary' }: AdminDashboardProps = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, isAuthenticated, logout, setAdmin } = useAuth();

  const [aspirasis, setAspirasis] = useState<Aspirasi[]>([]);
  const [statistik, setStatistik] = useState<Statistik | null>(null);
  const [kategoris, setKategoris] = useState<Kategori[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterKategori, setFilterKategori] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterFlagged, setFilterFlagged] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [ageOrder, setAgeOrder] = useState<'lama' | 'baru'>('lama');
  const [appliedFilters, setAppliedFilters] = useState({
    status: '', kategori: '', startDate: '', endDate: '', flagged: false, search: '', ageOrder: 'lama' as 'lama' | 'baru',
  });
  const searchFilterTimer = useRef<number | null>(null);
  const latestLoadRequest = useRef(0);
  const [activeAdminSection, setActiveAdminSection] = useState<'summary' | 'queue' | 'all' | 'users'>(initialSection);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'users' || location.pathname === '/admin/users') {
      setActiveAdminSection('users');
    } else if (tab === 'queue') {
      setActiveAdminSection('queue');
    } else if (tab === 'all') {
      setActiveAdminSection('all');
    } else if (location.pathname === '/admin/dashboard' && !tab) {
      if (initialSection !== 'users') {
        setActiveAdminSection('summary');
      }
    }
  }, [location.search, location.pathname, initialSection]);

  const handleSectionSwitch = (section: 'summary' | 'queue' | 'all' | 'users') => {
    setActiveAdminSection(section);
    if (section === 'users') {
      navigate('/admin/dashboard?tab=users');
    } else if (section === 'summary') {
      navigate('/admin/dashboard');
    }
  };
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalAspirasi, setTotalAspirasi] = useState(0);
  const [selectedAspirasi, setSelectedAspirasi] = useState<Aspirasi | null>(null);
  const [statusDraft, setStatusDraft] = useState<StatusType>('Diterima');
  const [replyText, setReplyText] = useState('');
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [replyFileError, setReplyFileError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // API applies search, date, flag, category, status, and sort filters before pagination.
  // Keep rows and the paginator in sync; do not filter/sort just the current page locally.
  const displayedAspirasis = aspirasis;
  const maxMonthlyTotal = Math.max(1, ...(statistik?.per_bulan || []).map((month) => month.total));

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
      return;
    }
    loadData();
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!selectedAspirasi) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedAspirasi(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedAspirasi]);

  const loadData = async (
    status = filterStatus,
    kategori = filterKategori,
    page = 1,
    sortOrder: 'asc' | 'desc' = ageOrder === 'lama' ? 'asc' : 'desc',
    query = searchQuery,
    startDate = filterStartDate,
    endDate = filterEndDate,
    flagged = filterFlagged,
  ) => {
    const requestId = ++latestLoadRequest.current;
    try {
      setLoading(true);
      setError(null);
      const [aspirasiRes, statistikRes, kategoriRes, profileRes] = await Promise.all([
        adminAPI.getAspirasi({
          status: status || undefined,
          kategori_id: kategori || undefined,
          page,
          per_page: 10,
          sort_order: sortOrder,
          search: query.trim() || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          has_badwords: flagged ? 1 : undefined,
        }),
        adminAPI.getStatistik(),
        kategoriAPI.getAll(),
        adminAPI.getProfile(),
      ]);

      if (requestId !== latestLoadRequest.current) return;
      setAspirasis(aspirasiRes.data.data || []);
      setCurrentPage(aspirasiRes.data.current_page || 1);
      setLastPage(aspirasiRes.data.last_page || 1);
      setTotalAspirasi(aspirasiRes.data.total || 0);
      setStatistik(statistikRes.data);
      setKategoris(kategoriRes.data);
      setAdmin(profileRes.data);
    } catch (err) {
      console.error('Error loading data:', err);
      if (requestId !== latestLoadRequest.current) return;
      if ((err as any).response?.status === 401) {
        await logout();
        navigate('/admin/login', { replace: true });
        return;
      }
      setError('Gagal memuat data');
    } finally {
      if (requestId === latestLoadRequest.current) setLoading(false);
    }
  };

  const openAspirasiList = (section: 'queue' | 'all') => {
    if (searchFilterTimer.current !== null) window.clearTimeout(searchFilterTimer.current);
    const nextFilters = { status: section === 'queue' ? 'Antrean' : '', kategori: '', startDate: '', endDate: '', flagged: false, search: '', ageOrder };
    setActiveAdminSection(section);
    setFilterStatus('');
    setFilterKategori('');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterFlagged(false);
    setSearchQuery('');
    setCurrentPage(1);
    setAppliedFilters(nextFilters);
    loadData(nextFilters.status, '', 1, ageOrder === 'lama' ? 'asc' : 'desc', '', '', '', false);
  };

  const applyFilters = (overrides: Partial<typeof appliedFilters> = {}) => {
    if (searchFilterTimer.current !== null) window.clearTimeout(searchFilterTimer.current);
    const nextFilters = {
      status: filterStatus,
      kategori: filterKategori,
      startDate: filterStartDate,
      endDate: filterEndDate,
      flagged: filterFlagged,
      search: searchQuery.trim(),
      ageOrder,
      ...overrides,
    };
    setAppliedFilters(nextFilters);
    setActiveAdminSection('all');
    setCurrentPage(1);
    loadData(nextFilters.status, nextFilters.kategori, 1, nextFilters.ageOrder === 'lama' ? 'asc' : 'desc', nextFilters.search, nextFilters.startDate, nextFilters.endDate, nextFilters.flagged);
  };

  const resetFilters = () => {
    if (searchFilterTimer.current !== null) window.clearTimeout(searchFilterTimer.current);
    const nextFilters = { status: '', kategori: '', startDate: '', endDate: '', flagged: false, search: '', ageOrder: 'lama' as const };
    setActiveAdminSection('all');
    setFilterStatus('');
    setFilterKategori('');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterFlagged(false);
    setSearchQuery('');
    setAgeOrder('lama');
    setCurrentPage(1);
    setAppliedFilters(nextFilters);
    loadData(nextFilters.status, nextFilters.kategori, 1, 'asc', nextFilters.search, nextFilters.startDate, nextFilters.endDate, nextFilters.flagged);
  };

  const loadAppliedPage = (page: number) => {
    const filters = appliedFilters;
    loadData(filters.status, filters.kategori, page, filters.ageOrder === 'lama' ? 'asc' : 'desc', filters.search, filters.startDate, filters.endDate, filters.flagged);
  };

  const openDetail = (aspirasi: Aspirasi) => {
    setSelectedAspirasi(aspirasi);
    setStatusDraft(aspirasi.status);
    setReplyText('');
    setReplyFiles([]);
    setReplyFileError(null);
    setActionError(null);
    setActionNotice(null);
  };

  const openDetailById = async (id: number) => {
    setDetailLoading(true);
    setError(null);
    try {
      const response = await adminAPI.getAspirasiById(id);
      openDetail(response.data as Aspirasi);
    } catch (err) {
      console.error('Gagal memuat detail aspirasi:', err);
      setError('Detail aspirasi gagal dimuat. Silakan coba lagi.');
    } finally {
      setDetailLoading(false);
    }
  };

  const downloadAttachment = async (index: number, filename: string) => {
    if (!selectedAspirasi) return;
    try {
      const response = await adminAPI.downloadAttachment(selectedAspirasi.id, index);
      const url = URL.createObjectURL(new Blob([response.data]));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Gagal mengunduh lampiran:', err);
      setActionError('Lampiran gagal diunduh. Silakan coba lagi.');
    }
  };

  const downloadReplyFile = async (replyId: number, index: number, filename: string) => {
    if (!selectedAspirasi) return;
    try {
      const response = await adminAPI.downloadReplyAttachment(selectedAspirasi.id, replyId, index);
      const url = URL.createObjectURL(new Blob([response.data]));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Gagal mengunduh bukti balasan:', err);
      setActionError('Lampiran balasan gagal diunduh. Silakan coba lagi.');
    }
  };

  const refreshSelectedDetail = async (id: number) => {
    try {
      const response = await adminAPI.getAspirasiById(id);
      const updated = response.data as Aspirasi;
      setSelectedAspirasi(updated);
      setAspirasis((current) => current.map((item) => item.id === id ? { ...item, ...updated } : item));
    } catch (error) {
      console.error('Gagal memuat riwayat perubahan:', error);
    }
  };

  const applyAspirasiChanges = (changes: Partial<Aspirasi>) => {
    setSelectedAspirasi((current) => current ? { ...current, ...changes } : current);
    setAspirasis((current) => current.map((item) => item.id === selectedAspirasi?.id
      ? { ...item, ...changes }
      : item));
  };

  const showActionError = (error: any) => {
    setActionError(error.response?.data?.message || 'Aksi gagal. Silakan coba lagi.');
    setActionNotice(null);
  };

  const handleUpdateStatus = async () => {
    if (!selectedAspirasi) return;

    setActionLoading(true);
    setActionError(null);
    setActionNotice(null);
    try {
      await adminAPI.updateStatus(selectedAspirasi.id, statusDraft);
      applyAspirasiChanges({ status: statusDraft });
      setActionNotice('Status aspirasi berhasil diperbarui.');
      await refreshSelectedDetail(selectedAspirasi.id);
      adminAPI.getStatistik()
        .then((response) => setStatistik(response.data))
        .catch((error) => console.error('Gagal memuat ulang statistik:', error));
    } catch (error) {
      showActionError(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePublic = async () => {
    if (!selectedAspirasi) return;

    setActionLoading(true);
    setActionError(null);
    setActionNotice(null);
    try {
      const isPublic = !selectedAspirasi.is_publik;
      await adminAPI.togglePublic(selectedAspirasi.id, isPublic);
      applyAspirasiChanges({ is_publik: isPublic });
      await refreshSelectedDetail(selectedAspirasi.id);
      setActionNotice(isPublic
        ? 'Aspirasi ditampilkan di halaman publik.'
        : 'Aspirasi disembunyikan dari halaman publik.');
    } catch (error) {
      showActionError(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePrivate = async () => {
    if (!selectedAspirasi) return;
    setActionLoading(true);
    setActionError(null);
    setActionNotice(null);
    try {
      const isPrivate = !selectedAspirasi.is_privat;
      const response = await adminAPI.togglePrivate(selectedAspirasi.id, isPrivate);
      applyAspirasiChanges({ is_privat: isPrivate, is_publik: response.data.aspirasi.is_publik });
      await refreshSelectedDetail(selectedAspirasi.id);
      setActionNotice(isPrivate
        ? 'Aspirasi ditandai privat dan dikeluarkan dari halaman publik.'
        : 'Tanda privat dihapus. Aspirasi tetap tersembunyi sampai disetujui untuk publik.');
    } catch (error) {
      showActionError(error);
    } finally {
      setActionLoading(false);
    }
  };

  const exportAspirasi = async () => {
    try {
      const response = await adminAPI.exportAspirasi({
        kategori_id: appliedFilters.kategori || undefined,
        status: appliedFilters.status || undefined,
        start_date: appliedFilters.startDate || undefined,
        end_date: appliedFilters.endDate || undefined,
        has_badwords: appliedFilters.flagged ? 1 : undefined,
        search: appliedFilters.search || undefined,
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'rekap-aspirasi.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setError((error as any).response?.data?.message || 'Ekspor CSV gagal. Silakan coba lagi.');
    }
  };

  const handleReply = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedAspirasi || !replyText.trim()) return;

    setActionLoading(true);
    setActionError(null);
    setActionNotice(null);
    try {
      const payload = new window.FormData();
      payload.append('isi', replyText.trim());
      replyFiles.forEach((file) => payload.append('lampiran[]', file));
      const response = await adminAPI.reply(selectedAspirasi.id, payload);
      const balasan = response.data.balasan as Balasan;
      const balasans = [...(selectedAspirasi.balasans || []), balasan];
      applyAspirasiChanges({ balasans });
      setReplyText('');
      setReplyFiles([]);
      setReplyFileError(null);
      setActionNotice('Balasan berhasil dikirim.');
      await refreshSelectedDetail(selectedAspirasi.id);
    } catch (error) {
      showActionError(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={`app-site admin-site${selectedAspirasi ? ' admin-detail-open' : ''}`} style={{
      backgroundColor: colors.paper,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <a className="skip-link" href="#main-content">Lewati ke konten</a>
      {/* Main Content */}
      <main id="main-content" tabIndex={-1} style={{
        flex: 1,
        padding: '18px 18px 24px',
        minWidth: 0,
        overflow: 'auto',
      }}>
        <aside className="admin-sidebar" aria-label="Navigasi panel admin">
          <div className="admin-sidebar-brand"><b>Aspirasi JTIK</b><small>Panel pengelolaan</small></div>
          <nav aria-label="Menu admin">
            <button type="button" aria-current={activeAdminSection === 'summary' ? 'page' : undefined} onClick={() => handleSectionSwitch('summary')}>Dashboard</button>
            <button type="button" aria-current={activeAdminSection === 'queue' ? 'page' : undefined} onClick={() => openAspirasiList('queue')}>Antrean moderasi <span className="admin-sidebar-count">{Number(statistik?.by_status.Diterima || 0) + Number(statistik?.by_status.Diproses || 0)}</span></button>
            <button type="button" aria-current={activeAdminSection === 'all' ? 'page' : undefined} onClick={() => openAspirasiList('all')}>Semua aspirasi</button>
            <button
              type="button"
              aria-current={activeAdminSection === 'users' ? 'page' : undefined}
              onClick={() => handleSectionSwitch('users')}
            >
              Kelola pengurus
            </button>
            <Link to="/publik">Lihat halaman publik</Link>
          </nav>
          <div className="admin-sidebar-account">
            <b>{admin?.nama || 'Pengurus'}</b>
            <span>Administrator</span>
            <button type="button" onClick={handleLogout}>Keluar</button>
          </div>
        </aside>
        <div className="admin-main-content" style={{
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
        }}>
          {/* Page Header */}
          <div className="admin-page-header" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: '14px',
            flexWrap: 'wrap',
            marginBottom: '15px',
          }}>
            <div>
              <h3 style={{
                fontFamily: fonts.display,
                fontWeight: 700,
                fontSize: '20px',
                letterSpacing: '-.018em',
                margin: 0,
                color: colors.ink,
              }}>
                {activeAdminSection === 'summary'
                  ? 'Dashboard'
                  : activeAdminSection === 'queue'
                  ? 'Antrean moderasi'
                  : activeAdminSection === 'users'
                  ? 'Kelola Pengurus & Akun'
                  : 'Semua aspirasi'}
              </h3>
              <p style={{
                margin: '3px 0 0',
                fontSize: '11.5px',
                color: colors.ink3,
                fontFamily: fonts.mono,
              }}>
                {activeAdminSection === 'summary'
                  ? 'Ringkasan aspirasi dan aktivitas moderasi'
                  : activeAdminSection === 'users'
                  ? 'Manajemen akun pengurus dan pimpinan jurusan'
                  : `${displayedAspirasis.length} aspirasi ditampilkan`}
              </p>
            </div>
            {activeAdminSection === 'summary' && (
              <button type="button" className="admin-primary-button" onClick={() => openAspirasiList('queue')}>
                Tinjau antrean
              </button>
            )}
          </div>

          {activeAdminSection === 'summary' && (
            <section className="admin-work-guide is-admin" aria-labelledby="admin-work-guide-title">
              <div className="admin-work-guide-heading">
                <span className="admin-work-guide-icon" aria-hidden="true">i</span>
                <div>
                  <p>PANDUAN ADMINISTRATOR</p>
                  <h4 id="admin-work-guide-title">Kelola aspirasi dengan aman</h4>
                </div>
              </div>
              <ol>
                <li><b>Buka antrean moderasi</b><span>Periksa tiket yang masuk, mulai dari yang paling lama menunggu.</span></li>
                <li><b>Tinjau dan tindak lanjuti</b><span>Baca detail, perbarui status, lalu kirim balasan yang jelas dan sopan.</span></li>
                <li><b>Atur visibilitas bila perlu</b><span>Gunakan mode privat untuk topik sensitif atau tampilkan di publik setelah ditinjau.</span></li>
              </ol>
              <button type="button" onClick={() => openAspirasiList('queue')}>Buka antrean <span aria-hidden="true">→</span></button>
            </section>
          )}

          {activeAdminSection !== 'users' && (
            <>
              {error && (
                <FeedbackPanel variant="error" title="Data belum berhasil dimuat" message={error} actionLabel="Coba lagi" onAction={() => loadAppliedPage(currentPage)} actionDisabled={loading} />
              )}
              {loading && (
                <FeedbackPanel variant="loading" title="Memuat data aspirasi…" />
              )}
              {detailLoading && <FeedbackPanel variant="loading" title="Memuat detail tiket…" />}
            </>
          )}

          {/* Statistics */}
          {activeAdminSection === 'summary' && statistik && (
            <div id="admin-statistics" className="admin-statistics" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))',
              gap: '1px',
              background: colors.rule,
              border: `1px solid ${colors.rule}`,
              borderRadius: '11px',
              overflow: 'hidden',
              marginBottom: '15px',
            }}>
              <div style={{
                background: colors.card,
                padding: '12px 14px',
              }}>
                <p style={{
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '.06em',
                  color: colors.ink3,
                  fontWeight: 600,
                  margin: 0,
                }}>
                  Total Aspirasi
                </p>
                <p style={{
                  fontFamily: fonts.display,
                  fontWeight: 700,
                  fontSize: '25px',
                  letterSpacing: '-.02em',
                  margin: '4px 0 2px',
                  lineHeight: 1,
                  color: colors.seal,
                }}>
                  {statistik.total}
                </p>
              </div>
              <div style={{
                background: colors.card,
                padding: '12px 14px',
              }}>
                <p style={{
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '.06em',
                  color: colors.ink3,
                  fontWeight: 600,
                  margin: 0,
                }}>
                  Selesai
                </p>
                <p style={{
                  fontFamily: fonts.display,
                  fontWeight: 700,
                  fontSize: '25px',
                  letterSpacing: '-.02em',
                  margin: '4px 0 2px',
                  lineHeight: 1,
                  color: colors.status.selesai,
                }}>
                  {statistik.by_status.Selesai || 0}
                </p>
              </div>
              <div style={{
                background: colors.card,
                padding: '12px 14px',
              }}>
                <p style={{
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '.06em',
                  color: colors.ink3,
                  fontWeight: 600,
                  margin: 0,
                }}>
                  Diproses
                </p>
                <p style={{
                  fontFamily: fonts.display,
                  fontWeight: 700,
                  fontSize: '25px',
                  letterSpacing: '-.02em',
                  margin: '4px 0 2px',
                  lineHeight: 1,
                  color: colors.status.diproses,
                }}>
                  {statistik.by_status.Diproses || 0}
                </p>
              </div>
              <div style={{
                background: colors.card,
                padding: '12px 14px',
              }}>
                <p style={{
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '.06em',
                  color: colors.ink3,
                  fontWeight: 600,
                  margin: 0,
                }}>
                  Ditolak
                </p>
                <p style={{
                  fontFamily: fonts.display,
                  fontWeight: 700,
                  fontSize: '25px',
                  letterSpacing: '-.02em',
                  margin: '4px 0 2px',
                  lineHeight: 1,
                  color: colors.status.ditolak,
                }}>
                  {statistik.by_status.Ditolak || 0}
                </p>
              </div>
            </div>
          )}

          {activeAdminSection === 'summary' && statistik && (
            <div className="admin-charts" aria-label="Statistik aspirasi">
              <section className="admin-chart-panel">
                <h4>Aspirasi per kategori</h4>
                <p className="admin-chart-hint">Jumlah laporan yang masuk pada setiap kategori</p>
                {statistik.by_kategori.length ? (
                  <div className="admin-category-bars">
                    {statistik.by_kategori.map((item) => (
                      <div className="admin-category-row" key={item.kategori}>
                        <span>{item.kategori}</span>
                        <div className="admin-bar-track" aria-label={`${item.jumlah} aspirasi`}>
                          <i style={{ width: `${Math.max(2, (item.jumlah / Math.max(1, ...statistik.by_kategori.map((entry) => entry.jumlah))) * 100)}%` }} />
                        </div>
                        <b>{item.jumlah}</b>
                      </div>
                    ))}
                  </div>
                ) : <p className="admin-chart-empty">Belum ada aspirasi untuk ditampilkan.</p>}
              </section>
              <section className="admin-chart-panel">
                <h4>Status aspirasi</h4>
                <p className="admin-chart-hint">Sebaran status dari seluruh laporan</p>
                <div className="admin-status-bars">
                  {(['Diterima', 'Diproses', 'Selesai', 'Ditolak'] as StatusType[]).map((status) => {
                    const total = statistik.by_status[status] || 0;
                    const percent = statistik.total ? (total / statistik.total) * 100 : 0;
                    return <div className="admin-status-row" key={status}>
                      <span><i className={`status-dot status-${status.toLowerCase()}`} />{status}</span>
                      <div className="admin-bar-track"><i className={`status-fill status-${status.toLowerCase()}`} style={{ width: `${percent}%` }} /></div>
                      <b>{total}</b>
                    </div>;
                  })}
                </div>
              </section>
            </div>
          )}

          {activeAdminSection === 'summary' && statistik && (
            <section className="admin-chart-panel admin-monthly-chart">
              <div className="admin-panel-heading">
                <div><h4>Tren aspirasi per bulan</h4><p className="admin-chart-hint">Bulan aspirasi masuk dengan status saat ini</p></div>
              </div>
              {statistik.per_bulan.some((month) => month.total > 0) ? (
                <div className="admin-month-bars" role="img" aria-label="Grafik aspirasi per bulan menurut status">
                  {statistik.per_bulan.map((month) => (
                    <div className="admin-month-column" key={month.bulan} title={`${month.bulan}: ${month.total} aspirasi`}>
                      <b>{month.total || ''}</b>
                      <div className="admin-month-bar" style={{ height: `${Math.max(month.total ? 8 : 0, (month.total / maxMonthlyTotal) * 100)}%` }}>
                        {(['Diterima', 'Diproses', 'Selesai', 'Ditolak'] as StatusType[]).map((status) => (
                          month.by_status[status] > 0 && <i key={status} className={`status-${status.toLowerCase()}`} style={{ flexGrow: month.by_status[status] }} />
                        ))}
                      </div>
                      <span>{month.bulan.split(' ')[0]}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="admin-chart-empty">Belum ada data dalam 12 bulan terakhir.</p>}
              <div className="admin-chart-legend">
                {(['Diterima', 'Diproses', 'Selesai', 'Ditolak'] as StatusType[]).map((status) => (
                  <span key={status}><i className={`status-${status.toLowerCase()}`} />{status}</span>
                ))}
              </div>
            </section>
          )}

          {activeAdminSection === 'summary' && statistik && (
            <section className="admin-oldest-panel">
              <div className="admin-panel-heading">
                <div><h4>Tiket paling lama menunggu</h4><p className="admin-chart-hint">Urut dari tanggal masuk paling awal.</p></div>
                <button type="button" onClick={() => openAspirasiList('queue')}>Lihat antrean</button>
              </div>
              {statistik.oldest_pending.length ? (
                <div className="admin-oldest-list">
                  {statistik.oldest_pending.map((ticket) => (
                    <button type="button" className="admin-oldest-ticket" key={ticket.id} onClick={() => openDetailById(ticket.id)}>
                      <span className="admin-ticket-meta">{ticket.kode_tiket} · {ticket.kategori} · {new Date(ticket.created_at).toLocaleDateString('id-ID')}</span>
                      <b>{ticket.judul}</b>
                      <span className={`admin-ticket-status status-${ticket.status.toLowerCase()}`}>{ticket.status}</span>
                    </button>
                  ))}
                </div>
              ) : <p className="admin-chart-empty">Tidak ada tiket yang menunggu moderasi.</p>}
            </section>
          )}

          {activeAdminSection === 'users' && (
            <AdminUserManagement
              currentUser={admin}
              onUserSelfUpdated={(updated) => setAdmin(updated)}
            />
          )}

          {(activeAdminSection === 'queue' || activeAdminSection === 'all') && <>
          {/* Filters */}
          <div id="admin-filters" style={{
            background: colors.card,
            border: `1px solid ${colors.rule}`,
            borderRadius: '11px',
            padding: '13px 15px',
            marginBottom: '15px',
          }}>
            <h4 style={{
              fontFamily: fonts.display,
              fontWeight: 650,
              fontSize: '12px',
              margin: '0 0 3px',
              textTransform: 'uppercase',
              letterSpacing: '.03em',
              color: colors.ink,
            }}>
              Filter
            </h4>
            <form className="admin-filter-controls" onSubmit={(event) => { event.preventDefault(); applyFilters(); }} style={{
              display: 'flex',
              gap: '7px',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}>
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); applyFilters({ status: e.target.value }); }}
                style={{
                  width: 'auto',
                  minWidth: '126px',
                  fontSize: '12px',
                  padding: '8px 30px 8px 11px',
                  border: `1px solid #C3CFDC`,
                  borderRadius: '8px',
                  background: colors.card,
                  color: colors.ink,
                  fontFamily: fonts.sans,
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='7'%3E%3Cpath d='M1 1l4.5 4L10 1' stroke='%237A8FA1' stroke-width='1.6' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 13px center',
                  paddingRight: '36px',
                }}
              >
                <option value="">Semua Status</option>
                <option value="Diterima">Diterima</option>
                <option value="Diproses">Diproses</option>
                <option value="Selesai">Selesai</option>
                <option value="Ditolak">Ditolak</option>
              </select>

              <label style={{ display: 'grid', gap: '3px', fontSize: '10px', color: colors.ink3 }}>
                Dari tanggal
                <input type="date" value={filterStartDate} max={filterEndDate || undefined} onChange={(e) => { setFilterStartDate(e.target.value); applyFilters({ startDate: e.target.value }); }} aria-label="Tanggal mulai" style={{ padding: '7px 9px', border: `1px solid #C3CFDC`, borderRadius: '8px', background: colors.card }} />
              </label>
              <label style={{ display: 'grid', gap: '3px', fontSize: '10px', color: colors.ink3 }}>
                Sampai tanggal
                <input type="date" value={filterEndDate} min={filterStartDate || undefined} onChange={(e) => { setFilterEndDate(e.target.value); applyFilters({ endDate: e.target.value }); }} aria-label="Tanggal akhir" style={{ padding: '7px 9px', border: `1px solid #C3CFDC`, borderRadius: '8px', background: colors.card }} />
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: colors.ink2 }}>
                <input type="checkbox" checked={filterFlagged} onChange={(e) => { setFilterFlagged(e.target.checked); applyFilters({ flagged: e.target.checked }); }} />
                Perlu dicek
              </label>

              <select
                value={filterKategori}
                onChange={(e) => { setFilterKategori(e.target.value); applyFilters({ kategori: e.target.value }); }}
                style={{
                  width: 'auto',
                  minWidth: '126px',
                  fontSize: '12px',
                  padding: '8px 30px 8px 11px',
                  border: `1px solid #C3CFDC`,
                  borderRadius: '8px',
                  background: colors.card,
                  color: colors.ink,
                  fontFamily: fonts.sans,
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='7'%3E%3Cpath d='M1 1l4.5 4L10 1' stroke='%237A8FA1' stroke-width='1.6' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 13px center',
                  paddingRight: '36px',
                }}
              >
                <option value="">Semua Kategori</option>
                {kategoris.map((kategori) => (
                  <option key={kategori.id} value={kategori.id}>{kategori.nama}</option>
                ))}
              </select>

              <select
                value={ageOrder}
                onChange={(e) => { const value = e.target.value as 'lama' | 'baru'; setAgeOrder(value); applyFilters({ ageOrder: value }); }}
                aria-label="Urutkan berdasarkan waktu kirim"
                style={{
                  width: 'auto',
                  minWidth: '140px',
                  fontSize: '12px',
                  padding: '8px 30px 8px 11px',
                  border: `1px solid #C3CFDC`,
                  borderRadius: '8px',
                  background: colors.card,
                  color: colors.ink,
                  fontFamily: fonts.sans,
                }}
              >
                <option value="lama">Terlama lebih dulu</option>
                <option value="baru">Terbaru lebih dulu</option>
              </select>

              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchQuery(value);
                  if (searchFilterTimer.current !== null) window.clearTimeout(searchFilterTimer.current);
                  searchFilterTimer.current = window.setTimeout(() => applyFilters({ search: value.trim() }), 350);
                }}
                placeholder="Cari judul atau kode tiket"
                aria-label="Cari judul atau kode tiket"
                style={{
                  flex: '1 1 180px',
                  minWidth: '150px',
                  fontSize: '12.5px',
                  padding: '8px 12px',
                  border: `1px solid #C3CFDC`,
                  borderRadius: '8px',
                  background: colors.card,
                }}
              />

              <button type="button" onClick={exportAspirasi} disabled={loading} style={{ padding: '8px 11px', border: `1px solid ${colors.rule}`, borderRadius: '7px', color: colors.seal, background: colors.card, fontSize: '12px', fontWeight: 600 }}>
                Ekspor CSV
              </button>
              <button type="button" className="admin-filter-reset" onClick={resetFilters} disabled={loading}>
                Hapus filter
              </button>
            </form>
          </div>

          {/* Aspirasi Table */}
          {!loading && displayedAspirasis.length > 0 && (
            <div id="admin-table" style={{
              background: colors.card,
              border: `1px solid ${colors.rule}`,
              borderRadius: '11px',
              overflow: 'hidden',
              minWidth: '560px',
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
              }}>
                <thead>
                  <tr style={{
                    background: '#F7F9FC',
                    borderBottom: `1px solid ${colors.rule2}`,
                  }}>
                    <th style={{
                      fontFamily: fonts.mono,
                      fontSize: '9px',
                      letterSpacing: '.08em',
                      textTransform: 'uppercase',
                      color: colors.ink3,
                      padding: '8px 13px',
                      fontWeight: 600,
                      textAlign: 'left',
                    }}>
                      Kode
                    </th>
                    <th style={{
                      fontFamily: fonts.mono,
                      fontSize: '9px',
                      letterSpacing: '.08em',
                      textTransform: 'uppercase',
                      color: colors.ink3,
                      padding: '8px 13px',
                      fontWeight: 600,
                      textAlign: 'left',
                    }}>
                      Judul
                    </th>
                    <th style={{
                      fontFamily: fonts.mono,
                      fontSize: '9px',
                      letterSpacing: '.08em',
                      textTransform: 'uppercase',
                      color: colors.ink3,
                      padding: '8px 13px',
                      fontWeight: 600,
                      textAlign: 'left',
                    }}>
                      Kategori
                    </th>
                    <th style={{
                      fontFamily: fonts.mono,
                      fontSize: '9px',
                      letterSpacing: '.08em',
                      textTransform: 'uppercase',
                      color: colors.ink3,
                      padding: '8px 13px',
                      fontWeight: 600,
                      textAlign: 'left',
                    }}>
                      Status
                    </th>
                    <th style={{
                      fontFamily: fonts.mono,
                      fontSize: '9px',
                      letterSpacing: '.08em',
                      textTransform: 'uppercase',
                      color: colors.ink3,
                      padding: '8px 13px',
                      fontWeight: 600,
                      textAlign: 'left',
                    }}>
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayedAspirasis.map((aspirasi) => (
                    <tr key={aspirasi.id} aria-current={selectedAspirasi?.id === aspirasi.id ? 'true' : undefined} style={{
                      borderBottom: `1px solid ${colors.rule2}`,
                      fontSize: '12px',
                    }}>
                      <td data-label="Kode" style={{
                        fontFamily: fonts.mono,
                        fontSize: '10.5px',
                        letterSpacing: '.04em',
                        color: colors.ink,
                        padding: '10px 13px',
                      }}>
                        {aspirasi.kode_tiket}
                      </td>
                      <td data-label="Judul" style={{
                        fontWeight: 500,
                        color: colors.ink,
                        padding: '10px 13px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {aspirasi.judul}{aspirasi.is_privat && <span title="Aspirasi hanya dibaca admin" style={{ marginLeft: '7px', color: colors.ink3, fontSize: '10px', fontWeight: 700 }}>🔒 Privat</span>}{aspirasi.has_badwords && <span title="Perlu ditinjau: terindikasi kata kasar" style={{ marginLeft: '7px', color: colors.status.ditolak, fontSize: '10px', fontWeight: 700 }}>⚑ Perlu dicek</span>}
                      </td>
                      <td data-label="Kategori" style={{
                        color: colors.ink2,
                        padding: '10px 13px',
                      }}>
                        {aspirasi.kategori?.nama}
                      </td>
                      <td data-label="Status" style={{
                        padding: '10px 13px',
                      }}>
                        <span style={{
                          display: 'inline-block',
                          fontFamily: fonts.mono,
                          fontSize: '10px',
                          fontWeight: 600,
                          letterSpacing: '.06em',
                          textTransform: 'uppercase',
                          padding: '4px 8px',
                          borderRadius: '5px',
                          background: aspirasi.status === 'Diterima' ? 'rgba(47,109,168,.13)' :
                                     aspirasi.status === 'Diproses' ? 'rgba(154,107,18,.14)' :
                                     aspirasi.status === 'Selesai' ? 'rgba(31,107,74,.13)' :
                                     'rgba(150,56,44,.13)',
                          color: aspirasi.status === 'Diterima' ? colors.status.diterima :
                                aspirasi.status === 'Diproses' ? colors.status.diproses :
                                aspirasi.status === 'Selesai' ? colors.status.selesai :
                                colors.status.ditolak,
                        }}>
                          {aspirasi.status}
                        </span>
                      </td>
                      <td data-label="Aksi" style={{
                        padding: '10px 13px',
                      }}>
                        <button
                          onClick={() => openDetailById(aspirasi.id)}
                          style={{
                            fontSize: '12.5px',
                            color: colors.seal,
                            fontWeight: 600,
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            textUnderlineOffset: '2px',
                          }}
                        >
                          Lihat Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && displayedAspirasis.length === 0 && (
            <FeedbackPanel variant="empty" title={searchQuery ? 'Tiket tidak ditemukan' : activeAdminSection === 'queue' ? 'Antrean moderasi kosong' : 'Belum ada aspirasi'} message={searchQuery ? 'Ubah kata kunci atau hapus pencarian untuk melihat tiket lain.' : 'Coba ubah filter atau periksa kembali nanti.'} />
          )}
          {!loading && !error && totalAspirasi > 0 && (
            <nav className="admin-pagination" aria-label="Halaman daftar aspirasi">
              <span>Menampilkan {displayedAspirasis.length} tiket · halaman {currentPage} dari {lastPage} · {totalAspirasi} hasil</span>
              <div>
                <button type="button" onClick={() => loadAppliedPage(currentPage - 1)} disabled={currentPage <= 1 || loading}>Sebelumnya</button>
                <button type="button" onClick={() => loadAppliedPage(currentPage + 1)} disabled={currentPage >= lastPage || loading}>Berikutnya</button>
              </div>
            </nav>
          )}
          </>}
        </div>
      </main>

      {selectedAspirasi && (
        <div
          role="presentation"
          onClick={() => setSelectedAspirasi(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 20,
            display: 'grid',
            placeItems: 'center',
            padding: '20px',
            background: 'rgba(12, 28, 48, .58)',
          }}
        >
          <section
            className="admin-detail-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="aspirasi-detail-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '85vh',
              overflow: 'auto',
              background: colors.card,
              border: `1px solid ${colors.rule}`,
              borderRadius: '12px',
              padding: '22px',
              boxShadow: '0 24px 70px rgba(0,0,0,.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: '0 0 5px', color: colors.ink3, fontFamily: fonts.mono, fontSize: '11px' }}>
                  {selectedAspirasi.kode_tiket} · {selectedAspirasi.kategori?.nama}
                </p>
                <h2 id="aspirasi-detail-title" style={{ margin: 0, color: colors.ink, fontFamily: fonts.display, fontSize: '20px' }}>
                  {selectedAspirasi.judul}
                </h2>
              </div>
              <button type="button" onClick={() => setSelectedAspirasi(null)} aria-label="Tutup detail" style={{ color: colors.ink2, fontSize: '22px', lineHeight: 1 }}>
                ×
              </button>
            </div>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65, color: colors.ink2, margin: '18px 0' }}>
              {selectedAspirasi.isi}
            </p>
            <aside className="admin-moderation-guidance">
              <b>Panduan moderasi</b>
              <ul>
                <li>Samarkan identitas atau nomor kontak yang tertulis di isi aspirasi.</li>
                <li>Balasan sebaiknya menyebut tindak lanjut dan penanggung jawab.</li>
                <li>Topik sensitif perlu ditangani privat.</li>
              </ul>
            </aside>
            {selectedAspirasi.has_badwords && <p role="alert" style={{ padding: '10px 12px', margin: '12px 0', borderRadius: '8px', color: colors.status.ditolak, background: 'rgba(150,56,44,.08)', fontSize: '12px' }}>Terindikasi mengandung kata kasar. Tinjau isi dan samarkan bagian sensitif sebelum dipublikasikan.</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', color: colors.ink3, fontSize: '12px' }}>
              <span>Status: {selectedAspirasi.status}</span>
              <span>·</span>
              <span>{selectedAspirasi.is_anonim ? 'Anonim' : (selectedAspirasi.nama || 'Nama tidak dicantumkan')}</span>
              <span>·</span>
              <span>{new Date(selectedAspirasi.created_at).toLocaleString('id-ID')}</span>
            </div>
            {(selectedAspirasi.saran_pelapor || selectedAspirasi.tautan_pendukung?.length || selectedAspirasi.lampiran?.length) && (
              <section aria-label="Saran dan bukti dari pelapor" style={{ display: 'grid', gap: '12px', marginTop: '18px', padding: '14px', border: `1px solid ${colors.rule}`, borderRadius: '9px', background: colors.paper }}>
                <h3 style={{ margin: 0, color: colors.ink, fontFamily: fonts.display, fontSize: '14px' }}>Saran dan bukti dari pelapor</h3>
                {selectedAspirasi.saran_pelapor && (
                  <div>
                    <b style={{ display: 'block', marginBottom: '4px', color: colors.ink2, fontSize: '12px' }}>Saran atau solusi</b>
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6, color: colors.ink2, fontSize: '13px' }}>{selectedAspirasi.saran_pelapor}</p>
                  </div>
                )}
                {!!selectedAspirasi.tautan_pendukung?.length && (
                  <div>
                    <b style={{ display: 'block', marginBottom: '5px', color: colors.ink2, fontSize: '12px' }}>Tautan pendukung</b>
                    <ul style={{ display: 'grid', gap: '5px', paddingLeft: '18px', margin: 0 }}>
                      {selectedAspirasi.tautan_pendukung.map((url, index) => (
                        <li key={`${url}-${index}`} style={{ overflowWrap: 'anywhere', fontSize: '12px' }}>
                          <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {!!selectedAspirasi.lampiran?.length && (
                  <div>
                    <b style={{ display: 'block', marginBottom: '5px', color: colors.ink2, fontSize: '12px' }}>Lampiran bukti</b>
                    <ul style={{ display: 'grid', gap: '7px', padding: 0, margin: 0, listStyle: 'none' }}>
                      {selectedAspirasi.lampiran.map((file, index) => (
                        <li key={`${file.name}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
                          <span style={{ overflowWrap: 'anywhere', color: colors.ink2 }}>{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</span>
                          <button type="button" onClick={() => downloadAttachment(index, file.name)} style={{ padding: '6px 9px', borderRadius: '6px', color: '#fff', background: colors.seal, flex: 'none' }}>Unduh</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}
            <div style={{ borderTop: `1px solid ${colors.rule}`, marginTop: '18px', paddingTop: '16px' }}>
              <h3 style={{ margin: '0 0 12px', color: colors.ink, fontFamily: fonts.display, fontSize: '15px' }}>Tindak lanjut</h3>
              <div className="admin-status-controls">
                <label className="admin-status-field" style={{ display: 'grid', gap: '5px', color: colors.ink2, fontSize: '12px' }}>
                  Status aspirasi
                  <select
                    value={statusDraft}
                    onChange={(event) => setStatusDraft(event.target.value as StatusType)}
                    disabled={actionLoading}
                    style={{ padding: '9px 11px', border: `1px solid ${colors.rule}`, borderRadius: '7px', background: colors.card }}
                  >
                    <option value="Diterima">Diterima</option>
                    <option value="Diproses">Diproses</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Ditolak">Ditolak</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={handleUpdateStatus}
                  disabled={actionLoading || statusDraft === selectedAspirasi.status}
                  style={{ padding: '9px 12px', borderRadius: '7px', background: colors.seal, color: '#fff', opacity: actionLoading || statusDraft === selectedAspirasi.status ? .55 : 1 }}
                >
                  Simpan status
                </button>
              </div>
              <section className="admin-visibility-settings" aria-labelledby="visibility-settings-title">
                <div className="admin-visibility-heading">
                  <h4 id="visibility-settings-title">Visibilitas aspirasi</h4>
                  <p>Atur apakah aspirasi bisa dibaca oleh publik.</p>
                </div>
                <div className="admin-switch-list">
                  <div className="admin-switch-row">
                    <span><b>Tampilkan di halaman publik</b><small>{selectedAspirasi.is_privat ? 'Matikan mode privat terlebih dahulu untuk menampilkan aspirasi.' : 'Aspirasi dan balasan dapat dilihat mahasiswa.'}</small></span>
                    <label className="admin-switch" aria-label="Tampilkan aspirasi di halaman publik">
                      <input
                        type="checkbox"
                        role="switch"
                        checked={Boolean(selectedAspirasi.is_publik)}
                        aria-checked={Boolean(selectedAspirasi.is_publik)}
                        onChange={handleTogglePublic}
                        disabled={actionLoading || Boolean(selectedAspirasi.is_privat)}
                      />
                      <span aria-hidden="true" />
                    </label>
                  </div>
                  <div className="admin-switch-row">
                    <span><b>Tandai sebagai privat</b><small>Menonaktifkan tampilan publik dan membatasi aspirasi ke pengurus.</small></span>
                    <label className="admin-switch" aria-label="Tandai aspirasi sebagai privat">
                      <input
                        type="checkbox"
                        role="switch"
                        checked={Boolean(selectedAspirasi.is_privat)}
                        aria-checked={Boolean(selectedAspirasi.is_privat)}
                        onChange={handleTogglePrivate}
                        disabled={actionLoading}
                      />
                      <span aria-hidden="true" />
                    </label>
                  </div>
                </div>
              </section>
              <form onSubmit={handleReply} style={{ display: 'grid', gap: '8px', marginTop: '16px' }}>
                <label htmlFor="reply-text" style={{ color: colors.ink2, fontSize: '12px' }}>Balasan untuk pengirim</label>
                <textarea
                  id="reply-text"
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value)}
                  maxLength={5000}
                  required
                  rows={3}
                  placeholder="Tulis tanggapan atau tindak lanjut..."
                  disabled={actionLoading}
                  style={{ width: '100%', resize: 'vertical', padding: '10px 12px', border: `1px solid ${colors.rule}`, borderRadius: '8px', background: colors.card }}
                />
                <label htmlFor="reply-attachments" style={{ color: colors.ink2, fontSize: '12px' }}>Lampiran bukti <span style={{ color: colors.ink3 }}>(opsional, maks. 3 file · 5 MB per file)</span></label>
                <input
                  id="reply-attachments"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                  multiple
                  disabled={actionLoading}
                  onChange={(event) => {
                    const files = Array.from(event.target.files || []);
                    const invalid = files.length > 3
                      ? 'Pilih maksimal 3 file.'
                      : files.some((file) => file.size > 5 * 1024 * 1024)
                        ? 'Ukuran setiap file maksimal 5 MB.'
                        : null;
                    setReplyFileError(invalid);
                    if (!invalid) setReplyFiles(files);
                    event.target.value = '';
                  }}
                  style={{ fontSize: '12px', color: colors.ink2 }}
                />
                {replyFileError && <p role="alert" style={{ color: colors.status.ditolak, margin: 0, fontSize: '12px' }}>{replyFileError}</p>}
                {!!replyFiles.length && <ul style={{ display: 'grid', gap: '4px', padding: 0, margin: '0 0 4px', listStyle: 'none' }}>
                  {replyFiles.map((file, index) => <li key={`${file.name}-${file.lastModified}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '12px' }}>
                    <span style={{ overflowWrap: 'anywhere' }}>{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</span>
                    <button type="button" disabled={actionLoading} onClick={() => setReplyFiles((current) => current.filter((_, i) => i !== index))} style={{ color: colors.status.ditolak }}>Hapus</button>
                  </li>)}
                </ul>}
                <button
                  type="submit"
                  disabled={actionLoading || !replyText.trim()}
                  style={{ justifySelf: 'start', padding: '9px 12px', borderRadius: '7px', background: colors.seal, color: '#fff', opacity: actionLoading || !replyText.trim() ? .55 : 1 }}
                >
                  {actionLoading ? 'Menyimpan...' : 'Kirim balasan'}
                </button>
              </form>
              {actionError && <p role="alert" style={{ color: colors.status.ditolak, margin: '12px 0 0', fontSize: '13px' }}>{actionError}</p>}
              {actionNotice && <p role="status" style={{ color: colors.status.selesai, margin: '12px 0 0', fontSize: '13px' }}>{actionNotice}</p>}
            </div>
            {!!selectedAspirasi.balasans?.length && (
              <div style={{ borderTop: `1px solid ${colors.rule}`, marginTop: '18px', paddingTop: '16px' }}>
                <h3 style={{ margin: '0 0 10px', color: colors.ink, fontFamily: fonts.display, fontSize: '15px' }}>Balasan</h3>
                {selectedAspirasi.balasans.map((balasan) => (
                  <article key={balasan.id} style={{ background: colors.paper, borderRadius: '8px', padding: '12px', marginTop: '8px' }}>
                    <p style={{ margin: '0 0 6px', whiteSpace: 'pre-wrap', color: colors.ink2 }}>{balasan.isi}</p>
                    <small style={{ color: colors.ink3 }}>{balasan.admin?.nama || 'Admin'} · {new Date(balasan.created_at).toLocaleString('id-ID')}</small>
                    {!!balasan.lampiran?.length && <ul style={{ display: 'grid', gap: '6px', padding: 0, margin: '10px 0 0', listStyle: 'none' }}>
                      {balasan.lampiran.map((file, index) => <li key={`${file.name}-${index}`}>
                        <button type="button" onClick={() => downloadReplyFile(balasan.id, index, file.name)} style={{ padding: '6px 9px', border: `1px solid ${colors.rule}`, borderRadius: '6px', color: colors.seal, background: colors.card, fontSize: '12px' }}>
                          Unduh bukti: {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
                        </button>
                      </li>)}
                    </ul>}
                  </article>
                ))}
              </div>
            )}
            <section className="admin-audit-history" aria-labelledby="admin-audit-history-title">
              <div className="admin-audit-heading">
                <h3 id="admin-audit-history-title">Riwayat aktivitas</h3>
                <span>{selectedAspirasi.audit_trails?.length || 0} aktivitas</span>
              </div>
              {selectedAspirasi.audit_trails?.length ? (
                <ol>
                  {selectedAspirasi.audit_trails.map((entry) => {
                    const activityLabel = {
                      status_changed: 'Status diperbarui',
                      public_visibility_changed: 'Visibilitas publik diubah',
                      privacy_changed: 'Pengaturan privat diubah',
                      reply_sent: 'Balasan dikirim',
                    }[entry.action];
                    return <li key={entry.id}>
                      <i aria-hidden="true" />
                      <div>
                        <b>{activityLabel}</b>
                        {entry.old_value && entry.new_value && <span>{entry.old_value} <span aria-hidden="true">→</span> {entry.new_value}</span>}
                        <small>{entry.admin?.nama || 'Akun pengurus'} · {new Date(entry.created_at).toLocaleString('id-ID')}</small>
                      </div>
                    </li>;
                  })}
                </ol>
              ) : <p className="admin-audit-empty">Belum ada perubahan atau balasan yang tercatat.</p>}
            </section>
          </section>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
