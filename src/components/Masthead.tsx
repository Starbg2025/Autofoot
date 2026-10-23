import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SITE_MOTTO, SITE_TAGLINE } from '../lib/constants';
import { todayFr } from '../lib/format';

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('actufoot-theme', theme);
    } catch {
      /* stockage indisponible : on ignore */
    }
  }, [theme]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('actufoot-theme');
      if (saved === 'dark' || saved === 'light') setTheme(saved);
    } catch {
      /* ignore */
    }
  }, []);
  return { theme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) };
}

export function TopBar() {
  const { user, profile, signOut, isStaff } = useAuth();
  const { theme, toggle } = useTheme();
  return (
    <div className="topbar">
      <div className="container">
        <span className="edition">{SITE_TAGLINE} — Édition du jour</span>
        <div className="topbar-actions">
          <button className="theme-toggle" onClick={toggle} aria-label="Basculer le mode sombre">
            {theme === 'dark' ? '☀️ Clair' : '🌙 Sombre'}
          </button>
          {user ? (
            <>
              <Link to="/membre" className="link-btn" style={{ textDecoration: 'none' }}>
                {profile?.display_name || 'Mon espace'}
              </Link>
              {isStaff && (
                <Link to="/admin" className="link-btn" style={{ textDecoration: 'none' }}>
                  Administration
                </Link>
              )}
              <button className="link-btn" onClick={() => void signOut()}>
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link to="/connexion" className="link-btn" style={{ textDecoration: 'none' }}>
                Se connecter
              </Link>
              <Link to="/inscription" className="link-btn" style={{ textDecoration: 'none' }}>
                S’inscrire
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function Masthead() {
  return (
    <header className="masthead">
      <p className="motto" style={{ margin: '0 0 6px' }}>
        <span className="dateline">{todayFr()}</span>
      </p>
      <h1 className="brand">
        <Link to="/">
          ActuFoot <span className="rdc">RDC</span>
        </Link>
      </h1>
      <p className="motto">{SITE_MOTTO}</p>
      <div className="dateline-row">
        <span>Kinshasa, République démocratique du Congo</span>
        <span aria-hidden="true">•</span>
        <span>Quotidien d’information sportive</span>
      </div>
    </header>
  );
}
