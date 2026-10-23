import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSupabase } from '../lib/supabase';
import type { Article } from '../types';

/** Bandeau « Infos en continu » : les 10 derniers articles publiés (données réelles). */
export function Ticker() {
  const [items, setItems] = useState<Article[]>([]);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let mounted = true;
    (async () => {
      const { data } = await sb
        .from('articles')
        .select('id,slug,title')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(10);
      if (mounted && data) setItems(data as Article[]);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (items.length === 0) return null;

  // On duplique la liste pour une boucle de défilement continue.
  const loop = [...items, ...items];
  return (
    <div className="ticker" role="marquee" aria-label="Informations en continu">
      <span className="ticker-label">En continu</span>
      <div className="ticker-track">
        <div className="ticker-inner">
          {loop.map((a, i) => (
            <span key={`${a.id}-${i}`}>
              <span className="dot" aria-hidden="true">
                ◆
              </span>
              <Link to={`/article/${a.slug}`}>{a.title}</Link>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
