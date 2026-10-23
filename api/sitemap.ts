/* Fonction serverless Vercel — Sitemap XML d'ActuFoot RDC.
   Servie sur /sitemap.xml via le rewrite de vercel.json.
   L'hôte est dérivé de la requête : aucun domaine codé en dur.
   Variables d'environnement requises : SUPABASE_URL, SUPABASE_ANON_KEY. */

const CATEGORY_SLUGS = [
  'actualites', 'politique', 'economie', 'societe', 'sports', 'ligue-1-rdc',
  'leopards', 'mercato', 'competitions-caf', 'culture', 'technologie', 'international',
];

const STATIC_PATHS = [
  '/', '/matchs', '/a-propos', '/equipe', '/contact',
  '/mentions-legales', '/confidentialite',
];

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default async function handler(req: any, res: any) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  const host =
    (req.headers['x-forwarded-host'] as string) || (req.headers['host'] as string) || '';
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const base = host ? `${proto}://${host}` : '';

  let slugs: { slug: string; published_at: string | null }[] = [];
  if (supabaseUrl && anonKey) {
    try {
      const r = await fetch(
        `${supabaseUrl}/rest/v1/articles?status=eq.published&order=published_at.desc&limit=500&select=slug,published_at`,
        { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } },
      );
      if (r.ok) slugs = (await r.json()) as typeof slugs;
    } catch {
      /* base inaccessible : sitemap statique uniquement */
    }
  }

  const urls: string[] = [
    ...STATIC_PATHS.map((p) => `  <url><loc>${escXml(base + p)}</loc><changefreq>daily</changefreq></url>`),
    ...CATEGORY_SLUGS.map(
      (c) => `  <url><loc>${escXml(`${base}/rubrique/${c}`)}</loc><changefreq>daily</changefreq></url>`,
    ),
    ...slugs.map(
      (a) =>
        `  <url><loc>${escXml(`${base}/article/${a.slug}`)}</loc>` +
        `${a.published_at ? `<lastmod>${new Date(a.published_at).toISOString().split('T')[0]}</lastmod>` : ''}</url>`,
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200).send(xml);
}
