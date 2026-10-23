import { Link } from 'react-router-dom';
import { categoryName } from '../lib/categories';
import { formatDateShortFr, formatViews, readingMinutes } from '../lib/format';
import type { Article } from '../types';

function Meta({ article }: { article: Article }) {
  return (
    <div className="meta">
      <span>{formatDateShortFr(article.published_at || article.created_at)}</span>
      {article.author_name && <span>Par {article.author_name}</span>}
      <span>{readingMinutes(article.body)} min de lecture</span>
      {article.views > 0 && <span>{formatViews(article.views)} lectures</span>}
    </div>
  );
}

function Thumb({ article, label }: { article: Article; label: string }) {
  return (
    <div className="thumb" role="img" aria-label={label}>
      {article.image_url ? (
        <img src={article.image_url} alt={article.title} loading="lazy" />
      ) : (
        <span>ActuFoot RDC</span>
      )}
    </div>
  );
}

/** Article principal de la Une. */
export function LeadCard({ article }: { article: Article }) {
  return (
    <article className="lead-story article-card">
      <span className="kicker">{categoryName(article.category)}</span>
      <Thumb article={article} label={article.title} />
      <h2>
        <Link to={`/article/${article.slug}`}>{article.title}</Link>
      </h2>
      {article.excerpt && <p className="chapeau">{article.excerpt}</p>}
      <Meta article={article} />
    </article>
  );
}

/** Article secondaire de la Une. */
export function SecondaryCard({ article }: { article: Article }) {
  return (
    <article className="article-card">
      <span className="kicker">{categoryName(article.category)}</span>
      <Thumb article={article} label={article.title} />
      <h3>
        <Link to={`/article/${article.slug}`}>{article.title}</Link>
      </h3>
      {article.excerpt && <p className="excerpt">{article.excerpt}</p>}
      <Meta article={article} />
    </article>
  );
}

/** Carte compacte (listes, rubriques, recherche, liés). */
export function MiniCard({ article }: { article: Article }) {
  return (
    <article className="mini-card article-card">
      <span className="kicker">{categoryName(article.category)}</span>
      <h4>
        <Link to={`/article/${article.slug}`}>{article.title}</Link>
      </h4>
      <Meta article={article} />
    </article>
  );
}
