// React Email preview template — mirrors send-email edge function HTML
// Run: npx react-email dev
// NOT used at runtime — visual reference only

import {
  Html, Head, Body, Container, Section, Text, Button, Preview, Font,
} from '@react-email/components';

const BG = '#FDFBF9';
const CARD_BG = '#FFFFFF';
const ACCENT = '#C94F78';
const TEXT_PRIMARY = '#1A1A2E';
const TEXT_SECONDARY = '#6B7280';
const FONT_FAMILY = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

interface Props {
  providerName?: string;
  treatmentName?: string;
  promoPrice?: string;
  priceUnit?: string;
  tier?: string;
  weeks?: number;
  totalPaid?: string;
  expiryDate?: string;
}

export default function SpecialOfferReceipt({
  providerName = 'Glow Med Spa',
  treatmentName = 'Botox',
  promoPrice = '$10',
  priceUnit = 'per unit',
  tier = 'featured',
  weeks = 4,
  totalPaid = '$149.00',
  expiryDate = 'May 2, 2026',
}: Props) {
  const tierLabel = tier === 'featured' ? 'Featured' : tier === 'premium' ? 'Premium' : 'Standard';

  return (
    <Html lang="en">
      <Head>
        <Font fontFamily="system-ui" fallbackFontFamily="Arial" />
      </Head>
      <Preview>Your Know Before You Glow placement for {treatmentName} is now live!</Preview>
      <Body style={{ backgroundColor: BG, fontFamily: FONT_FAMILY, margin: 0, padding: '40px 16px' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto' }}>
          <Text style={{ textAlign: 'center' as const, fontSize: 24, fontWeight: 700, color: ACCENT, marginBottom: 24 }}>
            Know Before You Glow
          </Text>
          <Section style={{ backgroundColor: CARD_BG, borderRadius: 16, padding: '40px 32px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <Text style={{ fontSize: 24, fontWeight: 700, color: TEXT_PRIMARY, textAlign: 'center' as const, margin: '0 0 8px' }}>
              Your placement is live!
            </Text>
            <Text style={{ fontSize: 16, color: TEXT_SECONDARY, textAlign: 'center' as const, margin: '0 0 32px' }}>
              Your special offer is now showing to patients in your area.
            </Text>

            <Section style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: '12px 20px' }}>
              <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ border: 'none' }}>
                <tbody>
                  {[
                    { label: 'Provider', value: providerName },
                    { label: 'Treatment', value: treatmentName },
                    { label: 'Promo price', value: `${promoPrice} ${priceUnit}` },
                    { label: 'Placement tier', value: tierLabel },
                    { label: 'Duration', value: `${weeks} week${weeks !== 1 ? 's' : ''}` },
                    { label: 'Expires', value: expiryDate },
                  ].map((row) => (
                    <tr key={row.label}>
                      <td style={{ fontSize: 14, color: TEXT_SECONDARY, padding: '6px 0' }}>{row.label}</td>
                      <td style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, textAlign: 'right' as const, padding: '6px 0' }}>{row.value}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={2} style={{ borderTop: '1px solid #E5E7EB', paddingTop: 12 }} />
                  </tr>
                  <tr>
                    <td style={{ fontSize: 16, fontWeight: 700, color: TEXT_PRIMARY, padding: '6px 0' }}>Total paid</td>
                    <td style={{ fontSize: 16, fontWeight: 700, color: TEXT_PRIMARY, textAlign: 'right' as const, padding: '6px 0' }}>{totalPaid}</td>
                  </tr>
                </tbody>
              </table>
            </Section>

            <Section style={{ textAlign: 'center' as const, marginTop: 24 }}>
              <Button href="https://knowbeforeyouglow.com/business/dashboard" style={{ backgroundColor: ACCENT, color: '#fff', borderRadius: 999, padding: '14px 32px', fontSize: 16, fontWeight: 600, textDecoration: 'none' }}>
                View Performance
              </Button>
            </Section>
          </Section>

          <Text style={{ textAlign: 'center' as const, fontSize: 13, color: TEXT_SECONDARY, marginTop: 32 }}>
            <a href="https://knowbeforeyouglow.com" style={{ color: TEXT_SECONDARY }}>knowbeforeyouglow.com</a> · <a href="https://knowbeforeyouglow.com/settings" style={{ color: TEXT_SECONDARY }}>Manage email preferences</a>
          </Text>
          <Text style={{ textAlign: 'center' as const, fontSize: 12, color: TEXT_SECONDARY }}>Know Before You Glow · New Orleans, LA</Text>
        </Container>
      </Body>
    </Html>
  );
}
