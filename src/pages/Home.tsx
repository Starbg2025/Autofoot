import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { CATEGORIES } from '../lib/categories';
import type { Article } from '../types';
import { LeadCard, MiniCard, SecondaryCard } from '../components/ArticleCard';
import { Sidebar } from '../components/Sidebar';
import { EmptyState, NotConfigured } from '../components/EmptyState';

async function fetchPublished(limit: number, category?: string): Promise<Article[]> {
  const sb = getSupabase();
  if (!sb) return [];
  let q = sb
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit);
  if (category) q = q.eq('category', category);
  const { data } = await q;
  return (data ?? []) as Article[];
}

export function Home() {
  const [latest, setLatest] = useState<Article[]>([]);
  const [byCategory, setByCategory] = useState<Record<string, Article[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      const [headlines, ...cats] = await Promise.all([
        fetchPublished(7),
        ...CATEGORIES.map((c) => fetchPublished(4, c.slug)),
      ]);
      if (!mounted) return;
      setLatest(headlines);
      const map: Record<string, Article[]> = {};
      CATEGORIES.forEach((c, i) => {
        if (cats[i].length > 0) map[c.slug] = cats[i];
      });
      setByCategory(map);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <div className="container" style={{ paddingTop: 30 }}>
        <NotConfigured />
      </div>
    );
  }
  if (loading) return <p className="loading">Chargement de la une…</p>;

  const shown = new Set<string>();
  const lead = latest.find((a) => a.featured) ?? latest[0];
  if (lead) shown.add(lead.id);
  const secondary = latest.filter((a) => !shown.has(a.id)).slice(0, 2);
  secondary.forEach((a) => shown.add(a.id));
  const more = latest.filter((a) => !shown.has(a.id)).slice(0, 4);

  return (
    <div className="container">
      <div className="layout-2col" style={{ marginTop: 24 }}>
        <main>
          {lead ? (
            <>
              <LeadCard article={lead} />
              {secondary.length > 0 && (
                <div className="secondary-list">
                  {secondary.map((a) => (
                    <SecondaryCard key={a.id} article={a} />
                  ))}
                </div>
              )}
              {more.length > 0 && (
                <>
                  <div className="section-head">
                    <h2>Dernières nouvelles</h2>
                    <Link to="/recherche">Tout rechercher</Link>
                  </div>
                  <div className="grid-cards">
                    {more.map((a) => (
                      <MiniCard key={a.id} article={a} />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <EmptyState title="La une se prépare">
              Aucun article n’a encore été publié. Revenez bientôt : la rédaction
              est à l’œuvre.
            </EmptyState>
          )}

          {CATEGORIES.map(
            (c) =>
              byCategory[c.slug] && (
                <section key={c.slug} aria-label={c.name}>
                  <div className="section-head">
                    <h2>{c.name}</h2>
                    <Link to={`/rubrique/${c.slug}`}>Toute la rubrique</Link>
                  </div>
                  <div className="grid-cards">
                    {byCategory[c.slug].map((a) => (
                      <MiniCard key={a.id} article={a} />
                    ))}
                  </div>
                </section>
              ),
          )}
        </main>
        <Sidebar />
      </div>
    </div>
  );
}
