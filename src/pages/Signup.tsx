import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Inscription — Supabase Auth. Le mot de passe n'est jamais stocké par l'application. */
export function Signup() {
  const { signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true });
  }, [loading, user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (displayName.trim().length < 2) {
      setError('Veuillez indiquer un pseudonyme (2 caractères minimum).');
      return;
    }
    setBusy(true);
    const { error: err } = await signUp(email, password, displayName);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setDone(true);
  };

  return (
    <div className="container">
      <div className="form-card">
        <h1>Créer un compte</h1>
        <p className="sub">
          Commentez les articles et participez à la vie du journal. Gratuit, sans engagement.
        </p>
        {done ? (
          <p className="form-ok">
            Compte créé ! Si la confirmation par e-mail est activée, vérifiez votre boîte
            de réception puis <Link to="/connexion">connectez-vous</Link>.
          </p>
        ) : (
          <>
            {error && <p className="form-error">{error}</p>}
            <form onSubmit={(e) => void submit(e)}>
              <div className="field">
                <label htmlFor="signup-name">Pseudonyme</label>
                <input
                  id="signup-name"
                  type="text"
                  autoComplete="nickname"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ex. : LeopardsFan243"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="signup-email">Adresse e-mail</label>
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="signup-password">Mot de passe (6 caractères minimum)</label>
                <input
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              <button className="btn" type="submit" disabled={busy} style={{ width: '100%' }}>
                {busy ? 'Création…' : 'Créer mon compte'}
              </button>
            </form>
          </>
        )}
        <p className="dateline" style={{ marginTop: 16 }}>
          Déjà inscrit ? <Link to="/connexion">Connectez-vous</Link>.
        </p>
      </div>
    </div>
  );
}
