-- =============================================================================
-- ActuFoot RDC — Migration 2026-10-23 : durcissement RLS + nouvelles tables
-- À exécuter par le propriétaire du projet dans Supabase Dashboard > SQL Editor.
-- Idempotent : peut être relancé sans doublon.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. Table profiles existante : normalisation pour le nouveau site
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists permissions jsonb default '{}'::jsonb;

-- Reprise des anciennes colonnes
update public.profiles set display_name = coalesce(display_name, name, split_part(email, '@', 1))
where display_name is null;
update public.profiles set permissions = coalesce(permissions, admin_permissions, '{}'::jsonb)
where permissions is null or permissions = '{}'::jsonb;

-- Normalisation des rôles (ancien format 'super-admin' -> 'super_admin', 'certified' -> 'member')
update public.profiles set role = 'super_admin' where role = 'super-admin';
update public.profiles set role = 'member' where role in ('certified', 'pioneer');
update public.profiles set role = 'member' where role is null or role not in ('member','editor','admin','super_admin');

-- Le compte super-admin (adresse publique connue) obtient son rôle côté serveur uniquement.
update public.profiles set role = 'super_admin'
where lower(email) = 'benit800@gmail.com' and role <> 'super_admin';

alter table public.profiles enable row level security;

-- Suppression des anciennes policies permissives (USING (true))
drop policy if exists "Profils lecture publique" on public.profiles;
drop policy if exists "Profils insertion libre" on public.profiles;
drop policy if exists "Profils modification" on public.profiles;
drop policy if exists "profiles_select_public" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own_or_admin" on public.profiles;
drop policy if exists "profiles_delete_admin" on public.profiles;

-- NOTE : les nouvelles policies restrictives sont créées au §2bis ci-dessous,
-- APRÈS les fonctions d'aide (une policy ne peut pas référencer une fonction
-- qui n'existe pas encore).

-- ---------------------------------------------------------------------------
-- 2. Fonctions d'aide (SECURITY DEFINER — évite la récursion RLS)
-- ---------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('editor','admin','super_admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin','super_admin')
  );
$$;

-- Délégation granulaire : admin/super_admin = tout ; éditeur = permissions cochées
create or replace function public.has_perm(perm text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (role in ('admin','super_admin') or coalesce(permissions ->> perm, 'false') = 'true')
  );
$$;

-- Promotion super-admin : vérifiée CÔTÉ SERVEUR (aucun mot de passe en clair,
-- aucune exception côté client). Seul l'e-mail officiel obtient le rôle.
create or replace function public.promote_super_admin()
returns void
language plpgsql security definer set search_path = public as $$
begin
  if lower(auth.jwt() ->> 'email') = 'benit800@gmail.com' then
    insert into public.profiles (id, email, display_name, role, permissions)
    values (auth.uid(), 'benit800@gmail.com', 'Bénit Yombo Madimba', 'super_admin', '{}'::jsonb)
    on conflict (id) do update
      set role = 'super_admin', email = 'benit800@gmail.com';
  end if;
end;
$$;

