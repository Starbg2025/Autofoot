/* Fonction serverless Vercel — Flux RSS d'ActuFoot RDC.
   Servie sur /rss.xml via le rewrite de vercel.json.
   L'hôte est dérivé de la requête : aucun domaine codé en dur.
   Variables d'environnement requises : SUPABASE_URL, SUPABASE_ANON_KEY. */

function escXml(s: string | null | undefined): string {
  return (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

interface RssArticle {
  title: string;
  slug: string;
  excerpt: string | null;
  published_at: string | null;
  author_name: string | null;
}

export default async function handler(req: any, res: any) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    res.status(500).send('Flux RSS non configuré (variables SUPABASE_URL / SUPABASE_ANON_KEY manquantes).');
    return;
  }

  const host =
    (req.headers['x-forwarded-host'] as string) || (req.headers['host'] as string) || '';
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const base = host ? `${proto}://${host}` : '';

  let articles: RssArticle[] = [];
  try {
    const r = await fetch(
      `${supabaseUrl}/rest/v1/articles?status=eq.published&order=published_at.desc&limit=30&select=title,slug,excerpt,published_at,author_name`,
      { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } },
    );
    if (r.ok) articles = (await r.json()) as RssArticle[];
  } catch {
    /* base inaccessible : flux vide mais valide */
  }

  const items = articles
    .map(
      (a) => `    <item>
      <title>${escXml(a.title)}</title>
      <link>${escXml(base)}/article/${escXml(a.slug)}</link>
      <guid>${escXml(base)}/article/${escXml(a.slug)}</guid>
      <description>${escXml(a.excerpt)}</description>
      ${a.published_at ? `<pubDate>${new Date(a.published_at).toUTCString()}</pubDate>` : ''}
      ${a.author_name ? `<author>${escXml(a.author_name)}</author>` : ''}
    </item>`,
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>ActuFoot RDC — Le journal du football congolais</title>
    <link>${escXml(base)}/</link>
    <description>Toute l’actualité du football de la RDC, en continu.</description>
    <language>fr</language>
${items}
  </channel>
</rss>`;

  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=600');
  res.status(200).send(xml);
}
