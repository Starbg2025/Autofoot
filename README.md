# ActuFoot RDC — le journal du football congolais

Reconstruction complète du site sous forme de **journal de presse en ligne**
(React 18 + TypeScript + Vite, CSS éditorial sur mesure, Supabase).

## Mise en service — procédure exacte

### 1. Base de données : exécuter la migration SQL

1. Ouvrez votre projet Supabase → **SQL Editor** → **New query**.
2. Copiez-collez **tout** le contenu de `supabase/migrations/20261023_rls_hardening.sql`, puis **Run**.
3. Vérifiez : `select * from public.articles where status = 'published' order by published_at desc limit 5;`
   - Les anciennes publications de l'ancien site sont reprises automatiquement (slugs `import-…`).

Ce script :
- durcit les règles RLS (lecture publique des articles publiés ; écriture/modération réservées à la rédaction ; un membre ne voit/modifie que ses propres données) ;
- supprime les anciennes policies permissives `USING (true)` ;
- normalise la table `profiles` existante (rôles, colonnes `display_name` / `permissions`) ;
- crée les fonctions `promote_super_admin()`, `increment_article_views()`, `poll_results()`.

### 2. Variables d'environnement (Vercel)

Dans **Vercel → Project → Settings → Environment Variables**, renseignez (même projet Supabase que l'ancien site) :

| Variable | Usage |
|---|---|
| `VITE_SUPABASE_URL` | Front-end (ex. `https://xxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Front-end (clé **publique** anon) |
| `SUPABASE_URL` | Fonctions `/rss.xml` et `/sitemap.xml` (même valeur, sans préfixe `VITE_`) |
| `SUPABASE_ANON_KEY` | Idem (même clé publique) |

### 3. Premier compte administrateur

1. Sur le site, créez un compte via **S’inscrire** avec l’adresse `benit800@gmail.com`.
2. La fonction `promote_super_admin()` lui attribue automatiquement le rôle **super_admin** (vérification côté serveur, aucun mot de passe en clair, aucune exception client).
3. Connectez-vous : le lien **Administration** apparaît dans le bandeau supérieur.

> Authentification : **Supabase Auth uniquement**. Les mots de passe sont vérifiés
> côté serveur par Supabase (bcrypt). Il n’existe plus de session artisanale ni de
> connexion super-admin sans mot de passe (faille de l’ancien site, définitivement close).

### 4. Publier

- **Administration → Articles → ＋ Nouvel article** : titre, rubrique (les 12), chapeau, corps, image (URL), statut, mise à la une.
- **Matchs** : ajoutez les rencontres réelles (le Match Center reste honnêtement vide sinon — aucun match inventé).
- **Sondages** : un seul sondage actif à la fois, résultats réels.

## Développement local

```bash
npm install
cp .env.example .env   # puis renseignez vos valeurs
npm run dev            # http://localhost:5174
npm run build          # tsc + vite build
```

## Structure

- `src/pages/` — Une, Rubrique, Article, MatchCenter, Recherche, Connexion/Inscription, Espace membre, Admin, pages légales
- `src/components/` — Masthead, bandeau défilant, navigation, cartes, sidebar (Les plus lus / sondage / newsletter), commentaires, lecture audio
- `api/rss.ts`, `api/sitemap.ts` — fonctions serverless Vercel (hôte dérivé de la requête)
- `supabase/migrations/20261023_rls_hardening.sql` — schéma + RLS

## Règles du projet

- **Aucune donnée inventée** : tous les chiffres affichés viennent de Supabase ; états vides honnêtes.
- **Aucune fonctionnalité IA.**
- **Aucun domaine codé en dur** (RSS/sitemap dérivés de l’hôte).
- **Aucun secret dans le code** (tout passe par les variables d’environnement).
