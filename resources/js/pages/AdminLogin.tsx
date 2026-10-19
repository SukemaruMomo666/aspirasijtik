import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { colors, fonts } from '../utils/designTokens';
import SiteHeader from '../components/SiteHeader';
import FeedbackPanel from '../components/FeedbackPanel';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login, isLoading, error, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email.trim() || !password.trim()) {
      setFormError('Email dan password harus diisi');
      return;
    }

    const success = await login(email, password);
    if (success) {
      navigate('/admin/dashboard');
    }
  };

  return (
    <div className="app-site admin-login-page" style={{
      backgroundColor: colors.paper,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <SiteHeader showNavigation={false} />

      {/* Main Content */}
      <main id="main-content" tabIndex={-1} style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '26px 18px',
      }}>
        <div className="admin-login-shell" style={{
          width: '100%',
          maxWidth: '320px',
        }}>
          {/* Logo Area */}
          <div className="admin-login-header" style={{
            textAlign: 'center',
            marginBottom: '28px',
          }}>
            <div style={{
              fontFamily: fonts.mono,
              fontSize: '9.5px',
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              color: colors.seal,
              marginBottom: '9px',
            }}>
              Panel Admin
            </div>
            <h1 className="admin-title" style={{
              fontFamily: fonts.display,
              fontWeight: 700,
              fontSize: '19px',
              letterSpacing: '-.02em',
              margin: '0 0 12px',
              color: colors.ink,
            }}>
              Aspirasi JTIK
            </h1>
          </div>

          {/* Login Card */}
          <div className="admin-login-card" style={{
            background: colors.card,
            border: `1px solid ${colors.rule}`,
            borderRadius: '12px',
            padding: '20px',
            boxShadow: `0 12px 30px -20px rgba(15,50,96,.35)`,
          }}>
            {/* Error Message */}
            {(formError || error) && <FeedbackPanel variant="error" title="Login belum berhasil" message={formError || error || ''} />}

            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="email" style={{
                  fontSize: '12.5px',
                  fontWeight: 600,
                  display: 'block',
                  marginBottom: '7px',
                  color: colors.ink,
                }}>
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  style={{
                    width: '100%',
                    background: colors.card,
                    border: `1px solid #C3CFDC`,
                    borderRadius: '8px',
                    padding: '11px 13px',
                    fontSize: '14px',
                    color: colors.ink,
                    transition: 'border-color .14s, box-shadow .14s',
                    fontFamily: fonts.sans,
                  }}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="password" style={{
                  fontSize: '12.5px',
                  fontWeight: 600,
                  display: 'block',
                  marginBottom: '7px',
                  color: colors.ink,
                }}>
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    background: colors.card,
                    border: `1px solid #C3CFDC`,
                    borderRadius: '8px',
                    padding: '11px 13px',
                    fontSize: '14px',
                    color: colors.ink,
                    transition: 'border-color .14s, box-shadow .14s',
                    fontFamily: fonts.sans,
                  }}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
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
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.5 : 1,
                }}
              >
                {isLoading ? 'Masuk...' : 'Masuk'}
              </button>
            </form>

            {/* Footer Link */}
            <div style={{
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: `1px solid ${colors.rule}`,
              textAlign: 'center',
            }}>
              <button
                onClick={() => navigate('/')}
                style={{
                  fontSize: '12.5px',
                  color: colors.seal,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textUnderlineOffset: '2px',
                }}
              >
                Kembali ke Beranda
              </button>
            </div>
          </div>

          {/* Help Text */}
          <p style={{
            marginTop: '20px',
            fontSize: '11.5px',
            color: colors.ink3,
            textAlign: 'center',
            margin: '20px 0 0',
          }}>
            Hubungi admin untuk mendapatkan akses
          </p>
        </div>
      </main>
    </div>
  );
}
