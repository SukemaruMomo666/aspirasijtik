import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function SiteFooter() {
  const { isAuthenticated } = useAuth();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-top">
          <div className="site-footer-brand-lockup">
            <img className="site-footer-logo" src="/images/polsub.png" alt="Logo Politeknik Negeri Subang" width="48" height="48" />
            <div className="site-footer-brand-copy">
              <b>Aspirasi JTIK</b>
              <span>Jurusan Teknologi Informasi dan Komputer<br />Politeknik Negeri Subang</span>
            </div>
          </div>
          <div className="site-footer-invite">
            <div><b>Ada masukan untuk jurusan?</b><span>Sampaikan aspirasi dengan mudah melalui portal ini.</span></div>
            <Link to="/form" className="site-footer-cta">Kirim aspirasi <span aria-hidden="true">→</span></Link>
          </div>
        </div>

        <div className="site-footer-links">
          <div><b>Layanan</b><Link to="/form">Kirim aspirasi</Link><Link to="/status">Cek status tiket</Link><Link to="/publik">Aspirasi publik</Link></div>
          <div><b>Tentang JTIK</b><a href="https://jtik.polsub.ac.id/" target="_blank" rel="noreferrer">Website JTIK POLSUB <span aria-hidden="true">↗</span></a></div>
          <div><b>Pengurus</b><Link to={isAuthenticated ? '/admin/dashboard' : '/admin/login'}>{isAuthenticated ? 'Dashboard' : 'Masuk admin'}</Link></div>
        </div>

        <div className="site-footer-bottom">
          <span>© {new Date().getFullYear()} Aspirasi JTIK · Politeknik Negeri Subang</span>
          <span>Ruang untuk didengar dan bertumbuh bersama.</span>
        </div>
      </div>
    </footer>
  );
}