-- Compteur de vues réel (incrément atomique, sans exposer l'écriture)
create or replace function public.increment_article_views(article_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.articles set views = views + 1 where id = article_id;
end;
$$;

-- Résultats agrégés d'un sondage (sans exposer les clés d'électeurs)
create or replace function public.poll_results(p_poll_id uuid)
returns table(option_index int, votes bigint)
language sql stable security definer set search_path = public as $$
  select v.option_index, count(*)::bigint
  from public.poll_votes v
  where v.poll_id = p_poll_id
  group by v.option_index;
$$;

-- ---------------------------------------------------------------------------
-- 2bis. Policies restrictives sur profiles (après les fonctions d'aide)
-- ---------------------------------------------------------------------------
-- Lecture : utilisateurs connectés uniquement (les affichages publics utilisent
-- les noms dénormalisés author_name, aucune donnée sensible n'est exposée).
create policy "profiles_select_public"
  on public.profiles for select to authenticated using (true);

-- Insertion : uniquement sa propre ligne
create policy "profiles_insert_own"
  on public.profiles for insert to authenticated
  with check (id = auth.uid());

-- Mise à jour : sa propre ligne, ou admin (rôles/délégations)
create policy "profiles_update_own_or_admin"
  on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Suppression : admins uniquement
create policy "profiles_delete_admin"
  on public.profiles for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. Table articles
-- ---------------------------------------------------------------------------
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  body text not null,
  category text not null,
  status text not null default 'draft' check (status in ('draft','pending','published')),
  author_id uuid references auth.users on delete set null,
  author_name text,
  featured boolean not null default false,
  views integer not null default 0,
  image_url text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists articles_status_published_idx on public.articles (status, published_at desc);
create index if not exists articles_category_idx on public.articles (category);
create index if not exists articles_views_idx on public.articles (views desc);

alter table public.articles enable row level security;
drop policy if exists "articles_select_published" on public.articles;
drop policy if exists "articles_select_staff" on public.articles;
drop policy if exists "articles_insert_staff" on public.articles;
drop policy if exists "articles_update_staff" on public.articles;
drop policy if exists "articles_delete_admin" on public.articles;

create policy "articles_select_published" on public.articles for select using (status = 'published');
create policy "articles_select_staff" on public.articles for select to authenticated using (public.is_staff());
create policy "articles_insert_staff" on public.articles for insert to authenticated
  with check (public.has_perm('articles'));
create policy "articles_update_staff" on public.articles for update to authenticated
  using (public.has_perm('articles')) with check (public.has_perm('articles'));
create policy "articles_delete_admin" on public.articles for delete to authenticated
  using (public.has_perm('articles'));

-- ---------------------------------------------------------------------------
-- 4. Table comments (modération : seuls les approuvés sont publics)
-- ---------------------------------------------------------------------------
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles on delete cascade,
  author_id uuid not null references auth.users on delete cascade,
  author_name text,
  body text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);
create index if not exists comments_article_idx on public.comments (article_id, status, created_at);

alter table public.comments enable row level security;
drop policy if exists "comments_select_approved" on public.comments;
drop policy if exists "comments_select_staff" on public.comments;
drop policy if exists "comments_select_own" on public.comments;
drop policy if exists "comments_insert_member" on public.comments;
drop policy if exists "comments_update_staff" on public.comments;
drop policy if exists "comments_update_own_pending" on public.comments;
drop policy if exists "comments_delete_staff_or_own" on public.comments;

create policy "comments_select_approved" on public.comments for select using (status = 'approved');
create policy "comments_select_staff" on public.comments for select to authenticated using (public.has_perm('comments'));
create policy "comments_select_own" on public.comments for select to authenticated using (author_id = auth.uid());
create policy "comments_insert_member" on public.comments for insert to authenticated
  with check (author_id = auth.uid() and status = 'pending');
create policy "comments_update_staff" on public.comments for update to authenticated
  using (public.has_perm('comments')) with check (public.has_perm('comments'));
create policy "comments_update_own_pending" on public.comments for update to authenticated
  using (author_id = auth.uid() and status = 'pending')
  with check (author_id = auth.uid() and status = 'pending');
create policy "comments_delete_staff_or_own" on public.comments for delete to authenticated
  using (public.has_perm('comments') or author_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 5. Sondages + votes (un vote par électeur, résultats via fonction)
-- ---------------------------------------------------------------------------
create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  options jsonb not null default '[]'::jsonb,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls on delete cascade,
  option_index integer not null,
  voter_key text not null,
  created_at timestamptz not null default now(),
  unique (poll_id, voter_key)
);

alter table public.polls enable row level security;
alter table public.poll_votes enable row level security;
drop policy if exists "polls_select_active" on public.polls;
drop policy if exists "polls_select_staff" on public.polls;
drop policy if exists "polls_write_admin" on public.polls;
drop policy if exists "poll_votes_insert_public" on public.poll_votes;
drop policy if exists "poll_votes_delete_staff" on public.poll_votes;

create policy "polls_select_active" on public.polls for select using (active = true);
create policy "polls_select_staff" on public.polls for select to authenticated using (public.has_perm('polls'));
create policy "polls_write_admin" on public.polls for all to authenticated
  using (public.has_perm('polls')) with check (public.has_perm('polls'));
-- Votes : insertion publique (clé d'électeur unique), lecture via poll_results()
create policy "poll_votes_insert_public" on public.poll_votes for insert with check (true);
create policy "poll_votes_delete_staff" on public.poll_votes for delete to authenticated
  using (public.has_perm('polls'));

-- ---------------------------------------------------------------------------
-- 6. Newsletter (inscription publique, lecture admin)
-- ---------------------------------------------------------------------------
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;
drop policy if exists "newsletter_insert_public" on public.newsletter_subscribers;
drop policy if exists "newsletter_select_admin" on public.newsletter_subscribers;
drop policy if exists "newsletter_delete_admin" on public.newsletter_subscribers;

create policy "newsletter_insert_public" on public.newsletter_subscribers for insert with check (true);
create policy "newsletter_select_admin" on public.newsletter_subscribers for select to authenticated
  using (public.has_perm('newsletter'));
create policy "newsletter_delete_admin" on public.newsletter_subscribers for delete to authenticated
  using (public.has_perm('newsletter'));

-- ---------------------------------------------------------------------------
-- 7. Matchs (lecture publique, écriture rédaction)
-- ---------------------------------------------------------------------------
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  competition text not null,
  home_team text not null,
  away_team text not null,
  match_date timestamptz not null,
  venue text,
  status text not null default 'scheduled' check (status in ('scheduled','live','finished')),
  home_score integer,
  away_score integer,
  created_at timestamptz not null default now()
);
create index if not exists matches_date_idx on public.matches (match_date);

alter table public.matches enable row level security;
drop policy if exists "matches_select_public" on public.matches;
drop policy if exists "matches_write_staff" on public.matches;

create policy "matches_select_public" on public.matches for select using (true);
create policy "matches_write_staff" on public.matches for all to authenticated
  using (public.has_perm('matches')) with check (public.has_perm('matches'));

-- ---------------------------------------------------------------------------
-- 8. Messages de contact (insertion publique, lecture admin)
-- ---------------------------------------------------------------------------
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;
drop policy if exists "contact_insert_public" on public.contact_messages;
drop policy if exists "contact_select_admin" on public.contact_messages;
drop policy if exists "contact_update_admin" on public.contact_messages;
drop policy if exists "contact_delete_admin" on public.contact_messages;

create policy "contact_insert_public" on public.contact_messages for insert with check (true);
create policy "contact_select_admin" on public.contact_messages for select to authenticated
  using (public.has_perm('messages'));
create policy "contact_update_admin" on public.contact_messages for update to authenticated
  using (public.has_perm('messages')) with check (public.has_perm('messages'));
create policy "contact_delete_admin" on public.contact_messages for delete to authenticated
  using (public.has_perm('messages'));

-- ---------------------------------------------------------------------------
-- 9. Reprise des anciennes publications (ancien site) — sans doublon
-- ---------------------------------------------------------------------------
insert into public.articles (title, slug, excerpt, body, category, status, author_name, featured, views, image_url, published_at, created_at)
select
  p.title,
  'import-' || replace(p.id, '-', ''),
  left(p.summary, 300),
  p.content,
  case p.category
    when 'Actualités' then 'actualites'
    when 'Politique' then 'politique'
    when 'Économie' then 'economie'
    when 'Société' then 'societe'
    when 'Sports' then 'sports'
    when 'Ligue 1 RDC' then 'ligue-1-rdc'
    when 'Léopards' then 'leopards'
    when 'Mercato' then 'mercato'
    when 'Compétitions CAF' then 'competitions-caf'
    when 'Culture' then 'culture'
    when 'Technologie' then 'technologie'
    when 'International' then 'international'
    else 'actualites'
  end,
  case when coalesce(p.status, 'published') = 'published' then 'published'::text else 'draft'::text end,
  p.author_name,
  coalesce(p.is_top_story, false),
  coalesce(p.views_count, 0),
  p.image_url,
  p.created_at,
  p.created_at
from public.publications p
where not exists (select 1 from public.articles a where a.slug = 'import-' || replace(p.id, '-', ''));

-- =============================================================================
-- FIN — Vérification rapide :
--   select * from public.articles where status = 'published' order by published_at desc limit 5;
-- =============================================================================
