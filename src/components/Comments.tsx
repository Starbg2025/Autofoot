import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { formatDateTimeFr } from '../lib/format';
import type { Comment } from '../types';
import { EmptyState } from './EmptyState';

/**
 * Commentaires d'un article.
 * - Visibles publiquement : uniquement les commentaires approuvés (données réelles).
 * - Un membre connecté peut commenter ; son commentaire part en modération.
 */
export function Comments({ articleId }: { articleId: string }) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');

  const load = async () => {
    const sb = getSupabase();
    if (!sb) return;
    const { data } = await sb
      .from('comments')
      .select('*')
      .eq('article_id', articleId)
      .eq('status', 'approved')
      .order('created_at', { ascending: true });
    setComments((data ?? []) as Comment[]);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb || !user) return;
    const text = body.trim();
    if (text.length < 2) {
      setNotice('Votre commentaire est trop court.');
      return;
    }
    setSending(true);
    setNotice('');
    const { error } = await sb.from('comments').insert({
      article_id: articleId,
      author_id: user.id,
      author_name: profile?.display_name || user.email?.split('@')[0] || 'Membre',
      body: text,
      status: 'pending',
    });
    setSending(false);
    if (error) {
      setNotice('Envoi impossible pour le moment. Réessayez plus tard.');
      return;
    }
    setBody('');
    setNotice('Merci ! Votre commentaire a été envoyé en modération et paraîtra après validation.');
  };

  return (
    <section aria-label="Commentaires" style={{ marginTop: 36 }}>
      <div className="section-head">
        <h2>Commentaires ({comments.length})</h2>
      </div>
      {comments.length === 0 ? (
        <EmptyState title="Aucun commentaire pour le moment">
          Soyez le premier à réagir à cet article.
        </EmptyState>
      ) : (
        comments.map((c) => (
          <div key={c.id} className="comment">
            <div className="comment-head">
              <strong>{c.author_name || 'Membre'}</strong>
              <span>{formatDateTimeFr(c.created_at)}</span>
            </div>
            <p>{c.body}</p>
          </div>
        ))
      )}

      <div style={{ marginTop: 20 }}>
        {user ? (
          <form onSubmit={(e) => void submit(e)}>
            <div className="field">
              <label htmlFor="comment-body">Ajouter un commentaire</label>
              <textarea
                id="comment-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Donnez votre avis, dans le respect des autres lecteurs…"
                maxLength={2000}
              />
            </div>
            {notice && <p className={notice.startsWith('Merci') ? 'form-ok' : 'form-error'}>{notice}</p>}
            <button className="btn" type="submit" disabled={sending || !isSupabaseConfigured}>
              {sending ? 'Envoi…' : 'Publier mon commentaire'}
            </button>
          </form>
        ) : (
          <p className="dateline">
            <Link to="/connexion">Connectez-vous</Link> ou{' '}
            <Link to="/inscription">créez un compte</Link> pour commenter.
          </p>
        )}
      </div>
    </section>
  );
}
