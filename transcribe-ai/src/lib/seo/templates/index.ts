// Content templates index
import { ContentTemplate, Locale } from '../types';
import { catalan } from './ca';
import { spanish } from './es';
import { english } from './en';

export const templates: Record<Locale, ContentTemplate> = {
  ca: catalan,
  es: spanish,
  en: english,
};

export function getTemplate(locale: Locale): ContentTemplate {
  return templates[locale] || templates.es; // Fallback to Spanish
}

export { catalan, spanish, english };
