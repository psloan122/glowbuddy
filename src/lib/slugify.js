export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function providerSlug(name, city) {
  return slugify(`${name} ${city}`);
}
