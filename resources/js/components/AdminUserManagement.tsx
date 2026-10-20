import { useState, useEffect, useCallback, useRef } from 'react';
import { adminAPI } from '../services/api';
import { Admin, UserManagementCounts } from '../types';
import { colors, fonts } from '../utils/designTokens';
import FeedbackPanel from './FeedbackPanel';

type AdminUserManagementProps = {
  currentUser: Admin | null;
  onUserSelfUpdated?: (updatedUser: Admin) => void;
};

export default function AdminUserManagement({
  currentUser,
  onUserSelfUpdated,
}: AdminUserManagementProps) {
  const [users, setUsers] = useState<Admin[]>([]);
  const [counts, setCounts] = useState<UserManagementCounts>({
    total: 0,
    admin: 0,
    moderator: 0,
    active: 0,
    inactive: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'moderator'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const searchTimer = useRef<number | null>(null);

  // Notice / Alerts
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Admin | null>(null);
  const [passwordUser, setPasswordUser] = useState<Admin | null>(null);
  const [deletingUser, setDeletingUser] = useState<Admin | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states for Create
  const [createNama, setCreateNama] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createRole, setCreateRole] = useState<'admin' | 'moderator'>('moderator');
  const [createPassword, setCreatePassword] = useState('');
  const [createPasswordConfirm, setCreatePasswordConfirm] = useState('');
  const [createIsActive, setCreateIsActive] = useState(true);
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  // Form states for Edit
  const [editNama, setEditNama] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'moderator'>('moderator');
  const [editIsActive, setEditIsActive] = useState(true);

  // Form states for Password Reset
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const fetchUsers = useCallback(async (
    searchQuery = search,
    role = filterRole,
    status = filterStatus
  ) => {
    try {
      setLoading(true);
      setError(null);
      const params: { search?: string; role?: string; is_active?: string } = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (role !== 'all') params.role = role;
      if (status === 'active') params.is_active = 'true';
      if (status === 'inactive') params.is_active = 'false';

      const res = await adminAPI.getUsers(params);
      setUsers(res.data.users || []);
      if (res.data.counts) {
        setCounts(res.data.counts);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal memuat daftar pengurus.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [search, filterRole, filterStatus]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => {
      fetchUsers(val, filterRole, filterStatus);
    }, 350);
  };

  const handleRoleFilterChange = (val: 'all' | 'admin' | 'moderator') => {
    setFilterRole(val);
    fetchUsers(search, val, filterStatus);
  };

  const handleStatusFilterChange = (val: 'all' | 'active' | 'inactive') => {
    setFilterStatus(val);
    fetchUsers(search, filterRole, val);
  };

  const resetFilters = () => {
    setSearch('');
    setFilterRole('all');
    setFilterStatus('all');
    fetchUsers('', 'all', 'all');
  };

  // Auto-dismiss notice after 5 seconds
  useEffect(() => {
    if (!actionNotice) return;
    const timer = setTimeout(() => setActionNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [actionNotice]);

  // Modal ESC handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCreateOpen) setIsCreateOpen(false);
        if (editingUser) setEditingUser(null);
        if (passwordUser) setPasswordUser(null);
        if (deletingUser) setDeletingUser(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreateOpen, editingUser, passwordUser, deletingUser]);

  // Reset Create Form
  const openCreateModal = () => {
    setCreateNama('');
    setCreateEmail('');
    setCreateRole('moderator');
    setCreatePassword('');
    setCreatePasswordConfirm('');
    setCreateIsActive(true);
    setShowCreatePassword(false);
    setActionError(null);
    setIsCreateOpen(true);
  };

  // Submit Create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    if (!createNama.trim()) {
      setActionError('Nama lengkap pengurus wajib diisi.');
      return;
    }
    if (!createEmail.trim()) {
      setActionError('Email pengurus wajib diisi.');
      return;
    }
    if (createPassword.length < 8) {
      setActionError('Password minimal harus 8 karakter.');
      return;
    }
    if (createPassword !== createPasswordConfirm) {
      setActionError('Konfirmasi password tidak cocok dengan password.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await adminAPI.createUser({
        nama: createNama.trim(),
        email: createEmail.trim(),
        password: createPassword,
        role: createRole,
        is_active: createIsActive,
      });

      setIsCreateOpen(false);
      setActionNotice(res.data.message || 'Pengurus baru berhasil didaftarkan.');
      fetchUsers();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menambahkan pengurus baru.';
      setActionError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Form
  const openEditModal = (user: Admin) => {
    setEditingUser(user);
    setEditNama(user.nama);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditIsActive(user.is_active);
    setActionError(null);
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setActionError(null);

    if (!editNama.trim()) {
      setActionError('Nama lengkap pengurus wajib diisi.');
      return;
    }
    if (!editEmail.trim()) {
      setActionError('Email pengurus wajib diisi.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await adminAPI.updateUser(editingUser.id, {
        nama: editNama.trim(),
        email: editEmail.trim(),
        role: editRole,
        is_active: editIsActive,
      });

      // Update current user state if editing self
      if (currentUser && currentUser.id === editingUser.id && onUserSelfUpdated) {
        onUserSelfUpdated(res.data.user);
      }

      setEditingUser(null);
      setActionNotice(res.data.message || 'Data pengurus berhasil diperbarui.');
      fetchUsers();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal memperbarui data pengurus.';
      setActionError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Open Password Modal
  const openPasswordModal = (user: Admin) => {
    setPasswordUser(user);
    setNewPassword('');
    setNewPasswordConfirm('');
    setShowNewPassword(false);
    setActionError(null);
  };

  // Submit Password Reset
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordUser) return;
    setActionError(null);

    if (newPassword.length < 8) {
      setActionError('Password baru minimal harus 8 karakter.');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setActionError('Konfirmasi password tidak cocok.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await adminAPI.updateUserPassword(passwordUser.id, newPassword);
      setPasswordUser(null);
      setActionNotice(res.data.message || 'Password pengurus berhasil diubah.');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal mengubah password pengurus.';
      setActionError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Active Status
  const handleToggleStatus = async (user: Admin) => {
    if (currentUser && currentUser.id === user.id) {
      alert('Anda tidak dapat menonaktifkan akun yang sedang aktif Anda gunakan.');
      return;
    }

    const actionText = user.is_active ? 'menonaktifkan' : 'mengaktifkan kembali';
    const confirmMessage = `Apakah Anda yakin ingin ${actionText} akun pengurus ${user.nama} (${user.email})?`;
    if (!window.confirm(confirmMessage)) return;

    try {
      setLoading(true);
      const res = await adminAPI.toggleUserStatus(user.id);
      setActionNotice(res.data.message || 'Status pengurus berhasil diubah.');
      fetchUsers();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal mengubah status pengurus.';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  // Confirm Delete
  const handleDeleteSubmit = async () => {
    if (!deletingUser) return;
    setActionError(null);

    try {
      setSubmitting(true);
      const res = await adminAPI.deleteUser(deletingUser.id);
      setDeletingUser(null);
      setActionNotice(res.data.message || 'Akun pengurus berhasil dihapus.');
      fetchUsers();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menghapus pengurus.';
      setActionError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getInitials = (nama: string) => {
    const parts = nama.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="admin-user-management" style={{ display: 'grid', gap: '16px' }}>
      {/* Top Banner Notice */}
      {actionNotice && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'rgba(31, 122, 77, 0.1)',
          border: `1px solid ${colors.status.selesai}`,
          borderRadius: '9px',
          color: colors.status.selesai,
          fontSize: '13px',
          fontWeight: 500,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>✓</span>
            <span>{actionNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            style={{ color: colors.status.selesai, fontSize: '16px', lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
      }}>
        {/* Total Pengurus */}
        <div style={{
          background: colors.card,
          border: `1px solid ${colors.rule}`,
          borderRadius: '10px',
          padding: '14px 16px',
          boxShadow: '0 1px 3px rgba(12,35,58,0.04)',
        }}>
          <p style={{
            margin: 0,
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '.05em',
            fontFamily: fonts.mono,
            color: colors.ink3,
            fontWeight: 600,
          }}>
            Total Pengurus
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <span style={{
              fontSize: '26px',
              fontWeight: 700,
              fontFamily: fonts.display,
              color: colors.seal,
              lineHeight: 1,
            }}>
              {counts.total}
            </span>
            <span style={{ fontSize: '11px', color: colors.ink3 }}>orang</span>
          </div>
        </div>

        {/* Administrator */}
        <div style={{
          background: colors.card,
          border: `1px solid ${colors.rule}`,
          borderRadius: '10px',
          padding: '14px 16px',
          boxShadow: '0 1px 3px rgba(12,35,58,0.04)',
        }}>
          <p style={{
            margin: 0,
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '.05em',
            fontFamily: fonts.mono,
            color: colors.ink3,
            fontWeight: 600,
          }}>
            Administrator (Akses Penuh)
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <span style={{
              fontSize: '26px',
              fontWeight: 700,
              fontFamily: fonts.display,
              color: '#A9761B',
              lineHeight: 1,
            }}>
              {counts.admin}
            </span>
            <span style={{ fontSize: '11px', color: colors.ink3 }}>admin aktif</span>
          </div>
        </div>

        {/* Moderator */}
        <div style={{
          background: colors.card,
          border: `1px solid ${colors.rule}`,
          borderRadius: '10px',
          padding: '14px 16px',
          boxShadow: '0 1px 3px rgba(12,35,58,0.04)',
        }}>
          <p style={{
            margin: 0,
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '.05em',
            fontFamily: fonts.mono,
            color: colors.ink3,
            fontWeight: 600,
          }}>
            Moderator (Peninjau)
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <span style={{
              fontSize: '26px',
              fontWeight: 700,
              fontFamily: fonts.display,
              color: colors.status.diterima,
              lineHeight: 1,
            }}>
              {counts.moderator}
            </span>
            <span style={{ fontSize: '11px', color: colors.ink3 }}>staf moderasi</span>
          </div>
        </div>

        {/* Aktif vs Nonaktif */}
        <div style={{
          background: colors.card,
          border: `1px solid ${colors.rule}`,
          borderRadius: '10px',
          padding: '14px 16px',
          boxShadow: '0 1px 3px rgba(12,35,58,0.04)',
        }}>
          <p style={{
            margin: 0,
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '.05em',
            fontFamily: fonts.mono,
            color: colors.ink3,
            fontWeight: 600,
          }}>
            Status Keaktifan
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px' }}>
            <div>
              <span style={{
                fontSize: '24px',
                fontWeight: 700,
                fontFamily: fonts.display,
                color: colors.status.selesai,
                lineHeight: 1,
              }}>
                {counts.active}
              </span>
              <span style={{ fontSize: '11px', color: colors.ink3, marginLeft: '4px' }}>aktif</span>
            </div>
            {counts.inactive > 0 && (
              <div>
                <span style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  fontFamily: fonts.display,
                  color: colors.status.ditolak,
                  lineHeight: 1,
                }}>
                  {counts.inactive}
                </span>
                <span style={{ fontSize: '11px', color: colors.ink3, marginLeft: '4px' }}>nonaktif</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Container Card: Search, Filter & Table */}
      <div style={{
        background: colors.card,
        border: `1px solid ${colors.rule}`,
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(12,35,58,0.04)',
      }}>
        {/* Controls Bar */}
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${colors.rule}`,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          background: '#FCFDFE',
        }}>
          {/* Search & Filters */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            flex: 1,
            minWidth: '280px',
          }}>
            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '220px', flex: '1 1 240px' }}>
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Cari nama atau email pengurus..."
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 34px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: '1px solid #C3CFDC',
                  background: colors.card,
                  color: colors.ink,
                  outline: 'none',
                }}
              />
              <span style={{
                position: 'absolute',
                left: '11px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: colors.ink3,
                fontSize: '13px',
                pointerEvents: 'none',
              }}>
                🔍
              </span>
              {search && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: colors.ink3,
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  ×
                </button>
              )}
            </div>

            {/* Role Filter */}
            <select
              value={filterRole}
              onChange={(e) => handleRoleFilterChange(e.target.value as any)}
              style={{
                padding: '9px 28px 9px 12px',
                fontSize: '12px',
                borderRadius: '8px',
                border: '1px solid #C3CFDC',
                background: colors.card,
                color: colors.ink,
                fontFamily: fonts.sans,
                cursor: 'pointer',
              }}
            >
              <option value="all">Semua Peran</option>
              <option value="admin">Administrator</option>
              <option value="moderator">Moderator</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => handleStatusFilterChange(e.target.value as any)}
              style={{
                padding: '9px 28px 9px 12px',
                fontSize: '12px',
                borderRadius: '8px',
                border: '1px solid #C3CFDC',
                background: colors.card,
                color: colors.ink,
                fontFamily: fonts.sans,
                cursor: 'pointer',
              }}
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif Saja</option>
              <option value="inactive">Nonaktif Saja</option>
            </select>

            {(search || filterRole !== 'all' || filterStatus !== 'all') && (
              <button
                type="button"
                onClick={resetFilters}
                style={{
                  fontSize: '12px',
                  color: colors.seal,
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: 'rgba(15,50,96,0.06)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Reset Filter
              </button>
            )}
          </div>

          {/* Add User CTA Button */}
          <button
            type="button"
            onClick={openCreateModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '8px',
              background: colors.seal,
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: fonts.sans,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(15, 50, 96, 0.25)',
              transition: 'opacity .15s, transform .1s',
            }}
          >
            <span style={{ fontSize: '15px', fontWeight: 700 }}>+</span>
            Tambah Pengurus Baru
          </button>
        </div>

        {/* Loading / Error / Content */}
        {error && (
          <div style={{ padding: '20px' }}>
            <FeedbackPanel
              variant="error"
              title="Gagal Memuat Data"
              message={error}
              actionLabel="Coba Lagi"
              onAction={() => fetchUsers()}
            />
          </div>
        )}

        {loading && (
          <div style={{ padding: '20px' }}>
            <FeedbackPanel variant="loading" title="Memuat daftar pengurus…" />
          </div>
        )}

        {!loading && !error && users.length === 0 && (
          <div style={{ padding: '36px 20px', textAlign: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#F0F4F8',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 12px',
              fontSize: '22px',
            }}>
              👥
            </div>
            <h4 style={{ margin: '0 0 4px', color: colors.ink, fontFamily: fonts.display, fontSize: '15px' }}>
              Tidak ada pengurus ditemukan
            </h4>
            <p style={{ margin: '0 0 16px', color: colors.ink3, fontSize: '12px' }}>
              {search || filterRole !== 'all' || filterStatus !== 'all'
                ? 'Tidak ada data pengurus yang cocok dengan kriteria filter Anda.'
                : 'Belum ada akun pengurus yang terdaftar.'}
            </p>
            {(search || filterRole !== 'all' || filterStatus !== 'all') && (
              <button
                type="button"
                onClick={resetFilters}
                style={{
                  padding: '7px 14px',
                  borderRadius: '7px',
                  background: colors.seal,
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Reset Filter
              </button>
            )}
          </div>
        )}

        {/* Responsive Table */}
        {!loading && !error && users.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
              textAlign: 'left',
            }}>
              <thead>
                <tr style={{
                  borderBottom: `1px solid ${colors.rule}`,
                  background: '#F8FAFC',
                  color: colors.ink3,
                  fontFamily: fonts.mono,
                  fontSize: '10.5px',
                  textTransform: 'uppercase',
                  letterSpacing: '.06em',
                }}>
                  <th style={{ padding: '12px 18px' }}>Pengurus</th>
                  <th style={{ padding: '12px 14px' }}>Peran (Role)</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                  <th style={{ padding: '12px 14px' }}>Terakhir Aktif</th>
                  <th style={{ padding: '12px 14px' }}>Kontribusi</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isSelf = currentUser && currentUser.id === user.id;
                  const isAdmin = user.role === 'admin';

                  return (
                    <tr
                      key={user.id}
                      style={{
                        borderBottom: `1px solid ${colors.rule}`,
                        background: isSelf ? 'rgba(15, 50, 96, 0.02)' : colors.card,
                        transition: 'background .12s',
                      }}
                    >
                      {/* Name & Email */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {/* Avatar Initials */}
                          <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            display: 'grid',
                            placeItems: 'center',
                            background: isAdmin
                              ? 'linear-gradient(135deg, #0F3260, #1A4B87)'
                              : 'linear-gradient(135deg, #E2EDF8, #D0E2F3)',
                            color: isAdmin ? '#F5C953' : '#174A7E',
                            fontWeight: 700,
                            fontSize: '13px',
                            fontFamily: fonts.display,
                            flexShrink: 0,
                            boxShadow: isAdmin ? '0 2px 5px rgba(15,50,96,.2)' : 'none',
                          }}>
                            {getInitials(user.nama)}
                          </div>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <b style={{ color: colors.ink, fontSize: '13.5px' }}>{user.nama}</b>
                              {isSelf && (
                                <span style={{
                                  fontSize: '9.5px',
                                  padding: '2px 7px',
                                  borderRadius: '20px',
                                  background: '#E9F1FA',
                                  color: colors.seal,
                                  fontWeight: 600,
                                  fontFamily: fonts.mono,
                                }}>
                                  Anda
                                </span>
                              )}
                            </div>
                            <span style={{
                              display: 'block',
                              color: colors.ink3,
                              fontSize: '11.5px',
                              fontFamily: fonts.mono,
                              marginTop: '2px',
                            }}>
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td style={{ padding: '14px 14px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          fontFamily: fonts.display,
                          background: isAdmin ? 'rgba(169, 118, 27, 0.12)' : 'rgba(27, 91, 158, 0.09)',
                          color: isAdmin ? '#8C6010' : '#1B5B9E',
                          border: `1px solid ${isAdmin ? 'rgba(169, 118, 27, 0.25)' : 'rgba(27, 91, 158, 0.2)'}`,
                        }}>
                          <span style={{ fontSize: '12px' }}>{isAdmin ? '★' : '🛡'}</span>
                          {isAdmin ? 'Administrator' : 'Moderator'}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 14px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 8px',
                          borderRadius: '20px',
                          fontSize: '11.5px',
                          fontWeight: 500,
                          background: user.is_active ? 'rgba(31, 122, 77, 0.08)' : 'rgba(150, 56, 44, 0.08)',
                          color: user.is_active ? colors.status.selesai : colors.status.ditolak,
                        }}>
                          <span style={{
                            width: '6.5px',
                            height: '6.5px',
                            borderRadius: '50%',
                            background: user.is_active ? colors.status.selesai : colors.status.ditolak,
                            boxShadow: user.is_active ? `0 0 5px ${colors.status.selesai}` : 'none',
                          }} />
                          {user.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>

                      {/* Last Login */}
                      <td style={{ padding: '14px 14px', color: colors.ink2, fontSize: '12px' }}>
                        {user.last_login ? (
                          <div>
                            <span style={{ display: 'block', color: colors.ink }}>
                              {new Date(user.last_login).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                            <span style={{ color: colors.ink3, fontSize: '10.5px', fontFamily: fonts.mono }}>
                              {new Date(user.last_login).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })} WIB
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: colors.ink3, fontStyle: 'italic', fontSize: '11.5px' }}>
                            Belum pernah login
                          </span>
                        )}
                      </td>

                      {/* Kontribusi */}
                      <td style={{ padding: '14px 14px', color: colors.ink2, fontSize: '12px' }}>
                        <b style={{ color: colors.ink }}>{user.balasans_count || 0}</b>
                        <span style={{ color: colors.ink3, marginLeft: '4px', fontSize: '11px' }}>balasan</span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          justifyContent: 'flex-end',
                        }}>
                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => openEditModal(user)}
                            title="Edit data pengurus"
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              background: '#F1F5F9',
                              border: '1px solid #CBD5E1',
                              color: colors.ink,
                              fontSize: '12px',
                              fontWeight: 500,
                              cursor: 'pointer',
                            }}
                          >
                            Edit
                          </button>

                          {/* Reset Password Button */}
                          <button
                            type="button"
                            onClick={() => openPasswordModal(user)}
                            title="Ganti / Reset Password"
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              background: '#F1F5F9',
                              border: '1px solid #CBD5E1',
                              color: colors.ink,
                              fontSize: '12px',
                              fontWeight: 500,
                              cursor: 'pointer',
                            }}
                          >
                            Kunci
                          </button>

                          {/* Toggle Active Status */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(user)}
                            disabled={isSelf}
                            title={isSelf ? 'Tidak dapat menonaktifkan akun sendiri' : (user.is_active ? 'Nonaktifkan akun' : 'Aktifkan akun')}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              background: user.is_active ? 'rgba(150, 56, 44, 0.08)' : 'rgba(31, 122, 77, 0.08)',
                              border: `1px solid ${user.is_active ? 'rgba(150, 56, 44, 0.2)' : 'rgba(31, 122, 77, 0.2)'}`,
                              color: user.is_active ? colors.status.ditolak : colors.status.selesai,
                              fontSize: '12px',
                              fontWeight: 500,
                              cursor: isSelf ? 'not-allowed' : 'pointer',
                              opacity: isSelf ? 0.45 : 1,
                            }}
                          >
                            {user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setActionError(null);
                              setDeletingUser(user);
                            }}
                            disabled={isSelf}
                            title={isSelf ? 'Tidak dapat menghapus akun sendiri' : 'Hapus akun'}
                            style={{
                              padding: '6px 9px',
                              borderRadius: '6px',
                              background: 'transparent',
                              border: '1px solid transparent',
                              color: colors.status.ditolak,
                              fontSize: '13px',
                              cursor: isSelf ? 'not-allowed' : 'pointer',
                              opacity: isSelf ? 0.35 : 1,
                            }}
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: TAMBAH PENGURUS BARU                                             */}
      {/* ========================================================================= */}
      {isCreateOpen && (
        <div
          role="presentation"
          onClick={() => setIsCreateOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 30,
            display: 'grid',
            placeItems: 'center',
            padding: '16px',
            background: 'rgba(12, 28, 48, 0.65)',
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-create-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '520px',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: colors.card,
              border: `1px solid ${colors.rule}`,
              borderRadius: '14px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              padding: '24px',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <span style={{
                  fontSize: '10.5px',
                  fontFamily: fonts.mono,
                  letterSpacing: '.06em',
                  textTransform: 'uppercase',
                  color: colors.seal,
                  fontWeight: 600,
                }}>
                  Pengurus Baru
                </span>
                <h3 id="modal-create-title" style={{
                  margin: '4px 0 0',
                  color: colors.ink,
                  fontFamily: fonts.display,
                  fontSize: '19px',
                  fontWeight: 700,
                }}>
                  Tambah Pengurus Baru
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                style={{
                  fontSize: '22px',
                  color: colors.ink3,
                  lineHeight: 1,
                  padding: '4px',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>

            {/* Error in modal */}
            {actionError && (
              <div style={{
                padding: '10px 14px',
                marginBottom: '16px',
                borderRadius: '8px',
                background: 'rgba(150, 56, 44, 0.08)',
                border: `1px solid ${colors.status.ditolak}`,
                color: colors.status.ditolak,
                fontSize: '12.5px',
              }}>
                {actionError}
              </div>
            )}

            {/* Create Form */}
            <form onSubmit={handleCreateSubmit} style={{ display: 'grid', gap: '14px' }}>
              {/* Nama */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: colors.ink, marginBottom: '6px' }}>
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={createNama}
                  onChange={(e) => setCreateNama(e.target.value)}
                  placeholder="Contoh: Budi Prasetyo, S.Kom."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '13.5px',
                    borderRadius: '8px',
                    border: '1px solid #C3CFDC',
                    background: colors.card,
                    color: colors.ink,
                    outline: 'none',
                  }}
                />
              </div>

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: colors.ink, marginBottom: '6px' }}>
                  Alamat Email Resmi *
                </label>
                <input
                  type="email"
                  required
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="pengurus@jtik.polsub.ac.id"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '13.5px',
                    borderRadius: '8px',
                    border: '1px solid #C3CFDC',
                    background: colors.card,
                    color: colors.ink,
                    outline: 'none',
                  }}
                />
              </div>

              {/* Role Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: colors.ink, marginBottom: '6px' }}>
                  Peran & Hak Akses *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {/* Moderator Card */}
                  <label style={{
                    display: 'block',
                    padding: '12px',
                    borderRadius: '9px',
                    border: `1.5px solid ${createRole === 'moderator' ? colors.seal : '#DCE5ED'}`,
                    background: createRole === 'moderator' ? '#F2F7FC' : colors.card,
                    cursor: 'pointer',
                    transition: 'all .12s',
                  }}>
                    <input
                      type="radio"
                      name="create_role"
                      value="moderator"
                      checked={createRole === 'moderator'}
                      onChange={() => setCreateRole('moderator')}
                      style={{ marginRight: '6px' }}
                    />
                    <b style={{ color: colors.ink, fontSize: '13px' }}>Moderator</b>
                    <p style={{ margin: '4px 0 0', fontSize: '11px', color: colors.ink3, lineHeight: 1.4 }}>
                      Meninjau aspirasi masuk, mengubah status, dan membalas tiket.
                    </p>
                  </label>

                  {/* Admin Card */}
                  <label style={{
                    display: 'block',
                    padding: '12px',
                    borderRadius: '9px',
                    border: `1.5px solid ${createRole === 'admin' ? '#A9761B' : '#DCE5ED'}`,
                    background: createRole === 'admin' ? '#FDF8EE' : colors.card,
                    cursor: 'pointer',
                    transition: 'all .12s',
                  }}>
                    <input
                      type="radio"
                      name="create_role"
                      value="admin"
                      checked={createRole === 'admin'}
                      onChange={() => setCreateRole('admin')}
                      style={{ marginRight: '6px' }}
                    />
                    <b style={{ color: '#8C6010', fontSize: '13px' }}>Administrator</b>
                    <p style={{ margin: '4px 0 0', fontSize: '11px', color: colors.ink3, lineHeight: 1.4 }}>
                      Akses penuh: kelola pengurus, ekspor data, visibilitas publik & privat.
                    </p>
                  </label>
                </div>
              </div>

              {/* Password */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 600, color: colors.ink }}>
                    Password Akun *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    style={{ fontSize: '11px', color: colors.seal, cursor: 'pointer' }}
                  >
                    {showCreatePassword ? 'Sembunyikan' : 'Lihat password'}
                  </button>
                </div>
                <input
                  type={showCreatePassword ? 'text' : 'password'}
                  required
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '13.5px',
                    borderRadius: '8px',
                    border: '1px solid #C3CFDC',
                    background: colors.card,
                    color: colors.ink,
                    outline: 'none',
                  }}
                />
              </div>

              {/* Password Confirmation */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: colors.ink, marginBottom: '6px' }}>
                  Konfirmasi Password *
                </label>
                <input
                  type={showCreatePassword ? 'text' : 'password'}
                  required
                  value={createPasswordConfirm}
                  onChange={(e) => setCreatePasswordConfirm(e.target.value)}
                  placeholder="Ulangi password di atas"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '13.5px',
                    borderRadius: '8px',
                    border: '1px solid #C3CFDC',
                    background: colors.card,
                    color: colors.ink,
                    outline: 'none',
                  }}
                />
              </div>

              {/* Is Active Toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: colors.ink, cursor: 'pointer', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  checked={createIsActive}
                  onChange={(e) => setCreateIsActive(e.target.checked)}
                />
                <span>Akun langsung aktif dan dapat digunakan untuk login</span>
              </label>

              {/* Actions Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={submitting}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid #C3CFDC',
                    background: colors.card,
                    color: colors.ink2,
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background: colors.seal,
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? 'Menyimpan…' : 'Simpan Pengurus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT PENGURUS                                                    */}
      {/* ========================================================================= */}
      {editingUser && (
        <div
          role="presentation"
          onClick={() => setEditingUser(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 30,
            display: 'grid',
            placeItems: 'center',
            padding: '16px',
            background: 'rgba(12, 28, 48, 0.65)',
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-edit-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '500px',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: colors.card,
              border: `1px solid ${colors.rule}`,
              borderRadius: '14px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <span style={{
                  fontSize: '10.5px',
                  fontFamily: fonts.mono,
                  letterSpacing: '.06em',
                  textTransform: 'uppercase',
                  color: colors.seal,
                  fontWeight: 600,
                }}>
                  Perbarui Profil
                </span>
                <h3 id="modal-edit-title" style={{
                  margin: '4px 0 0',
                  color: colors.ink,
                  fontFamily: fonts.display,
                  fontSize: '19px',
                  fontWeight: 700,
                }}>
                  Edit Data Pengurus
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                style={{ fontSize: '22px', color: colors.ink3, lineHeight: 1, padding: '4px', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            {actionError && (
              <div style={{
                padding: '10px 14px',
                marginBottom: '16px',
                borderRadius: '8px',
                background: 'rgba(150, 56, 44, 0.08)',
                border: `1px solid ${colors.status.ditolak}`,
                color: colors.status.ditolak,
                fontSize: '12.5px',
              }}>
                {actionError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: colors.ink, marginBottom: '6px' }}>
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '13.5px',
                    borderRadius: '8px',
                    border: '1px solid #C3CFDC',
                    background: colors.card,
                    color: colors.ink,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: colors.ink, marginBottom: '6px' }}>
                  Alamat Email *
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '13.5px',
                    borderRadius: '8px',
                    border: '1px solid #C3CFDC',
                    background: colors.card,
                    color: colors.ink,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: colors.ink, marginBottom: '6px' }}>
                  Peran (Role) *
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  disabled={Boolean(currentUser && currentUser.id === editingUser.id)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: '1px solid #C3CFDC',
                    background: colors.card,
                    color: colors.ink,
                  }}
                >
                  <option value="moderator">Moderator (Peninjau tiket aspirasi)</option>
                  <option value="admin">Administrator (Akses penuh pengelolaan)</option>
                </select>
                {currentUser && currentUser.id === editingUser.id && (
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: colors.ink3 }}>
                    Peran akun Anda sendiri tidak dapat diturunkan demi keamanan.
                  </p>
                )}
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: colors.ink, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    disabled={Boolean(currentUser && currentUser.id === editingUser.id)}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                  />
                  <span>Status Akun Aktif</span>
                </label>
                {currentUser && currentUser.id === editingUser.id && (
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: colors.ink3 }}>
                    Anda tidak dapat menonaktifkan akun yang sedang aktif digunakan.
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  disabled={submitting}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid #C3CFDC',
                    background: colors.card,
                    color: colors.ink2,
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background: colors.seal,
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? 'Menyimpan…' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: GANTI / RESET PASSWORD                                           */}
      {/* ========================================================================= */}
      {passwordUser && (
        <div
          role="presentation"
          onClick={() => setPasswordUser(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 30,
            display: 'grid',
            placeItems: 'center',
            padding: '16px',
            background: 'rgba(12, 28, 48, 0.65)',
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-password-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '460px',
              background: colors.card,
              border: `1px solid ${colors.rule}`,
              borderRadius: '14px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{
                  fontSize: '10.5px',
                  fontFamily: fonts.mono,
                  letterSpacing: '.06em',
                  textTransform: 'uppercase',
                  color: colors.seal,
                  fontWeight: 600,
                }}>
                  Keamanan Akun
                </span>
                <h3 id="modal-password-title" style={{
                  margin: '4px 0 0',
                  color: colors.ink,
                  fontFamily: fonts.display,
                  fontSize: '18px',
                  fontWeight: 700,
                }}>
                  Ganti Password
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPasswordUser(null)}
                style={{ fontSize: '22px', color: colors.ink3, lineHeight: 1, padding: '4px', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <p style={{ margin: '0 0 16px', fontSize: '12.5px', color: colors.ink2 }}>
              Mengatur ulang kata sandi untuk akun <b>{passwordUser.nama}</b> ({passwordUser.email}).
            </p>

            {actionError && (
              <div style={{
                padding: '10px 14px',
                marginBottom: '16px',
                borderRadius: '8px',
                background: 'rgba(150, 56, 44, 0.08)',
                border: `1px solid ${colors.status.ditolak}`,
                color: colors.status.ditolak,
                fontSize: '12.5px',
              }}>
                {actionError}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} style={{ display: 'grid', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 600, color: colors.ink }}>
                    Password Baru *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{ fontSize: '11px', color: colors.seal, cursor: 'pointer' }}
                  >
                    {showNewPassword ? 'Sembunyikan' : 'Lihat'}
                  </button>
                </div>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '13.5px',
                    borderRadius: '8px',
                    border: '1px solid #C3CFDC',
                    background: colors.card,
                    color: colors.ink,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: colors.ink, marginBottom: '6px' }}>
                  Konfirmasi Password Baru *
                </label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  placeholder="Ulangi password baru"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '13.5px',
                    borderRadius: '8px',
                    border: '1px solid #C3CFDC',
                    background: colors.card,
                    color: colors.ink,
                  }}
                />
              </div>

              <p style={{ margin: 0, fontSize: '11.5px', color: colors.ink3, lineHeight: 1.4 }}>
                Catatan: Sesi login aktif pengguna ini pada perangkat lain akan otomatis diakhiri untuk keamanan.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setPasswordUser(null)}
                  disabled={submitting}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid #C3CFDC',
                    background: colors.card,
                    color: colors.ink2,
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background: colors.seal,
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? 'Memperbarui…' : 'Perbarui Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: KONFIRMASI HAPUS PENGURUS                                        */}
      {/* ========================================================================= */}
      {deletingUser && (
        <div
          role="presentation"
          onClick={() => setDeletingUser(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 30,
            display: 'grid',
            placeItems: 'center',
            padding: '16px',
            background: 'rgba(12, 28, 48, 0.65)',
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-delete-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '440px',
              background: colors.card,
              border: `1px solid ${colors.rule}`,
              borderRadius: '14px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              padding: '24px',
            }}
          >
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(150, 56, 44, 0.1)',
              color: colors.status.ditolak,
              display: 'grid',
              placeItems: 'center',
              fontSize: '20px',
              marginBottom: '14px',
            }}>
              ⚠️
            </div>

            <h3 id="modal-delete-title" style={{
              margin: '0 0 8px',
              color: colors.ink,
              fontFamily: fonts.display,
              fontSize: '18px',
              fontWeight: 700,
            }}>
              Hapus Akun Pengurus?
            </h3>

            <p style={{ margin: '0 0 16px', fontSize: '13px', color: colors.ink2, lineHeight: 1.5 }}>
              Apakah Anda yakin ingin menghapus akun <b>{deletingUser.nama}</b> ({deletingUser.email})? Tindakan ini tidak dapat dibatalkan.
            </p>

            {deletingUser.balasans_count && deletingUser.balasans_count > 0 ? (
              <div style={{
                padding: '10px 12px',
                borderRadius: '8px',
                background: '#FFF9EB',
                border: '1px solid #F5D386',
                color: '#8C6010',
                fontSize: '12px',
                marginBottom: '16px',
                lineHeight: 1.45,
              }}>
                <b>Peringatan Integritas:</b> Pengurus ini telah memiliki {deletingUser.balasans_count} riwayat balasan pada aspirasi mahasiswa. Anda disarankan untuk <b>menonaktifkan akun</b> daripada menghapusnya agar arsip balasan tetap utuh.
              </div>
            ) : null}

            {actionError && (
              <div style={{
                padding: '10px 14px',
                marginBottom: '16px',
                borderRadius: '8px',
                background: 'rgba(150, 56, 44, 0.08)',
                border: `1px solid ${colors.status.ditolak}`,
                color: colors.status.ditolak,
                fontSize: '12.5px',
              }}>
                {actionError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                disabled={submitting}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid #C3CFDC',
                  background: colors.card,
                  color: colors.ink2,
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={submitting}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  background: colors.status.ditolak,
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Menghapus…' : 'Ya, Hapus Pengurus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
