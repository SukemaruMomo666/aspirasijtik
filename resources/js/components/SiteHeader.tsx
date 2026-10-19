import { Link } from 'react-router-dom';

type SiteHeaderProps = {
  active?: 'home' | 'form' | 'status' | 'public';
  showNavigation?: boolean;
};

export default function SiteHeader({ active, showNavigation = true }: SiteHeaderProps) {
  return (
    <>
      <a className="skip-link" href="#main-content">Lewati ke konten</a>
      <header className="site-masthead">
        <Link className="site-mark" to="/" aria-label="Beranda Aspirasi JTIK">
          <img src="/images/polsub.png" alt="" aria-hidden="true" width="48" height="48" />
        </Link>
        <div className="site-identity">
          <span>POLITEKNIK NEGERI SUBANG</span>
          <b>Teknologi Informasi dan Komputer</b>
        </div>
      </header>
      {showNavigation && (
        <nav className="site-nav" aria-label="Navigasi utama">
          <Link to="/form" aria-current={active === 'form' ? 'page' : undefined}>Kirim aspirasi</Link>
          <Link to="/status" aria-current={active === 'status' ? 'page' : undefined}>Cek status</Link>
          <Link to="/publik" aria-current={active === 'public' ? 'page' : undefined}>Aspirasi publik</Link>
        </nav>
      )}
    </>
  );
}
