/**
 * Data source badge configuration for procedure cards.
 * Distinguishes patient reports, provider quotes, and verified menu prices.
 */
export function getSourceBadge(dataSource) {
  switch (dataSource) {
    case 'provider_quote':
      return {
        label: 'Provider quote',
        color: '#6366F1',
        background: '#EEF2FF',
        tooltip: 'This price was confirmed directly with the provider.',
      };
    case 'verified_menu':
      return {
        label: 'Verified menu',
        color: '#0F6E56',
        background: '#E1F5EE',
        tooltip: "Price from this provider's verified GlowBuddy menu.",
      };
    case 'provider_website':
      return {
        label: 'From provider website',
        color: '#1E40AF',
        background: '#DBEAFE',
        tooltip: "Sourced from the provider's public pricing menu or website.",
      };
    default:
      return {
        label: 'Patient reported',
        color: '#6B7280',
        background: '#F3F4F6',
        tooltip: 'Reported by a patient who received this treatment.',
      };
  }
}

/**
 * Quote freshness indicator.
 * Returns null if the quote is less than 90 days old.
 * Returns a warning object for older quotes.
 */
export function getQuoteFreshness(quoteDate) {
  if (!quoteDate) return null;

  const days = Math.floor(
    (Date.now() - new Date(quoteDate)) / (1000 * 60 * 60 * 24)
  );

  if (days < 90) return null;

  if (days < 180) {
    return {
      text: `Quoted ${Math.floor(days / 30)} months ago`,
      color: '#6B7280',
    };
  }

  return {
    text: 'Quoted 6+ months ago — prices may have changed',
    color: '#92400E',
  };
}
