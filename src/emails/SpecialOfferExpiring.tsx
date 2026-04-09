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
  expiryDate?: string;
  impressions?: number;
  clicks?: number;
}

export default function SpecialOfferExpiring({
  treatmentName = 'Botox',
  expiryDate = 'May 2, 2026',
  impressions = 1243,
  clicks = 87,
}: Props) {
  return (
    <Html lang="en">
      <Head>
        <Font fontFamily="system-ui" fallbackFontFamily="Arial" />
      </Head>
      <Preview>Your {treatmentName} special expires in 48 hours</Preview>
      <Body style={{ backgroundColor: BG, fontFamily: FONT_FAMILY, margin: 0, padding: '40px 16px' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto' }}>
          <Text style={{ textAlign: 'center' as const, fontSize: 24, fontWeight: 700, color: ACCENT, marginBottom: 24 }}>
            Know Before You Glow
          </Text>
          <Section style={{ backgroundColor: CARD_BG, borderRadius: 16, padding: '40px 32px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <Text style={{ fontSize: 24, fontWeight: 700, color: TEXT_PRIMARY, textAlign: 'center' as const, margin: '0 0 8px' }}>
              Your special expires soon
            </Text>
            <Text style={{ fontSize: 16, color: TEXT_SECONDARY, textAlign: 'center' as const, margin: '0 0 32px' }}>
              Your <strong>{treatmentName}</strong> special expires on {expiryDate}.
            </Text>

            <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ border: 'none', marginBottom: 24 }}>
              <tbody>
                <tr>
                  <td style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: 20, textAlign: 'center' as const, width: '48%' }}>
                    <Text style={{ margin: 0, fontSize: 28, fontWeight: 700, color: TEXT_PRIMARY }}>{impressions.toLocaleString()}</Text>
                    <Text style={{ margin: '4px 0 0', fontSize: 13, color: TEXT_SECONDARY }}>Impressions</Text>
                  </td>
                  <td style={{ width: '4%' }} />
                  <td style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: 20, textAlign: 'center' as const, width: '48%' }}>
                    <Text style={{ margin: 0, fontSize: 28, fontWeight: 700, color: TEXT_PRIMARY }}>{clicks.toLocaleString()}</Text>
                    <Text style={{ margin: '4px 0 0', fontSize: 13, color: TEXT_SECONDARY }}>Clicks</Text>
                  </td>
                </tr>
              </tbody>
            </table>

            <Text style={{ margin: 0, fontSize: 15, color: TEXT_SECONDARY, textAlign: 'center' as const }}>
              Renew your placement to keep showing up in search results and procedure pages.
            </Text>

            <Section style={{ textAlign: 'center' as const, marginTop: 24 }}>
              <Button href="https://knowbeforeyouglow.com/business/dashboard" style={{ backgroundColor: ACCENT, color: '#fff', borderRadius: 999, padding: '14px 32px', fontSize: 16, fontWeight: 600, textDecoration: 'none' }}>
                Renew Special
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
