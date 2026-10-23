import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { CATEGORIES } from '../lib/categories';

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      navigate(`/recherche?q=${encodeURIComponent(q)}`);
      setOpen(false);
    }
  };

  return (
    <nav className="mainnav" aria-label="Navigation principale">
      <div className="container">
        <button
          className="burger"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
        >
          <span aria-hidden="true">{open ? '✕' : '☰'}</span> Rubriques
        </button>
        <ul className="nav-links">
          <li>
            <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
              À la une
            </NavLink>
          </li>
          {CATEGORIES.map((c) => (
            <li key={c.slug}>
              <NavLink
                to={`/rubrique/${c.slug}`}
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                {c.name}
              </NavLink>
            </li>
          ))}
          <li>
            <NavLink to="/matchs" className={({ isActive }) => (isActive ? 'active' : '')}>
              Match Center
            </NavLink>
          </li>
        </ul>
        <form className="nav-search" onSubmit={submitSearch} role="search">
          <label className="sr-only" htmlFor="nav-search-input">
            Rechercher
          </label>
          <input
            id="nav-search-input"
            type="search"
            placeholder="Rechercher…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>
      </div>
      {open && (
        <div className="container mobile-menu">
          <Link to="/" onClick={() => setOpen(false)}>
            À la une
          </Link>
          {CATEGORIES.map((c) => (
            <Link key={c.slug} to={`/rubrique/${c.slug}`} onClick={() => setOpen(false)}>
              {c.name}
            </Link>
          ))}
          <Link to="/matchs" onClick={() => setOpen(false)}>
            Match Center
          </Link>
        </div>
      )}
    </nav>
  );
}
