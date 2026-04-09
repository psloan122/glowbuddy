/**
 * Set page-level SEO meta tags.
 * Call from useEffect in each page component.
 *
 * If `canonical` is omitted, falls back to the current `window.location.origin + pathname`.
 */
export function setPageMeta({ title, description, canonical }) {
  if (title) document.title = title;

  if (description) {
    let meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', description);
    } else {
      meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = description;
      document.head.appendChild(meta);
    }
  }

  // Always set canonical — fall back to current origin + pathname (no query/hash)
  const canonicalUrl = canonical
    || (typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : null);
  if (canonicalUrl) setCanonical(canonicalUrl);
}

/**
 * Set Open Graph meta tags for social sharing.
 */
export function setOgMeta({ title, description, url, image, type }) {
  const tags = {
    'og:title': title,
    'og:description': description,
    'og:url': url,
    'og:image': image,
    'og:type': type,
  };

  for (const [property, content] of Object.entries(tags)) {
    if (!content) continue;
    let meta = document.querySelector(`meta[property="${property}"]`);
    if (meta) {
      meta.setAttribute('content', content);
    } else {
      meta = document.createElement('meta');
      meta.setAttribute('property', property);
      meta.content = content;
      document.head.appendChild(meta);
    }
  }
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function setNamedMeta(name, content) {
  if (!content) return;
  let meta = document.querySelector(`meta[name="${name}"]`);
  if (meta) {
    meta.setAttribute('content', content);
  } else {
    meta = document.createElement('meta');
    meta.setAttribute('name', name);
    meta.content = content;
    document.head.appendChild(meta);
  }
}

function setCanonical(url) {
  if (!url) return;
  let link = document.querySelector('link[rel="canonical"]');
  if (link) {
    link.setAttribute('href', url);
  } else {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    link.setAttribute('href', url);
    document.head.appendChild(link);
  }
}

function upsertJsonLd(id, payload) {
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = id;
  script.textContent = JSON.stringify(payload);
  document.head.appendChild(script);
}

/**
 * Apply the full SEO bundle for a city price report page.
 * Returns a cleanup function that removes the JSON-LD scripts.
 *
 * Stable IDs are used so re-renders update in place rather than appending.
 */
export function applyCityReportMeta({
  city,
  state,
  slug,
  yearMonth,
  topProc,
  topProcAvg,
  topProcSampleSize,
  totalSubmissions,
  distinctProviders,
  dataFreshness,
}) {
  if (!city || !state) return () => {};

  const now = new Date();
  const [yearStr, monthStr] = (yearMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`).split('-');
  const year = Number(yearStr);
  const monthIdx = Number(monthStr) - 1;
  const monthName = MONTH_NAMES[monthIdx] || MONTH_NAMES[now.getMonth()];

  const procName = topProc || 'Cosmetic procedure';
  const title = `${procName} prices in ${city}, ${state} — ${monthName} ${year} | Know Before You Glow`;

  const submissionCount = Number(totalSubmissions || 0);
  const providerCount = Number(distinctProviders || 0);
  const avgText = topProcAvg ? `Average $${Number(topProcAvg).toLocaleString()}` : 'Real patient-reported prices';
  const description = `${avgText} for ${procName} in ${city}, ${state}. Based on ${submissionCount} data point${submissionCount === 1 ? '' : 's'} from ${providerCount} provider${providerCount === 1 ? '' : 's'}. Updated ${monthName} ${year}.`;

  const canonicalUrl = `https://knowbeforeyouglow.com/prices/${slug}${yearMonth ? `/${yearMonth}` : ''}`;

  // Title + description
  setPageMeta({ title, description });

  // Open Graph
  setOgMeta({
    title,
    description,
    url: canonicalUrl,
    type: 'website',
  });

  // Twitter
  setNamedMeta('twitter:card', 'summary');
  setNamedMeta('twitter:title', title);
  setNamedMeta('twitter:description', description);

  // Canonical
  setCanonical(canonicalUrl);

  // JSON-LD: Dataset
  upsertJsonLd('city-report-dataset-jsonld', {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `Cosmetic Prices in ${city}, ${state}`,
    description,
    url: canonicalUrl,
    temporalCoverage: yearMonth || `${year}-${String(monthIdx + 1).padStart(2, '0')}`,
    spatialCoverage: { '@type': 'Place', name: `${city}, ${state}` },
    creator: { '@type': 'Organization', name: 'Know Before You Glow' },
    ...(dataFreshness?.mostRecent ? { dateModified: dataFreshness.mostRecent } : {}),
  });

  // JSON-LD: AggregateOffer for the dominant procedure
  if (topProcAvg && topProcSampleSize > 0) {
    upsertJsonLd('city-report-offer-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'AggregateOffer',
      offerCount: topProcSampleSize,
      lowPrice: Number(topProcAvg),
      highPrice: Number(topProcAvg),
      priceCurrency: 'USD',
      itemOffered: {
        '@type': 'Service',
        name: procName,
        areaServed: { '@type': 'Place', name: `${city}, ${state}` },
      },
    });
  }

  return () => {
    document.getElementById('city-report-dataset-jsonld')?.remove();
    document.getElementById('city-report-offer-jsonld')?.remove();
  };
}
