import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { categoryName, isValidCategory } from '../lib/categories';
import type { Article } from '../types';
import { MiniCard } from '../components/ArticleCard';
import { Sidebar } from '../components/Sidebar';
import { EmptyState, NotConfigured } from '../components/EmptyState';

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  const valid = slug ? isValidCategory(slug) : false;

  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !valid || !slug) {
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      const { data } = await sb
        .from('articles')
        .select('*')
        .eq('status', 'published')
        .eq('category', slug)
        .order('published_at', { ascending: false })
        .limit(30);
      if (mounted) {
        setArticles((data ?? []) as Article[]);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [slug, valid]);

  if (!valid) {
    return (
      <div className="container" style={{ paddingTop: 30 }}>
        <EmptyState title="Rubrique inconnue">Cette rubrique n’existe pas.</EmptyState>
        <p style={{ marginTop: 16 }}>
          <Link to="/">← Retour à la une</Link>
        </p>
      </div>
    );
  }
  if (!isSupabaseConfigured) {
    return (
      <div className="container" style={{ paddingTop: 30 }}>
        <NotConfigured />
      </div>
    );
  }
  if (loading) return <p className="loading">Chargement de la rubrique…</p>;

  return (
    <div className="container">
      <div className="layout-2col" style={{ marginTop: 0 }}>
        <main>
          <div className="page-head">
            <span className="kicker">Rubrique</span>
            <h1>{categoryName(slug as string)}</h1>
            <p className="sub">
              {articles.length === 0
                ? 'Aucun article pour le moment'
                : `${articles.length} article${articles.length > 1 ? 's' : ''}`}
            </p>
          </div>
          {articles.length === 0 ? (
            <EmptyState title="Aucun article dans cette rubrique">
              La rédaction n’a pas encore publié d’article ici. Revenez bientôt.
            </EmptyState>
          ) : (
            <div className="grid-cards">
              {articles.map((a) => (
                <MiniCard key={a.id} article={a} />
              ))}
            </div>
          )}
        </main>
        <Sidebar />
      </div>
    </div>
  );
}
