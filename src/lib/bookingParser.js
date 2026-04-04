const BOOKING_PLATFORMS = [
  {
    name: 'vagaro',
    patterns: [/vagaro\.com/i, /appointment.*confirmed/i],
    providerRegex: /at\s+([A-Z][^<\n]+?)(?:\s+on|\s+for)/,
    dateRegex: /(\w+ \d+,?\s*\d{4})/,
    amountRegex: /\$[\d,]+\.?\d*/,
  },
  {
    name: 'boulevard',
    patterns: [/boulevard/i, /blvd\.io/i],
    providerRegex: /appointment at\s+([^<\n]+)/i,
    dateRegex: /on\s+(\w+,\s+\w+ \d+)/i,
    amountRegex: /total[:\s]+\$?([\d.]+)/i,
  },
  {
    name: 'mindbody',
    patterns: [/mindbodyonline/i],
    providerRegex: /at\s+([^<\n,]+?)(?:,|\s+on)/i,
    dateRegex: /(\d{1,2}\/\d{1,2}\/\d{4})/,
    amountRegex: /\$[\d.]+/,
  },
  {
    name: 'square',
    patterns: [/squareup\.com/i, /square appointment/i],
    providerRegex: /appointment.*?with\s+([^<\n]+)/i,
    dateRegex: /(\w+ \d+,\s+\d{4})/,
    amountRegex: /\$[\d.]+/,
  },
  {
    name: 'acuity',
    patterns: [/acuityscheduling/i],
    providerRegex: /with\s+([^<\n]+?)(?:\s+on|\s+at)/i,
    dateRegex: /on\s+(\w+,\s+\w+ \d+,\s+\d{4})/i,
    amountRegex: /\$[\d.]+/,
  },
  {
    name: 'jane',
    patterns: [/jane\.app/i, /janeapp\.com/i],
    providerRegex: /appointment.*?at\s+([^<\n]+)/i,
    dateRegex: /(\w+ \d+,\s+\d{4})/,
    amountRegex: /\$[\d.]+/,
  },
  {
    name: 'glossgenius',
    patterns: [/glossgenius/i],
    providerRegex: /with\s+([^<\n]+?)(?:\s+on|\s+at)/i,
    dateRegex: /(\w+ \d+,?\s+\d{4})/,
    amountRegex: /\$[\d.]+/,
  },
];

export const parseBookingConfirmation = (emailContent) => {
  if (!emailContent) return { confidence: 0 };

  for (const platform of BOOKING_PLATFORMS) {
    const matches = platform.patterns.some((p) => p.test(emailContent));

    if (!matches) continue;

    const provider = emailContent.match(platform.providerRegex)?.[1]?.trim();
    const date = emailContent.match(platform.dateRegex)?.[1];
    const amount = emailContent.match(platform.amountRegex)?.[0];

    const confidence =
      (matches ? 0.4 : 0) + (provider ? 0.3 : 0) + (date ? 0.2 : 0) + (amount ? 0.1 : 0);

    return {
      platform: platform.name,
      provider_name: provider || null,
      date: date || null,
      amount: amount || null,
      confidence,
    };
  }

  return { confidence: 0 };
};
