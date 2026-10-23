/* Types partagés — ActuFoot RDC */

export type ArticleStatus = 'draft' | 'pending' | 'published';
export type CommentStatus = 'pending' | 'approved' | 'rejected';
export type UserRole = 'member' | 'editor' | 'admin' | 'super_admin';
export type MatchStatus = 'scheduled' | 'live' | 'finished';

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  category: string; // slug de rubrique
  status: ArticleStatus;
  author_id: string | null;
  author_name: string | null; // dénormalisé pour lecture publique
  featured: boolean;
  views: number;
  image_url: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  article_id: string;
  author_id: string;
  author_name: string | null; // dénormalisé pour lecture publique
  body: string;
  status: CommentStatus;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  permissions: Record<string, boolean>;
  created_at: string;
}

export interface Poll {
  id: string;
  question: string;
  options: string[];
  active: boolean;
  created_at: string;
}

export interface PollVote {
  id: string;
  poll_id: string;
  option_index: number;
  voter_key: string;
  created_at: string;
}

export interface Match {
  id: string;
  competition: string;
  home_team: string;
  away_team: string;
  match_date: string;
  venue: string | null;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  created_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  created_at: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  body: string;
  read: boolean;
  created_at: string;
}

export interface Category {
  slug: string;
  name: string;
}
