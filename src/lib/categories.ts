import type { Category } from '../types';
import { slugify } from './format';

/* Les 12 rubriques exactes du journal (reprises de l'ancien site — ALL_CATEGORIES). */
const NAMES = [
  'Actualités',
  'Politique',
  'Économie',
  'Société',
  'Sports',
  'Ligue 1 RDC',
  'Léopards',
  'Mercato',
  'Compétitions CAF',
  'Culture',
  'Technologie',
  'International',
];

export const CATEGORIES: Category[] = NAMES.map((name) => ({ slug: slugify(name), name }));

export function categoryName(slug: string): string {
  return CATEGORIES.find((c) => c.slug === slug)?.name ?? slug;
}

export function isValidCategory(slug: string): boolean {
  return CATEGORIES.some((c) => c.slug === slug);
}
