const fs = require('fs');
const path = require('path');

const SITE_ORIGIN = 'https://bestbaguettes.200.work';
const SITE_IMAGE = `${SITE_ORIGIN}/website.png`;
const ROOT_DIR = path.resolve(__dirname, '..');
const BUILD_DIR = path.join(ROOT_DIR, 'build');
const SOURCE_INDEX = path.join(BUILD_DIR, 'index.html');
const ROOTS_PATH = path.join(ROOT_DIR, 'src', 'datas', 'roots.json');
const LANGUAGES = ['fr', 'en', 'es', 'de', 'sl', 'it', 'uk'];
const LANGUAGE_LABELS = {
  fr: 'FR',
  en: 'EN',
  es: 'ES',
  de: 'DE',
  sl: 'SL',
  it: 'IT',
  uk: 'UA'
};
const OG_LOCALES = {
  fr: 'fr_FR',
  en: 'en_US',
  es: 'es_ES',
  de: 'de_DE',
  sl: 'sl_SI',
  it: 'it_IT',
  uk: 'uk_UA'
};

function readJson(relativePath) {
  const fileContent = fs.readFileSync(path.join(ROOT_DIR, relativePath), 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(fileContent);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInlineMarkup(value) {
  return escapeHtml(String(value || '')).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function stripMarkup(value) {
  return String(value || '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\s+/g, ' ').trim();
}

function getLanguageRoute(language) {
  return `/${language}`;
}

function getPagePath(language, variant = 'localized') {
  if (language === 'fr' && variant === 'root') {
    return '/';
  }

  return getLanguageRoute(language);
}

function buildAlternateLinks() {
  const links = [
    `<link rel="alternate" hreflang="x-default" href="${SITE_ORIGIN}/" />`
  ];

  for (const language of LANGUAGES) {
    links.push(
      `<link rel="alternate" hreflang="${language}" href="${SITE_ORIGIN}/${language}" />`
    );
  }

  return links.join('');
}

function buildAlternateLocaleMetas(currentLanguage) {
  return LANGUAGES
    .filter((language) => language !== currentLanguage)
    .map((language) => `<meta property="og:locale:alternate" content="${OG_LOCALES[language]}" />`)
    .join('');
}

function buildStructuredData(language, dictionary, pathname) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Map',
    name: dictionary.seoTitle || dictionary.aboutKicker || '',
    description: dictionary.seoDescription || '',
    url: `${SITE_ORIGIN}${pathname}`,
    inLanguage: language,
    publisher: {
      '@type': 'Person',
      name: 'Simone Ertel',
      email: 'ecrivez.moi@simonertel.net'
    },
    hasMap: `${SITE_ORIGIN}${pathname}`,
    image: {
      '@type': 'ImageObject',
      url: SITE_IMAGE,
      width: 1200,
      height: 630,
      description: dictionary.seoDescription || ''
    }
  };

  return JSON.stringify(data);
}

function buildSeoSection(language, dictionary, roots) {
  const goalSentence = [
    stripMarkup(dictionary.goalContent),
    stripMarkup(dictionary.contestwikipedia),
    stripMarkup(dictionary.goalContentEnd)
  ].filter(Boolean).join(' ');

  const sourceItems = Object.entries(roots)
    .map(([year, url]) => {
      const safeUrl = escapeHtml(url || '');
      const safeYear = escapeHtml(year);
      return `<li><a href="${safeUrl}" target="_blank" rel="noreferrer">${safeYear}</a></li>`;
    })
    .join('');

  const languageLinks = LANGUAGES
    .map((currentLanguage) => (
      `<a href="${escapeHtml(getLanguageRoute(currentLanguage))}" hreflang="${currentLanguage}" lang="${currentLanguage}">${escapeHtml(LANGUAGE_LABELS[currentLanguage])}</a>`
    ))
    .join(' ');

  return [
    '<section data-seo-content="true" style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;">',
    `<nav aria-label="Languages">${languageLinks}</nav>`,
    `<h2>${escapeHtml(dictionary.aboutKicker || dictionary.seoTitle || '')}</h2>`,
    `<p>${renderInlineMarkup(dictionary.aboutIntroLead || dictionary.seoDescription || '')}</p>`,
    `<p>${renderInlineMarkup(dictionary.aboutIntroBody || '')}</p>`,
    `<p>${renderInlineMarkup(dictionary.aboutIntroDetail || '')}</p>`,
    `<p>${renderInlineMarkup(dictionary.aboutCriteria || '')}</p>`,
    `<p>${escapeHtml(goalSentence)}</p>`,
    `<h3>${escapeHtml(dictionary.aboutWhyTitle || '')}</h3>`,
    `<p>${escapeHtml(stripMarkup(dictionary.aboutWhyBody || ''))}</p>`,
    `<h3>${escapeHtml(dictionary.sources || '')}</h3>`,
    `<p>${escapeHtml([dictionary.ranking || '', dictionary.rankingByYear || ''].join(' ').trim())}</p>`,
    `<ul>${sourceItems}</ul>`,
    `<p>${escapeHtml(stripMarkup(dictionary.helpWelcome || ''))} <a href="mailto:ecrivez.moi@simonertel.net">ecrivez.moi@simonertel.net</a></p>`,
    `<h3>${escapeHtml(dictionary.aboutContactTitle || '')}</h3>`,
    `<p>${escapeHtml(stripMarkup(dictionary.writeMe || ''))} <a href="mailto:ecrivez.moi@simonertel.net">ecrivez.moi@simonertel.net</a>.</p>`,
    `<h3>${escapeHtml(dictionary.divers || '')}</h3>`,
    `<p>${escapeHtml(stripMarkup(dictionary.aboutDiversIntro || ''))}</p>`,
    '</section>'
  ].join('');
}

function replaceMetaTag(html, selector, content) {
  const pattern = new RegExp(`<meta[^>]+${selector}="[^"]+"[^>]+content="[^"]*"[^>]*>`, 'i');
  const replacement = `<meta ${selector}="${selector === 'name' ? content.key : content.key}" content="${escapeHtml(content.value)}">`;
  return html.replace(pattern, replacement);
}

function applyHeadReplacements(html, language, dictionary, variant) {
  const pathname = getPagePath(language, variant);
  const canonicalUrl = `${SITE_ORIGIN}${pathname}`;
  const seoTitle = dictionary.seoTitle || '';
  const seoDescription = dictionary.seoDescription || '';
  const alternates = buildAlternateLinks();
  const alternateLocales = buildAlternateLocaleMetas(language);
  const structuredData = buildStructuredData(language, dictionary, pathname);

  let output = html;

  output = output.replace(/<html lang="[^"]*">/i, `<html lang="${language}">`);
  output = output.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(seoTitle)}</title>`);
  output = output.replace(/<link rel="canonical" href="[^"]*" ?\/>/i, `<link rel="canonical" href="${canonicalUrl}" />`);
  output = output.replace(/<link rel="alternate" hreflang="x-default"[\s\S]*?<link rel="alternate" hreflang="uk" href="[^"]*" ?\/>/i, alternates);
  output = output.replace(/<meta name="language" content="[^"]*" ?\/>/i, `<meta name="language" content="${language}" />`);
  output = output.replace(/<meta name="description" content="[^"]*" ?\/>/i, `<meta name="description" content="${escapeHtml(seoDescription)}" />`);
  output = output.replace(/<meta property="og:url" content="[^"]*" ?\/>/i, `<meta property="og:url" content="${canonicalUrl}" />`);
  output = output.replace(/<meta property="og:title" content="[^"]*" ?\/>/i, `<meta property="og:title" content="${escapeHtml(seoTitle)}" />`);
  output = output.replace(/<meta property="og:description" content="[^"]*" ?\/>/i, `<meta property="og:description" content="${escapeHtml(seoDescription)}" />`);
  output = output.replace(/<meta property="og:locale" content="[^"]*" ?\/>/i, `<meta property="og:locale" content="${OG_LOCALES[language]}" />`);
  output = output.replace(/<meta name="twitter:title" content="[^"]*" ?\/>/i, `<meta name="twitter:title" content="${escapeHtml(seoTitle)}" />`);
  output = output.replace(/<meta name="twitter:description" content="[^"]*" ?\/>/i, `<meta name="twitter:description" content="${escapeHtml(seoDescription)}" />`);
  output = output.replace(/<meta property="og:locale:alternate" content="[^"]*" ?\/>/gi, '');
  output = output.replace('</head>', `${alternateLocales}</head>`);
  output = output.replace(/<script id="structured-data" type="application\/ld\+json">[\s\S]*?<\/script>/i, `<script id="structured-data" type="application/ld+json">${structuredData}</script>`);

  return output;
}

function writePage(relativeFilePath, content) {
  const outputPath = path.join(BUILD_DIR, relativeFilePath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, content);
}

function buildLocalizedPage(baseHtml, language, dictionary, roots, variant = 'localized') {
  const localizedHead = applyHeadReplacements(baseHtml, language, dictionary, variant);
  const seoSection = buildSeoSection(language, dictionary, roots);
  return localizedHead.replace('<div id="root"></div>', `${seoSection}<div id="root"></div>`);
}

function main() {
  if (!fs.existsSync(SOURCE_INDEX)) {
    throw new Error(`Missing build output: ${SOURCE_INDEX}`);
  }

  const baseHtml = fs.readFileSync(SOURCE_INDEX, 'utf8');
  const roots = readJson(path.join('src', 'datas', 'roots.json'));

  for (const language of LANGUAGES) {
    const dictionary = readJson(path.join('src', 'datas', `${language}.json`));
    const localizedHtml = buildLocalizedPage(baseHtml, language, dictionary, roots, 'localized');

    writePage(path.join(language, 'index.html'), localizedHtml);
    writePage(path.join(language, '404.html'), localizedHtml);

    if (language === 'fr') {
      const rootHtml = buildLocalizedPage(baseHtml, language, dictionary, roots, 'root');
      writePage('index.html', rootHtml);
      writePage('404.html', rootHtml);
    }
  }
}

main();
