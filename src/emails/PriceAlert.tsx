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
  treatment?: string;
  price?: string;
  providerName?: string;
  neighborhood?: string;
  providerUrl?: string;
}

export default function PriceAlert({
  treatment = 'Botox',
  price = '10',
  providerName = 'Glow Med Spa',
  neighborhood = 'Mid-City',
  providerUrl = 'https://knowbeforeyouglow.com/provider/glow-med-spa-new-orleans',
}: Props) {
  return (
    <Html lang="en">
      <Head>
        <Font fontFamily="system-ui" fallbackFontFamily="Arial" />
      </Head>
      <Preview>{treatment} dropped to ${price} near you</Preview>
      <Body style={{ backgroundColor: BG, fontFamily: FONT_FAMILY, margin: 0, padding: '40px 16px' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto' }}>
          <Text style={{ textAlign: 'center' as const, fontSize: 24, fontWeight: 700, color: ACCENT, marginBottom: 24 }}>
            Know Before You Glow
          </Text>
          <Section style={{ backgroundColor: CARD_BG, borderRadius: 16, padding: '40px 32px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <Text style={{ fontSize: 24, fontWeight: 700, color: TEXT_PRIMARY, textAlign: 'center' as const, margin: '0 0 8px' }}>
              Price drop alert
            </Text>
            <Text style={{ fontSize: 16, color: TEXT_SECONDARY, textAlign: 'center' as const, margin: '0 0 32px' }}>
              <strong>{treatment}</strong> just dropped to <strong>${price}</strong>{neighborhood ? ` in ${neighborhood}` : ''}.
            </Text>

            <Section style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: '12px 20px' }}>
              <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ border: 'none' }}>
                <tbody>
                  <tr>
                    <td style={{ fontSize: 14, color: TEXT_SECONDARY, padding: '6px 0' }}>Treatment</td>
                    <td style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, textAlign: 'right' as const, padding: '6px 0' }}>{treatment}</td>
                  </tr>
                  <tr>
                    <td style={{ fontSize: 14, color: TEXT_SECONDARY, padding: '6px 0' }}>Price</td>
                    <td style={{ fontSize: 16, fontWeight: 700, color: ACCENT, textAlign: 'right' as const, padding: '6px 0' }}>${price}</td>
                  </tr>
                  <tr>
                    <td style={{ fontSize: 14, color: TEXT_SECONDARY, padding: '6px 0' }}>Provider</td>
                    <td style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, textAlign: 'right' as const, padding: '6px 0' }}>{providerName}</td>
                  </tr>
                  {neighborhood && (
                    <tr>
                      <td style={{ fontSize: 14, color: TEXT_SECONDARY, padding: '6px 0' }}>Neighborhood</td>
                      <td style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, textAlign: 'right' as const, padding: '6px 0' }}>{neighborhood}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Section>

            <Section style={{ textAlign: 'center' as const, marginTop: 24 }}>
              <Button href={providerUrl} style={{ backgroundColor: ACCENT, color: '#fff', borderRadius: 999, padding: '14px 32px', fontSize: 16, fontWeight: 600, textDecoration: 'none' }}>
                View Provider
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
