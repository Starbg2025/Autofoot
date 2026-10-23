import { useState } from 'react';
import { getSupabase } from '../lib/supabase';

/** Newsletter : inscription stockée en base. Aucun envoi réel n'est simulé. */
export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) {
      setStatus('error');
      setMessage('Service non configuré.');
      return;
    }
    const value = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setStatus('error');
      setMessage('Veuillez saisir une adresse e-mail valide.');
      return;
    }
    const { error } = await sb.from('newsletter_subscribers').insert({ email: value });
    if (error) {
      if (/duplicate|unique/i.test(error.message)) {
        setStatus('ok');
        setMessage('Cette adresse est déjà inscrite. Merci !');
      } else {
        setStatus('error');
        setMessage('Inscription impossible pour le moment. Réessayez plus tard.');
      }
      return;
    }
    setStatus('ok');
    setMessage('Merci ! Votre inscription à la lettre d’information est bien enregistrée.');
    setEmail('');
  };

  return (
    <section className="widget" aria-label="Lettre d'information">
      <h3>✉️ La lettre d’info</h3>
      <div className="widget-body">
        <p style={{ fontSize: '0.88rem', margin: '0 0 12px' }}>
          Recevez l’essentiel du football congolais dans votre boîte e-mail.
        </p>
        {status === 'ok' && <p className="form-ok">{message}</p>}
        {status === 'error' && <p className="form-error">{message}</p>}
        {status !== 'ok' && (
          <form onSubmit={(e) => void submit(e)}>
            <div className="field">
              <label htmlFor="newsletter-email">Adresse e-mail</label>
              <input
                id="newsletter-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                required
              />
            </div>
            <button className="btn" type="submit">
              S’inscrire
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
