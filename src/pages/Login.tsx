import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Connexion — Supabase Auth UNIQUEMENT.
 * Le mot de passe est vérifié côté serveur par Supabase (bcrypt).
 * Aucune session artisanale, aucun mot de passe stocké en clair, aucune
 * exception « super-admin » : tout le monde passe par le même contrôle.
 */
export function Login() {
  const { signIn, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      const from = (location.state as { from?: string } | null)?.from || '/';
      navigate(from, { replace: true });
    }
  }, [loading, user, location.state, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const { error: err } = await signIn(email, password);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    const from = (location.state as { from?: string } | null)?.from || '/';
    navigate(from, { replace: true });
  };

  return (
    <div className="container">
      <div className="form-card">
        <h1>Se connecter</h1>
        <p className="sub">Accédez à votre espace membre ActuFoot RDC.</p>
        {error && <p className="form-error">{error}</p>}
        <form onSubmit={(e) => void submit(e)}>
          <div className="field">
            <label htmlFor="login-email">Adresse e-mail</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="login-password">Mot de passe</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn" type="submit" disabled={busy} style={{ width: '100%' }}>
            {busy ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
        <p className="dateline" style={{ marginTop: 16 }}>
          Pas encore de compte ? <Link to="/inscription">Créez-en un gratuitement</Link>.
        </p>
      </div>
    </div>
  );
}
