import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSupabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CATEGORIES, categoryName } from '../lib/categories';
import { formatDateShortFr, formatDateTimeFr, slugify } from '../lib/format';
import type {
  Article,
  ArticleStatus,
  Comment,
  ContactMessage,
  Match,
  MatchStatus,
  NewsletterSubscriber,
  Poll,
  Profile,
  UserRole,
} from '../types';
import { EmptyState } from '../components/EmptyState';

type Tab = 'articles' | 'comments' | 'members' | 'polls' | 'matches' | 'newsletter' | 'messages';

const TABS: { id: Tab; label: string; perm: string }[] = [
  { id: 'articles', label: 'Articles', perm: 'articles' },
  { id: 'comments', label: 'Commentaires', perm: 'comments' },
  { id: 'members', label: 'Membres', perm: 'members' },
  { id: 'polls', label: 'Sondages', perm: 'polls' },
  { id: 'matches', label: 'Matchs', perm: 'matches' },
  { id: 'newsletter', label: 'Newsletter', perm: 'newsletter' },
  { id: 'messages', label: 'Messages', perm: 'messages' },
];

function useTabState() {
  const [tab, setTab] = useState<Tab>('articles');
  return { tab, setTab };
}

/* ============================= ARTICLES ============================= */

const EMPTY_ARTICLE = {
  title: '',
  slug: '',
  category: CATEGORIES[0].slug,
  excerpt: '',
  body: '',
  image_url: '',
  featured: false,
  status: 'draft' as ArticleStatus,
};

