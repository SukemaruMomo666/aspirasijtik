export type StatusType = 'Diterima' | 'Diproses' | 'Selesai' | 'Ditolak';

export interface Kategori {
  id: number;
  nama: string;
}

export interface Aspirasi {
  id: number;
  kode_tiket: string;
  kategori_id: number;
  kategori?: Kategori;
  judul: string;
  isi: string;
  saran_pelapor?: string | null;
  tautan_pendukung?: string[];
  lampiran?: AspirasiAttachment[];
  nama: string | null;
  nim: string | null;
  is_anonim: boolean;
  status: StatusType;
  is_publik: boolean;
  is_privat: boolean;
  has_badwords: boolean;
  balasans?: Balasan[];
  audit_trails?: AuditTrail[];
  created_at: string;
  updated_at: string;
}

export interface AspirasiAttachment {
  name: string;
  mime_type: string;
  size: number;
}

export interface Balasan {
  id: number;
  aspirasi_id: number;
  admin_id: number;
  isi: string;
  lampiran?: BalasanAttachment[];
  admin?: Admin;
  created_at: string;
  updated_at: string;
}

export interface BalasanAttachment {
  name: string;
  mime_type: string;
  size: number;
}

export interface AuditTrail {
  id: number;
  aspirasi_id: number;
  admin_id: number | null;
  action: 'status_changed' | 'public_visibility_changed' | 'privacy_changed' | 'reply_sent';
  old_value: string | null;
  new_value: string | null;
  admin?: Admin | null;
  created_at: string;
}

export interface Admin {
  id: number;
  nama: string;
  email: string;
  is_active: boolean;
  role: 'admin' | 'moderator';
  last_login: string | null;
  created_at?: string;
  updated_at?: string;
  balasans_count?: number;
}

export interface UserManagementCounts {
  total: number;
  admin: number;
  moderator: number;
  active: number;
  inactive: number;
}

export interface UserListResponse {
  users: Admin[];
  counts: UserManagementCounts;
}

export interface LoginResponse {
  token: string;
  admin: Admin;
}

export interface AspirasiResponse {
  id: number;
  kode_tiket: string;
  kategori_id: number;
  judul: string;
  isi: string;
  nama: string | null;
  nim: string | null;
  is_anonim: boolean;
  status: StatusType;
  is_publik: boolean;
  is_privat: boolean;
  has_badwords: boolean;
  created_at: string;
}

export interface StatistikItem {
  kategori: string;
  jumlah: number;
  selesai: number;
  pending: number;
}

export interface StatistikBulan {
  bulan: string;
  total: number;
  by_status: Record<StatusType, number>;
}

export interface TiketMenunggu {
  id: number;
  kode_tiket: string;
  kategori: string;
  judul: string;
  status: StatusType;
  created_at: string;
}

export interface Statistik {
  total: number;
  by_kategori: StatistikItem[];
  by_status: Record<StatusType, number>;
  per_bulan: StatistikBulan[];
  oldest_pending: TiketMenunggu[];
}
