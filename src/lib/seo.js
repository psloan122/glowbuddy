/**
 * Set page-level SEO meta tags.
 * Call from useEffect in each page component.
 */
export function setPageMeta({ title, description }) {
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
}

/**
 * Set Open Graph meta tags for social sharing.
 */
export function setOgMeta({ title, description, url, image }) {
  const tags = {
    'og:title': title,
    'og:description': description,
    'og:url': url,
    'og:image': image,
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
