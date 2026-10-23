import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSupabase } from '../lib/supabase';
import { formatViews } from '../lib/format';
import type { Article } from '../types';
import { PollWidget } from './PollWidget';
import { NewsletterForm } from './NewsletterForm';

/** Les plus lus : classement réel par nombre de vues (données Supabase). */
function MostRead() {
  const [articles, setArticles] = useState<Article[]>([]);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let mounted = true;
    (async () => {
      const { data } = await sb
        .from('articles')
        .select('id,slug,title,views')
        .eq('status', 'published')
        .order('views', { ascending: false })
        .limit(5);
      if (mounted && data) setArticles(data as Article[]);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (articles.length === 0) return null;

  return (
    <section className="widget" aria-label="Les articles les plus lus">
      <h3>📈 Les plus lus</h3>
      <div className="widget-body">
        <ol className="ranked">
          {articles.map((a) => (
            <li key={a.id}>
              <div>
                <Link to={`/article/${a.slug}`}>{a.title}</Link>
                <span className="views">{formatViews(a.views)} lectures</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Colonne latérale">
      <MostRead />
      <PollWidget />
      <NewsletterForm />
    </aside>
  );
}
