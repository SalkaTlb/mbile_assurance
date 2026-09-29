import { ar } from './ar';
import { fr } from './fr';
import { Language, TranslationSchema } from './types';
export type { Language };

export const translations: Record<Language, TranslationSchema> = {
  fr,
  ar,
};

export function getLanguage(lang?: string): Language {
  return lang === 'ar' ? 'ar' : 'fr';
}

export function isArabic(lang?: string): boolean {
  return getLanguage(lang) === 'ar';
}
