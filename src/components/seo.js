import React, { useContext, useEffect } from 'react';
import { PinContext } from '../store';
import { buildLanguagePath, languageOptions } from '../datas/languages';

const SITE_ORIGIN = 'https://bestbaguettes.200.work';
const SITE_IMAGE = `${SITE_ORIGIN}/website.png`;
const OG_LOCALES = {
  fr: 'fr_FR',
  en: 'en_US',
  es: 'es_ES',
  de: 'de_DE',
  sl: 'sl_SI',
  it: 'it_IT',
  uk: 'uk_UA'
};

function upsertMeta(attribute, key, content) {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

function upsertLink(selector, attributes) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('link');
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
}

function syncLocaleAlternates(currentLanguage) {
  document.head
    .querySelectorAll('meta[property="og:locale:alternate"]')
    .forEach((element) => element.remove());

  Object.entries(OG_LOCALES)
    .filter(([language]) => language !== currentLanguage)
    .forEach(([, locale]) => {
      const element = document.createElement('meta');
      element.setAttribute('property', 'og:locale:alternate');
      element.setAttribute('content', locale);
      document.head.appendChild(element);
    });
}

export default function Seo() {
  const { userLanguage, pathname, dictionary } = useContext(PinContext);
  const seoTitle = dictionary.seoTitle || 'Les meilleures baguettes de Paris';
  const seoDescription = dictionary.seoDescription || 'Carte interactive des meilleures baguettes de Paris.';
  const currentUrl = `${SITE_ORIGIN}${pathname}`;

  useEffect(() => {
    document.title = seoTitle;
    document.documentElement.lang = userLanguage;

    upsertMeta('name', 'language', userLanguage);
    upsertMeta('name', 'description', seoDescription);
    upsertMeta('property', 'og:title', seoTitle);
    upsertMeta('property', 'og:description', seoDescription);
    upsertMeta('property', 'og:url', currentUrl);
    upsertMeta('property', 'og:locale', OG_LOCALES[userLanguage] || 'fr_FR');
    syncLocaleAlternates(userLanguage);
    upsertMeta('name', 'twitter:title', seoTitle);
    upsertMeta('name', 'twitter:description', seoDescription);
    upsertLink('link[rel="canonical"]', {
      rel: 'canonical',
      href: currentUrl
    });

    Object.keys(languageOptions).forEach((language) => {
      upsertLink(`link[rel="alternate"][hreflang="${language}"]`, {
        rel: 'alternate',
        hreflang: language,
        href: `${SITE_ORIGIN}${buildLanguagePath(language, '/')}`
      });
    });

    upsertLink('link[rel="alternate"][hreflang="x-default"]', {
      rel: 'alternate',
      hreflang: 'x-default',
      href: `${SITE_ORIGIN}/`
    });

    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'Map',
      name: seoTitle,
      description: seoDescription,
      url: currentUrl,
      inLanguage: userLanguage,
      publisher: {
        '@type': 'Person',
        name: 'Simone Ertel',
        email: 'ecrivez.moi@simonertel.net'
      },
      hasMap: currentUrl,
      image: {
        '@type': 'ImageObject',
        url: SITE_IMAGE,
        width: 1200,
        height: 630,
        description: seoDescription
      }
    };

    const structuredDataScript = document.head.querySelector('#structured-data');
    if (structuredDataScript) {
      structuredDataScript.textContent = JSON.stringify(structuredData);
    }
  }, [currentUrl, seoDescription, seoTitle, userLanguage]);

  return (
    <nav
      aria-hidden="true"
      style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', left: -9999, top: 'auto' }}
    >
      <a href="/">x-default</a>
      {Object.keys(languageOptions).map((language) => (
        <a key={language} href={buildLanguagePath(language, '/')}>
          {language}
        </a>
      ))}
    </nav>
  );
}
