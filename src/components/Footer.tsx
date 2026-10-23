import { Link } from 'react-router-dom';
import { CATEGORIES } from '../lib/categories';
import { DIRECTEUR_PUBLICATION, SITE_TAGLINE } from '../lib/constants';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <p className="brand">
              ActuFoot <span className="rdc">RDC</span>
            </p>
            <p>{SITE_TAGLINE}.</p>
            <p>
              Directeur de la Publication : <strong>{DIRECTEUR_PUBLICATION}</strong>
            </p>
          </div>
          <div>
            <h4>Rubriques</h4>
            <ul>
              {CATEGORIES.slice(0, 6).map((c) => (
                <li key={c.slug}>
                  <Link to={`/rubrique/${c.slug}`}>{c.name}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Le journal</h4>
            <ul>
              <li>
                <Link to="/a-propos">À propos</Link>
              </li>
              <li>
                <Link to="/equipe">Notre équipe</Link>
              </li>
              <li>
                <Link to="/contact">Contact</Link>
              </li>
              <li>
                <Link to="/matchs">Match Center</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>Informations légales</h4>
            <ul>
              <li>
                <Link to="/mentions-legales">Mentions légales</Link>
              </li>
              <li>
                <Link to="/confidentialite">Politique de confidentialité</Link>
              </li>
              <li>
                <Link to="/rss.xml">Flux RSS</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {year} ActuFoot RDC — Tous droits réservés.</span>
          <span>Fait avec rigueur à Kinshasa 🇨🇩</span>
        </div>
      </div>
    </footer>
  );
}
