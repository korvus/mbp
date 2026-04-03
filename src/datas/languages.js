import fr from './fr.json';
import en from './en.json';
import es from './es.json';
import de from './de.json';
import sl from './sl.json';
import it from './it.json';
import uk from './uk.json';

export const dictionaryList = { fr, en, es, de, sl, it, uk };

export const languageOptions = {
  fr: 'FR',
  en: 'EN',
  es: 'ES',
  de: 'DE',
  sl: 'SL',
  it: 'IT',
  uk: 'UA'
};

export const LANGUAGE_FALLBACK = 'fr';
export const LANGUAGE_ALIASES = {
  si: 'sl'
};
export const supportedLanguages = Object.keys(languageOptions);

export function normalizeLanguage(value) {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase();
  const aliased = LANGUAGE_ALIASES[normalized] || normalized;
  return languageOptions[aliased] ? aliased : null;
}

export function getLanguageSegments(pathname = '/') {
  const segments = pathname.split('/').filter(Boolean);
  const rawLanguage = segments[0] ? segments[0].toLowerCase() : null;
  const normalizedLanguage = normalizeLanguage(rawLanguage);
  const hasLanguageInPath = Boolean(rawLanguage && normalizedLanguage);
  const rest = hasLanguageInPath ? segments.slice(1) : segments;

  return {
    rawLanguage,
    normalizedLanguage,
    hasLanguageInPath,
    isAlias: hasLanguageInPath && rawLanguage !== normalizedLanguage,
    rest
  };
}

export function getBrowserLanguage() {
  if (typeof window === 'undefined' || !window.navigator) {
    return LANGUAGE_FALLBACK;
  }

  const candidates = [
    window.navigator.language,
    ...(Array.isArray(window.navigator.languages) ? window.navigator.languages : [])
  ];

  for (const candidate of candidates) {
    const normalized = normalizeLanguage(String(candidate || '').substring(0, 2));
    if (normalized) {
      return normalized;
    }
  }

  return LANGUAGE_FALLBACK;
}

export function buildLanguagePath(language, pathname = '/') {
  const normalized = normalizeLanguage(language) || LANGUAGE_FALLBACK;
  const { rest } = getLanguageSegments(pathname);
  const suffix = rest.length ? `/${rest.join('/')}` : '';
  return `/${normalized}${suffix}`;
}

export function getPreferredLanguage(pathname = '/') {
  const pathState = getLanguageSegments(pathname);
  if (pathState.hasLanguageInPath) {
    return pathState.normalizedLanguage;
  }

  return getBrowserLanguage();
}

export function getLocalizedUrl(language, pathname = '/', origin = 'https://bestbaguettes.200.work') {
  return `${origin}${buildLanguagePath(language, pathname)}`;
}
