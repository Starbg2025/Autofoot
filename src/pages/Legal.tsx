import { useState } from 'react';
import { getSupabase } from '../lib/supabase';
import { DIRECTEUR_PUBLICATION, SITE_NAME, SITE_TAGLINE } from '../lib/constants';

function PageShell({ kicker, title, sub, children }: { kicker: string; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="container">
      <div className="page-head">
        <span className="kicker">{kicker}</span>
        <h1>{title}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      <div className="prose" style={{ maxWidth: 760 }}>
        {children}
      </div>
    </div>
  );
}

export function About() {
  return (
    <PageShell kicker="Le journal" title="À propos" sub={SITE_TAGLINE}>
      <p>
        <strong>{SITE_NAME}</strong> est un journal en ligne consacré au football en
        République démocratique du Congo : l’actualité des Léopards, du championnat
        national, du mercato, des compétitions africaines et du football international
        vu depuis Kinshasa.
      </p>
      <p>
        Notre ligne éditoriale est simple : des faits vérifiés, des sources citées,
        aucun contenu inventé. Les scores, les calendriers et les statistiques publiés
        sur ce site proviennent de données réelles collectées par la rédaction.
      </p>
      <p>
        Le journal est dirigé par <strong>{DIRECTEUR_PUBLICATION}</strong>, Directeur
        de la Publication.
      </p>
    </PageShell>
  );
}

export function Team() {
  return (
    <PageShell kicker="Le journal" title="Notre équipe" sub="La rédaction d’ActuFoot RDC">
      <h2>Direction</h2>
      <p>
        <strong>{DIRECTEUR_PUBLICATION}</strong>
        <br />
        Directeur de la Publication
      </p>
      <h2>L’équipe</h2>
      <p>
        ActuFoot RDC est aujourd’hui porté par une seule personne : son Directeur de
        la Publication, qui assure la rédaction, la modération et la publication des
        contenus.
      </p>
      <p>
        <em>
          Conformément à notre charte, aucun membre fictif n’est présenté sur cette
          page : l’équipe affichée est l’équipe réelle.
        </em>
      </p>
    </PageShell>
  );
}

export function MentionsLegales() {
  return (
    <PageShell kicker="Informations légales" title="Mentions légales">
      <h2>Éditeur du site</h2>
      <p>
        {SITE_NAME} — Directeur de la Publication : <strong>{DIRECTEUR_PUBLICATION}</strong>.
      </p>
      <h2>Contenus</h2>
      <p>
        Les articles publiés sur ce site sont rédigés par la rédaction d’{SITE_NAME}.
        Toute reproduction, même partielle, est interdite sans autorisation préalable.
      </p>
      <h2>Commentaires</h2>
      <p>
        Les commentaires sont modérés avant publication. Tout propos injurieux,
        diffamatoire ou contraire à la loi sera refusé.
      </p>
      <h2>Données personnelles</h2>
      <p>
        Voir notre <a href="/confidentialite">politique de confidentialité</a>.
      </p>
    </PageShell>
  );
}

export function Confidentialite() {
  return (
    <PageShell kicker="Informations légales" title="Politique de confidentialité">
      <h2>Données collectées</h2>
      <p>
        Lors de votre inscription, nous collectons votre adresse e-mail et le
        pseudonyme que vous choisissez. Votre mot de passe est chiffré par notre
        prestataire d’authentification et n’est jamais visible par la rédaction.
      </p>
      <h2>Utilisation</h2>
      <p>
        Vos données servent uniquement à faire fonctionner votre compte (connexion,
        commentaires, votes aux sondages) et, si vous y souscrivez, à vous envoyer la
        lettre d’information. Elles ne sont ni vendues ni cédées à des tiers.
      </p>
      <h2>Vos droits</h2>
      <p>
        Vous pouvez demander la modification ou la suppression de vos données à tout
        moment via la page <a href="/contact">Contact</a>.
      </p>
      <h2>Cookies</h2>
      <p>
        Ce site utilise le stockage local de votre navigateur uniquement pour des
        fonctions techniques (session de connexion, préférence de thème, identifiant
        de vote anonyme). Aucun traceur publicitaire n’est employé.
      </p>
    </PageShell>
  );
}

export function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
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
    const { error } = await sb.from('contact_messages').insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      body: body.trim(),
    });
    if (error) {
      setStatus('error');
      setMessage('Envoi impossible pour le moment. Réessayez plus tard.');
      return;
    }
    setStatus('ok');
    setMessage('Merci ! Votre message a bien été transmis à la rédaction.');
    setName('');
    setEmail('');
    setSubject('');
    setBody('');
  };

  return (
    <div className="container">
      <div className="page-head">
        <span className="kicker">Le journal</span>
        <h1>Contact</h1>
        <p className="sub">Une information, une correction, une question ? Écrivez à la rédaction.</p>
      </div>
      <div className="form-card" style={{ margin: '0 0 30px' }}>
        {status === 'ok' && <p className="form-ok">{message}</p>}
        {status === 'error' && <p className="form-error">{message}</p>}
        {status !== 'ok' && (
          <form onSubmit={(e) => void submit(e)}>
            <div className="field">
              <label htmlFor="contact-name">Votre nom</label>
              <input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="contact-email">Votre e-mail</label>
              <input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="contact-subject">Objet</label>
              <input
                id="contact-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="contact-body">Message</label>
              <textarea id="contact-body" value={body} onChange={(e) => setBody(e.target.value)} required />
            </div>
            <button className="btn" type="submit">
              Envoyer le message
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 40, textAlign: 'center' }}>
      <p className="kicker">Erreur 404</p>
      <h1 style={{ fontFamily: 'var(--serif-display)', fontSize: '2.4rem' }}>Page introuvable</h1>
      <p className="dateline">La page que vous cherchez n’existe pas ou a été déplacée.</p>
      <p style={{ marginTop: 20 }}>
        <a href="/" className="btn">
          Retour à la une
        </a>
      </p>
    </div>
  );
}