function ArticleManager({ canPublish }: { canPublish: boolean }) {
  const { user, profile } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [editing, setEditing] = useState<(typeof EMPTY_ARTICLE & { id?: string }) | null>(null);
  const [notice, setNotice] = useState('');

  const load = async () => {
    const sb = getSupabase();
    if (!sb) return;
    const { data } = await sb.from('articles').select('*').order('created_at', { ascending: false }).limit(100);
    setArticles((data ?? []) as Article[]);
  };
  useEffect(() => {
    void load();
  }, []);

  const openNew = () => {
    setNotice('');
    setEditing({ ...EMPTY_ARTICLE });
  };
  const openEdit = (a: Article) => {
    setNotice('');
    setEditing({
      id: a.id,
      title: a.title,
      slug: a.slug,
      category: a.category,
      excerpt: a.excerpt || '',
      body: a.body,
      image_url: a.image_url || '',
      featured: a.featured,
      status: a.status,
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb || !editing || !user) return;
    setNotice('');
    const slug = editing.slug.trim() || slugify(editing.title);
    const status: ArticleStatus = !canPublish && editing.status === 'published' ? 'pending' : editing.status;
    const payload = {
      title: editing.title.trim(),
      slug,
      category: editing.category,
      excerpt: editing.excerpt.trim() || null,
      body: editing.body,
      image_url: editing.image_url.trim() || null,
      featured: editing.featured,
      status,
      author_id: user.id,
      author_name: profile?.display_name || user.email?.split('@')[0] || 'Rédaction',
      published_at: status === 'published' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    if (!payload.title || !payload.body) {
      setNotice('Le titre et le corps de l’article sont obligatoires.');
      return;
    }
    let error;
    if (editing.id) {
      ({ error } = await sb.from('articles').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await sb.from('articles').insert(payload));
    }
    if (error) {
      setNotice(`Enregistrement impossible : ${error.message}`);
      return;
    }
    setEditing(null);
    setNotice(editing.id ? 'Article mis à jour.' : 'Article créé.');
    void load();
  };

  const setStatus = async (a: Article, status: ArticleStatus) => {
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb
      .from('articles')
      .update({
        status,
        published_at: status === 'published' ? a.published_at || new Date().toISOString() : a.published_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', a.id);
    if (!error) void load();
  };

  const toggleFeatured = async (a: Article) => {
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb.from('articles').update({ featured: !a.featured }).eq('id', a.id);
    if (!error) void load();
  };

  const remove = async (a: Article) => {
    if (!window.confirm(`Supprimer définitivement « ${a.title} » ?`)) return;
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb.from('articles').delete().eq('id', a.id);
    if (!error) void load();
  };

  const statusBadge: Record<ArticleStatus, string> = {
    draft: 'Brouillon',
    pending: 'En relecture',
    published: 'Publié',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--serif-display)' }}>Articles ({articles.length})</h3>
        <button className="btn small" onClick={openNew}>
          ＋ Nouvel article
        </button>
      </div>
      {notice && <p className="form-ok">{notice}</p>}

      {editing && (
        <form onSubmit={(e) => void save(e)} style={{ border: '1px solid var(--rule)', padding: 18, marginBottom: 20, background: 'var(--card)' }}>
          <h4 style={{ margin: '0 0 12px', fontFamily: 'var(--serif-display)' }}>
            {editing.id ? 'Modifier l’article' : 'Nouvel article'}
          </h4>
          <div className="field">
            <label htmlFor="art-title">Titre</label>
            <input
              id="art-title"
              value={editing.title}
              onChange={(e) => {
                const title = e.target.value;
                setEditing({ ...editing, title, slug: editing.id ? editing.slug : slugify(title) });
              }}
              required
            />
          </div>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
            <div className="field">
              <label htmlFor="art-slug">Slug (URL)</label>
              <input id="art-slug" value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="art-cat">Rubrique</label>
              <select id="art-cat" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                {CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="art-excerpt">Chapeau (résumé)</label>
            <textarea id="art-excerpt" value={editing.excerpt} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} style={{ minHeight: 70 }} />
          </div>
          <div className="field">
            <label htmlFor="art-body">Corps de l’article (paragraphes séparés par une ligne vide)</label>
            <textarea id="art-body" value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} style={{ minHeight: 220 }} required />
          </div>
          <div className="field">
            <label htmlFor="art-img">URL de l’image (optionnel)</label>
            <input id="art-img" value={editing.image_url} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} placeholder="https://…" />
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="art-status">Statut</label>
              <select id="art-status" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as ArticleStatus })}>
                <option value="draft">Brouillon</option>
                <option value="pending">En relecture</option>
                {canPublish && <option value="published">Publié</option>}
              </select>
            </div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.88rem', fontWeight: 600 }}>
              <input type="checkbox" checked={editing.featured} onChange={(e) => setEditing({ ...editing, featured: e.target.checked })} />
              À la une
            </label>
          </div>
          {!canPublish && (
            <p className="dateline">Votre rôle ne permet pas la publication directe : l’article partira en relecture.</p>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" type="submit">
              Enregistrer
            </button>
            <button className="btn secondary" type="button" onClick={() => setEditing(null)}>
              Annuler
            </button>
          </div>
        </form>
      )}

      {articles.length === 0 ? (
        <EmptyState title="Aucun article">Créez le premier article du journal avec le bouton ci-dessus.</EmptyState>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Titre</th>
                <th>Rubrique</th>
                <th>Statut</th>
                <th>Vues</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.title}</strong>
                    {a.featured && <span className="badge" style={{ marginLeft: 8 }}>À la une</span>}
                    <br />
                    <span className="dateline">{formatDateShortFr(a.created_at)}</span>
                  </td>
                  <td>{categoryName(a.category)}</td>
                  <td>
                    <span className={`badge ${a.status === 'published' ? 'approved' : a.status === 'pending' ? 'pending' : ''}`}>
                      {statusBadge[a.status]}
                    </span>
                  </td>
                  <td>{a.views}</td>
                  <td>
                    <div className="admin-row-actions">
                      <button className="btn secondary small" onClick={() => openEdit(a)}>
                        Modifier
                      </button>
                      {canPublish && a.status !== 'published' && (
                        <button className="btn small" onClick={() => void setStatus(a, 'published')}>
                          Publier
                        </button>
                      )}
                      {canPublish && a.status === 'published' && (
                        <button className="btn secondary small" onClick={() => void setStatus(a, 'draft')}>
                          Dépublier
                        </button>
                      )}
                      {canPublish && (
                        <button className="btn secondary small" onClick={() => void toggleFeatured(a)}>
                          {a.featured ? 'Retirer la une' : 'Mettre à la une'}
                        </button>
                      )}
                      <button className="btn danger small" onClick={() => void remove(a)}>
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* =========================== COMMENTAIRES =========================== */

function CommentManager() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  const load = async () => {
    const sb = getSupabase();
    if (!sb) return;
    let q = sb.from('comments').select('*').order('created_at', { ascending: false }).limit(100);
    if (filter !== 'all') q = q.eq('status', filter);
    const { data } = await q;
    setComments((data ?? []) as Comment[]);
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const setStatus = async (c: Comment, status: 'approved' | 'rejected') => {
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb.from('comments').update({ status }).eq('id', c.id);
    if (!error) void load();
  };
  const remove = async (c: Comment) => {
    if (!window.confirm('Supprimer ce commentaire ?')) return;
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb.from('comments').delete().eq('id', c.id);
    if (!error) void load();
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
          <button key={f} className={`btn small ${filter === f ? '' : 'secondary'}`} onClick={() => setFilter(f)}>
            {f === 'pending' ? 'En attente' : f === 'approved' ? 'Approuvés' : f === 'rejected' ? 'Refusés' : 'Tous'}
          </button>
        ))}
      </div>
      {comments.length === 0 ? (
        <EmptyState title="Aucun commentaire">Rien à modérer pour ce filtre.</EmptyState>
      ) : (
        comments.map((c) => (
          <div key={c.id} className="comment">
            <div className="comment-head">
              <strong>{c.author_name || 'Membre'}</strong>
              <span>{formatDateTimeFr(c.created_at)}</span>
              <span className={`badge ${c.status}`}>
                {c.status === 'pending' ? 'En attente' : c.status === 'approved' ? 'Approuvé' : 'Refusé'}
              </span>
            </div>
            <p>{c.body}</p>
            <div className="admin-row-actions" style={{ marginTop: 8 }}>
              {c.status !== 'approved' && (
                <button className="btn small" onClick={() => void setStatus(c, 'approved')}>
                  Approuver
                </button>
              )}
              {c.status !== 'rejected' && (
                <button className="btn secondary small" onClick={() => void setStatus(c, 'rejected')}>
                  Refuser
                </button>
              )}
              <button className="btn danger small" onClick={() => void remove(c)}>
                Supprimer
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/* ============================= MEMBRES ============================= */

const PERM_LABELS: Record<string, string> = {
  articles: 'Articles',
  comments: 'Commentaires',
  polls: 'Sondages',
  matches: 'Matchs',
  newsletter: 'Newsletter',
  messages: 'Messages',
};

function MemberManager() {
  const { isSuperAdmin, role } = useAuth();
  const [members, setMembers] = useState<Profile[]>([]);
  const [notice, setNotice] = useState('');

  const load = async () => {
    const sb = getSupabase();
    if (!sb) return;
    const { data } = await sb.from('profiles').select('*').order('created_at', { ascending: false }).limit(200);
    setMembers((data ?? []) as Profile[]);
  };
  useEffect(() => {
    void load();
  }, []);

  const updateMember = async (m: Profile, patch: Partial<Profile>) => {
    const sb = getSupabase();
    if (!sb) return;
    setNotice('');
    const { error } = await sb.from('profiles').update(patch).eq('id', m.id);
    if (error) {
      setNotice(`Mise à jour impossible : ${error.message}`);
      return;
    }
    setNotice('Membre mis à jour.');
    void load();
  };

  const roleLabel: Record<UserRole, string> = {
    member: 'Membre',
    editor: 'Rédacteur',
    admin: 'Administrateur',
    super_admin: 'Super-admin',
  };

  return (
    <div>
      <h3 style={{ fontFamily: 'var(--serif-display)', marginTop: 0 }}>Membres ({members.length})</h3>
      {notice && <p className="form-ok">{notice}</p>}
      <p className="dateline">
        Seul le super-administrateur peut nommer des administrateurs.
        {role === 'admin' && ' En tant qu’administrateur, vous pouvez nommer des rédacteurs.'}
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Membre</th>
              <th>Rôle</th>
              <th>Délégations (rédacteurs)</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>
                  <strong>{m.display_name}</strong>
                  <br />
                  <span className="dateline">{m.email}</span>
                </td>
                <td>
                  <select
                    value={m.role}
                    disabled={m.role === 'super_admin' && !isSuperAdmin}
                    onChange={(e) => {
                      const r = e.target.value as UserRole;
                      if ((r === 'admin' || r === 'super_admin') && !isSuperAdmin) {
                        setNotice('Seul le super-administrateur peut attribuer ce rôle.');
                        return;
                      }
                      void updateMember(m, { role: r });
                    }}
                    aria-label={`Rôle de ${m.display_name}`}
                  >
                    <option value="member">{roleLabel.member}</option>
                    <option value="editor">{roleLabel.editor}</option>
                    <option value="admin">{roleLabel.admin}</option>
                    {isSuperAdmin && <option value="super_admin">{roleLabel.super_admin}</option>}
                  </select>
                </td>
                <td>
                  {m.role === 'editor' ? (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {Object.entries(PERM_LABELS).map(([perm, label]) => (
                        <label key={perm} style={{ fontSize: '0.8rem', display: 'flex', gap: 4, alignItems: 'center' }}>
                          <input
                            type="checkbox"
                            checked={m.permissions?.[perm] === true}
                            onChange={(e) =>
                              void updateMember(m, {
                                permissions: { ...(m.permissions || {}), [perm]: e.target.checked },
                              })
                            }
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <span className="dateline">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================= SONDAGES ============================= */

function PollManager() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [results, setResults] = useState<Record<string, number[]>>({});
  const [question, setQuestion] = useState('');
  const [optionsText, setOptionsText] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    const sb = getSupabase();
    if (!sb) return;
    const { data } = await sb.from('polls').select('*').order('created_at', { ascending: false }).limit(20);
    const list = (data ?? []) as Poll[];
    setPolls(list);
    const res: Record<string, number[]> = {};
    for (const p of list) {
      const { data: votes } = await sb.rpc('poll_results', { p_poll_id: p.id });
      const counts: number[] = [];
      ((votes ?? []) as { option_index: number; votes: number }[]).forEach((v) => {
        counts[v.option_index] = Number(v.votes) || 0;
      });
      res[p.id] = counts;
    }
    setResults(res);
  };
  useEffect(() => {
    void load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return;
    const options = optionsText.split('\n').map((o) => o.trim()).filter(Boolean);
    if (question.trim().length < 4 || options.length < 2) {
      setNotice('Indiquez une question et au moins deux options (une par ligne).');
      return;
    }
    // Désactiver les anciens sondages : un seul sondage actif à la fois.
    await sb.from('polls').update({ active: false }).eq('active', true);
    const { error } = await sb.from('polls').insert({ question: question.trim(), options, active: true });
    if (error) {
      setNotice(`Création impossible : ${error.message}`);
      return;
    }
    setQuestion('');
    setOptionsText('');
    setNotice('Sondage publié.');
    void load();
  };

  const toggleActive = async (p: Poll) => {
    const sb = getSupabase();
    if (!sb) return;
    if (!p.active) await sb.from('polls').update({ active: false }).eq('active', true);
    await sb.from('polls').update({ active: !p.active }).eq('id', p.id);
    void load();
  };
  const remove = async (p: Poll) => {
    if (!window.confirm('Supprimer ce sondage et ses votes ?')) return;
    const sb = getSupabase();
    if (!sb) return;
    await sb.from('poll_votes').delete().eq('poll_id', p.id);
    await sb.from('polls').delete().eq('id', p.id);
    void load();
  };

  return (
    <div>
      <h3 style={{ fontFamily: 'var(--serif-display)', marginTop: 0 }}>Sondages</h3>
      {notice && <p className="form-ok">{notice}</p>}
      <form onSubmit={(e) => void create(e)} style={{ border: '1px solid var(--rule)', padding: 18, marginBottom: 20, background: 'var(--card)' }}>
        <div className="field">
          <label htmlFor="poll-q">Question</label>
          <input id="poll-q" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ex. : Qui sera champion cette saison ?" />
        </div>
        <div className="field">
          <label htmlFor="poll-opts">Options (une par ligne)</label>
          <textarea id="poll-opts" value={optionsText} onChange={(e) => setOptionsText(e.target.value)} style={{ minHeight: 90 }} placeholder={'TP Mazembe\nAS Vita Club\nDCMP'} />
        </div>
        <button className="btn" type="submit">
          Publier le sondage
        </button>
      </form>
      {polls.map((p) => {
        const counts = results[p.id] || [];
        const total = counts.reduce((a, b) => a + b, 0);
        return (
          <div key={p.id} className="comment">
            <div className="comment-head">
              <strong>{p.question}</strong>
              {p.active ? <span className="badge approved">Actif</span> : <span className="badge">Inactif</span>}
              <span>{formatDateShortFr(p.created_at)}</span>
            </div>
            {p.options.map((opt, i) => {
              const n = counts[i] || 0;
              const pct = total > 0 ? Math.round((n / total) * 100) : 0;
              return (
                <div key={i} className="poll-result">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                    <span>{opt}</span>
                    <span className="pct">{pct} % ({n})</span>
                  </div>
                  <div className="poll-bar">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            <div className="admin-row-actions" style={{ marginTop: 8 }}>
              <button className="btn secondary small" onClick={() => void toggleActive(p)}>
                {p.active ? 'Désactiver' : 'Activer'}
              </button>
              <button className="btn danger small" onClick={() => void remove(p)}>
                Supprimer
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================= MATCHS ============================= */

const EMPTY_MATCH = {
  competition: '',
  home_team: '',
  away_team: '',
  match_date: '',
  venue: '',
  status: 'scheduled' as MatchStatus,
  home_score: '',
  away_score: '',
};

function MatchManager() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [form, setForm] = useState(EMPTY_MATCH);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const load = async () => {
    const sb = getSupabase();
    if (!sb) return;
    const { data } = await sb.from('matches').select('*').order('match_date', { ascending: false }).limit(60);
    setMatches((data ?? []) as Match[]);
  };
  useEffect(() => {
    void load();
  }, []);

  const openEdit = (m: Match) => {
    setEditingId(m.id);
    const d = new Date(m.match_date);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setForm({
      competition: m.competition,
      home_team: m.home_team,
      away_team: m.away_team,
      match_date: local,
      venue: m.venue || '',
      status: m.status,
      home_score: m.home_score !== null ? String(m.home_score) : '',
      away_score: m.away_score !== null ? String(m.away_score) : '',
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return;
    if (!form.competition.trim() || !form.home_team.trim() || !form.away_team.trim() || !form.match_date) {
      setNotice('Compétition, équipes et date sont obligatoires.');
      return;
    }
    const payload = {
      competition: form.competition.trim(),
      home_team: form.home_team.trim(),
      away_team: form.away_team.trim(),
      match_date: new Date(form.match_date).toISOString(),
      venue: form.venue.trim() || null,
      status: form.status,
      home_score: form.home_score === '' ? null : Number(form.home_score),
      away_score: form.away_score === '' ? null : Number(form.away_score),
    };
    let error;
    if (editingId) {
      ({ error } = await sb.from('matches').update(payload).eq('id', editingId));
    } else {
      ({ error } = await sb.from('matches').insert(payload));
    }
    if (error) {
      setNotice(`Enregistrement impossible : ${error.message}`);
      return;
    }
    setForm(EMPTY_MATCH);
    setEditingId(null);
    setNotice('Match enregistré.');
    void load();
  };

  const remove = async (m: Match) => {
    if (!window.confirm(`Supprimer ${m.home_team} — ${m.away_team} ?`)) return;
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb.from('matches').delete().eq('id', m.id);
    if (!error) void load();
  };

  return (
    <div>
      <h3 style={{ fontFamily: 'var(--serif-display)', marginTop: 0 }}>Matchs</h3>
      {notice && <p className="form-ok">{notice}</p>}
      <form onSubmit={(e) => void save(e)} style={{ border: '1px solid var(--rule)', padding: 18, marginBottom: 20, background: 'var(--card)' }}>
        <h4 style={{ margin: '0 0 12px', fontFamily: 'var(--serif-display)' }}>
          {editingId ? 'Modifier le match' : 'Ajouter un match'}
        </h4>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
          <div className="field">
            <label htmlFor="m-comp">Compétition</label>
            <input id="m-comp" value={form.competition} onChange={(e) => setForm({ ...form, competition: e.target.value })} placeholder="Ex. : Ligue 1 RDC" />
          </div>
          <div className="field">
            <label htmlFor="m-date">Date et heure</label>
            <input id="m-date" type="datetime-local" value={form.match_date} onChange={(e) => setForm({ ...form, match_date: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="m-home">Équipe domicile</label>
            <input id="m-home" value={form.home_team} onChange={(e) => setForm({ ...form, home_team: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="m-away">Équipe extérieur</label>
            <input id="m-away" value={form.away_team} onChange={(e) => setForm({ ...form, away_team: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="m-venue">Stade (optionnel)</label>
            <input id="m-venue" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="m-status">Statut</label>
            <select id="m-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as MatchStatus })}>
              <option value="scheduled">Programmé</option>
              <option value="live">En direct</option>
              <option value="finished">Terminé</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="m-hs">Score domicile</label>
            <input id="m-hs" type="number" min={0} value={form.home_score} onChange={(e) => setForm({ ...form, home_score: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="m-as">Score extérieur</label>
            <input id="m-as" type="number" min={0} value={form.away_score} onChange={(e) => setForm({ ...form, away_score: e.target.value })} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" type="submit">
            Enregistrer
          </button>
          {editingId && (
            <button className="btn secondary" type="button" onClick={() => { setEditingId(null); setForm(EMPTY_MATCH); }}>
              Annuler
            </button>
          )}
        </div>
      </form>
      {matches.length === 0 ? (
        <EmptyState title="Aucun match">Ajoutez les rencontres suivies par la rédaction.</EmptyState>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Rencontre</th>
                <th>Date</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => (
                <tr key={m.id}>
                  <td>
                    <strong>{m.home_team} — {m.away_team}</strong>
                    <br />
                    <span className="dateline">{m.competition}</span>
                  </td>
                  <td>{formatDateTimeFr(m.match_date)}</td>
                  <td>
                    <span className="badge">
                      {m.status === 'scheduled' ? 'Programmé' : m.status === 'live' ? 'En direct' : 'Terminé'}
                      {m.status !== 'scheduled' && m.home_score !== null && ` · ${m.home_score}–${m.away_score}`}
                    </span>
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <button className="btn secondary small" onClick={() => openEdit(m)}>
                        Modifier
                      </button>
                      <button className="btn danger small" onClick={() => void remove(m)}>
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ==================== NEWSLETTER & MESSAGES ==================== */

function NewsletterManager() {
  const [subs, setSubs] = useState<NewsletterSubscriber[]>([]);
  const load = async () => {
    const sb = getSupabase();
    if (!sb) return;
    const { data } = await sb.from('newsletter_subscribers').select('*').order('created_at', { ascending: false }).limit(500);
    setSubs((data ?? []) as NewsletterSubscriber[]);
  };
  useEffect(() => {
    void load();
  }, []);
  const remove = async (s: NewsletterSubscriber) => {
    if (!window.confirm(`Retirer ${s.email} ?`)) return;
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb.from('newsletter_subscribers').delete().eq('id', s.id);
    if (!error) void load();
  };
  return (
    <div>
      <h3 style={{ fontFamily: 'var(--serif-display)', marginTop: 0 }}>Newsletter ({subs.length} inscrits)</h3>
      {subs.length === 0 ? (
        <EmptyState title="Aucun inscrit">Les inscriptions à la lettre d’information apparaîtront ici.</EmptyState>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>E-mail</th>
                <th>Inscrit le</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id}>
                  <td>{s.email}</td>
                  <td>{formatDateShortFr(s.created_at)}</td>
                  <td>
                    <button className="btn danger small" onClick={() => void remove(s)}>
                      Retirer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MessageManager() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const load = async () => {
    const sb = getSupabase();
    if (!sb) return;
    const { data } = await sb.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(100);
    setMessages((data ?? []) as ContactMessage[]);
  };
  useEffect(() => {
    void load();
  }, []);
  const markRead = async (m: ContactMessage, read: boolean) => {
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb.from('contact_messages').update({ read }).eq('id', m.id);
    if (!error) void load();
  };
  const remove = async (m: ContactMessage) => {
    if (!window.confirm('Supprimer ce message ?')) return;
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb.from('contact_messages').delete().eq('id', m.id);
    if (!error) void load();
  };
  return (
    <div>
      <h3 style={{ fontFamily: 'var(--serif-display)', marginTop: 0 }}>Messages ({messages.length})</h3>
      {messages.length === 0 ? (
        <EmptyState title="Aucun message">Les messages du formulaire de contact apparaîtront ici.</EmptyState>
      ) : (
        messages.map((m) => (
          <div key={m.id} className="comment">
            <div className="comment-head">
              <strong>{m.name}</strong>
              <span>{m.email}</span>
              <span>{formatDateTimeFr(m.created_at)}</span>
              {!m.read && <span className="badge pending">Non lu</span>}
            </div>
            <p style={{ fontWeight: 700, marginBottom: 4 }}>{m.subject}</p>
            <p>{m.body}</p>
            <div className="admin-row-actions" style={{ marginTop: 8 }}>
              <button className="btn secondary small" onClick={() => void markRead(m, !m.read)}>
                {m.read ? 'Marquer non lu' : 'Marquer lu'}
              </button>
              <button className="btn danger small" onClick={() => void remove(m)}>
                Supprimer
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/* ============================== PAGE ============================== */

export function Admin() {
  const { can, role } = useAuth();
  const { tab, setTab } = useTabState();
  const visibleTabs = TABS.filter((t) => can(t.perm));

  return (
    <div className="container">
      <div className="page-head">
        <span className="kicker">Administration</span>
        <h1>Panneau de rédaction</h1>
        <p className="sub">
          Rôle :{' '}
          {role === 'super_admin' ? 'Super-administrateur' : role === 'admin' ? 'Administrateur' : 'Rédacteur'} —{' '}
          <Link to="/">voir le site</Link>
        </p>
      </div>

      {visibleTabs.length === 0 ? (
        <EmptyState title="Accès restreint">Votre rôle ne donne accès à aucune section pour le moment.</EmptyState>
      ) : (
        <>
          <div className="admin-tabs" role="tablist">
            {visibleTabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={tab === t.id ? 'active' : ''}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tab === 'articles' && can('articles') && <ArticleManager canPublish={role === 'admin' || role === 'super_admin'} />}
          {tab === 'comments' && can('comments') && <CommentManager />}
          {tab === 'members' && can('members') && <MemberManager />}
          {tab === 'polls' && can('polls') && <PollManager />}
          {tab === 'matches' && can('matches') && <MatchManager />}
          {tab === 'newsletter' && can('newsletter') && <NewsletterManager />}
          {tab === 'messages' && can('messages') && <MessageManager />}
        </>
      )}
    </div>
  );
}
