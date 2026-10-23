import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      <p>{children}</p>
      {action}
    </div>
  );
}

export function NotConfigured() {
  return (
    <EmptyState title="Service non configuré">
      La connexion à la base de données n’est pas configurée sur cet environnement.
      <br />
      Renseignez les variables <code>VITE_SUPABASE_URL</code> et{' '}
      <code>VITE_SUPABASE_ANON_KEY</code>.
    </EmptyState>
  );
}

export function BackToHome() {
  return <Link to="/">← Retour à la une</Link>;
}
