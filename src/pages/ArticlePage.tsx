import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { categoryName } from '../lib/categories';
import { formatDateFr, readingMinutes } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import type { Article } from '../types';
import { MiniCard } from '../components/ArticleCard';
import { Sidebar } from '../components/Sidebar';
import { Comments } from '../components/Comments';
import { AudioButton } from '../components/AudioButton';
import { ShareButtons } from '../components/ShareButtons';
import { EmptyState, NotConfigured } from '../components/EmptyState';

export function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const { isStaff } = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [related, setRelated] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !slug) {
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      const { data } = await sb.from('articles').select('*').eq('slug', slug).maybeSingle();
      if (!mounted) return;
      const a = data as Article | null;
      if (!a || (a.status !== 'published' && !isStaff)) {
        setNotFound(true);
      } else {
        setArticle(a);
        // Compteur de vues réel (fonction sécurisée côté serveur).
        void sb.rpc('increment_article_views', { article_id: a.id });
        const { data: rel } = await sb
          .from('articles')
          .select('*')
          .eq('status', 'published')
          .eq('category', a.category)
          .neq('id', a.id)
          .order('published_at', { ascending: false })
          .limit(3);
        setRelated((rel ?? []) as Article[]);
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [slug, isStaff]);

  if (!isSupabaseConfigured) {
    return (
      <div className="container" style={{ paddingTop: 30 }}>
        <NotConfigured />
      </div>
    );
  }
  if (loading) return <p className="loading">Chargement de l’article…</p>;
  if (notFound || !article) {
    return (
      <div className="container" style={{ paddingTop: 30 }}>
        <EmptyState title="Article introuvable">
          Cet article n’existe pas ou n’est plus disponible.
        </EmptyState>
        <p style={{ marginTop: 16 }}>
          <Link to="/">← Retour à la une</Link>
        </p>
      </div>
    );
  }

  const paragraphs = article.body.split(/\n{2,}|\n/).filter((p) => p.trim().length > 0);

  return (
    <div className="container">
      <div className="layout-2col" style={{ marginTop: 24 }}>
        <main>
          <article className="article-page">
            <span className="kicker">
              <Link to={`/rubrique/${article.category}`} style={{ textDecoration: 'none' }}>
                {categoryName(article.category)}
              </Link>
            </span>
            <h1>{article.title}</h1>
            {article.excerpt && <p className="chapeau">{article.excerpt}</p>}
            <div className="byline">
              {article.author_name && (
                <span>
                  Par <strong>{article.author_name}</strong>
                </span>
              )}
              <span>{formatDateFr(article.published_at || article.created_at)}</span>
              <span>{readingMinutes(article.body)} min de lecture</span>
              <AudioButton title={article.title} excerpt={article.excerpt} body={article.body} />
            </div>
            {article.image_url && (
              <figure style={{ margin: '0 0 20px' }}>
                <img
                  src={article.image_url}
                  alt={article.title}
                  style={{ width: '100%', border: '1px solid var(--rule)' }}
                />
              </figure>
            )}
            <div className="article-body">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <ShareButtons title={article.title} />
          </article>

          {related.length > 0 && (
            <section aria-label="Articles liés">
              <div className="section-head">
                <h2>Dans la même rubrique</h2>
                <Link to={`/rubrique/${article.category}`}>Toute la rubrique</Link>
              </div>
              <div className="grid-cards">
                {related.map((a) => (
                  <MiniCard key={a.id} article={a} />
                ))}
              </div>
            </section>
          )}

          <Comments articleId={article.id} />
        </main>
        <Sidebar />
      </div>
    </div>
  );
}
