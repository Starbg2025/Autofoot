import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import type { Article } from '../types';
import { MiniCard } from '../components/ArticleCard';
import { Sidebar } from '../components/Sidebar';
import { EmptyState, NotConfigured } from '../components/EmptyState';

export function SearchPage() {
  const [params] = useSearchParams();
  const q = (params.get('q') || '').trim();
  const [results, setResults] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !q) {
      setLoading(false);
      setResults([]);
      return;
    }
    let mounted = true;
    setLoading(true);
    (async () => {
      const like = `%${q}%`;
      const { data } = await sb
        .from('articles')
        .select('*')
        .eq('status', 'published')
        .or(`title.ilike.${like},excerpt.ilike.${like},body.ilike.${like}`)
        .order('published_at', { ascending: false })
        .limit(30);
      if (mounted) {
        setResults((data ?? []) as Article[]);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [q]);

  return (
    <div className="container">
      <div className="layout-2col">
        <main>
          <div className="page-head">
            <span className="kicker">Recherche</span>
            <h1>{q ? `« ${q} »` : 'Rechercher'}</h1>
            {!loading && q && (
              <p className="sub">
                {results.length === 0
                  ? 'Aucun résultat'
                  : `${results.length} résultat${results.length > 1 ? 's' : ''}`}
              </p>
            )}
          </div>
          {!isSupabaseConfigured ? (
            <NotConfigured />
          ) : loading ? (
            <p className="loading">Recherche en cours…</p>
          ) : !q ? (
            <EmptyState title="Que cherchez-vous ?">
              Saisissez un mot-clé dans la barre de recherche en haut de page.
            </EmptyState>
          ) : results.length === 0 ? (
            <EmptyState title="Aucun article trouvé">
              Essayez un autre mot-clé, par exemple « Léopards », « Mercato » ou « Ligue 1 ».
            </EmptyState>
          ) : (
            <div className="grid-cards">
              {results.map((a) => (
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
