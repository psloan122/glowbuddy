export const FINANCING_PARTNERS = {
  carecredit: {
    name: 'CareCredit',
    tagline: 'Apply in minutes. Use today.',
    logo: '/logos/carecredit.svg',
    affiliateBaseUrl: 'https://www.carecredit.com/apply/',
    affiliateParam: 'referralCode',
    affiliateCode: import.meta.env.VITE_CARECREDIT_AFFILIATE_CODE || '',
    color: '#0057A8',
    estimatedPayoutPerApproval: 75,
    minProcedureCost: 200,
  },
  cherry: {
    name: 'Cherry',
    tagline: 'Get approved for up to $10,000.',
    logo: '/logos/cherry.svg',
    affiliateBaseUrl: 'https://www.withcherry.com/apply/',
    affiliateParam: 'partner',
    affiliateCode: import.meta.env.VITE_CHERRY_AFFILIATE_CODE || '',
    color: '#E8334A',
    estimatedPayoutPerApproval: 50,
    minProcedureCost: 150,
  },
};

export function buildAffiliateUrl(partner, estimatedCost) {
  const config = FINANCING_PARTNERS[partner];
  if (!config) return null;
  const params = new URLSearchParams();
  if (config.affiliateCode) {
    params.set(config.affiliateParam, config.affiliateCode);
  }
  if (estimatedCost) {
    params.set('amount', String(Math.round(estimatedCost)));
  }
  const qs = params.toString();
  return qs ? `${config.affiliateBaseUrl}?${qs}` : config.affiliateBaseUrl;
}
