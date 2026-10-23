import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSupabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatDateTimeFr } from '../lib/format';
import type { Comment } from '../types';
import { EmptyState } from '../components/EmptyState';

/** Espace membre : profil, rôle, mes commentaires et leur statut de modération. */
export function MemberSpace() {
  const { user, profile, signOut, isStaff } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !user) {
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      const { data } = await sb
        .from('comments')
        .select('*')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);
      if (mounted) {
        setComments((data ?? []) as Comment[]);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  const statusLabel: Record<string, string> = {
    pending: 'En modération',
    approved: 'Publié',
    rejected: 'Refusé',
  };

  return (
    <div className="container">
      <div className="page-head">
        <span className="kicker">Espace membre</span>
        <h1>{profile?.display_name || 'Mon espace'}</h1>
        <p className="sub">{user?.email}</p>
      </div>

      <div className="layout-2col">
        <main>
          <div className="section-head">
            <h2>Mes commentaires</h2>
          </div>
          {loading ? (
            <p className="loading">Chargement…</p>
          ) : comments.length === 0 ? (
            <EmptyState title="Aucun commentaire">
              Vous n’avez pas encore commenté d’article.
            </EmptyState>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="comment">
                <div className="comment-head">
                  <span className={`badge ${c.status}`}>{statusLabel[c.status]}</span>
                  <span>{formatDateTimeFr(c.created_at)}</span>
                </div>
                <p>{c.body}</p>
              </div>
            ))
          )}
        </main>
        <aside className="sidebar">
          <section className="widget" aria-label="Mon compte">
            <h3>👤 Mon compte</h3>
            <div className="widget-body">
              <p style={{ margin: '0 0 6px' }}>
                <strong>{profile?.display_name}</strong>
              </p>
              <p className="dateline" style={{ margin: '0 0 12px' }}>
                {user?.email}
                <br />
                Rôle :{' '}
                {profile?.role === 'super_admin'
                  ? 'Super-administrateur'
                  : profile?.role === 'admin'
                    ? 'Administrateur'
                    : profile?.role === 'editor'
                      ? 'Rédacteur'
                      : 'Membre'}
              </p>
              {isStaff && (
                <p>
                  <Link to="/admin" className="btn small">
                    Panneau d’administration
                  </Link>
                </p>
              )}
              <button className="btn secondary small" onClick={() => void signOut()}>
                Se déconnecter
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
