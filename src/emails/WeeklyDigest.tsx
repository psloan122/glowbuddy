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
  impressions?: number;
  clicks?: number;
  calls?: number;
  topProcedure?: string;
}

export default function WeeklyDigest({
  providerName = 'Glow Med Spa',
  impressions = 3421,
  clicks = 218,
  calls = 14,
  topProcedure = 'Botox',
}: Props) {
  return (
    <Html lang="en">
      <Head>
        <Font fontFamily="system-ui" fallbackFontFamily="Arial" />
      </Head>
      <Preview>{providerName}: {impressions} impressions, {clicks} clicks this week</Preview>
      <Body style={{ backgroundColor: BG, fontFamily: FONT_FAMILY, margin: 0, padding: '40px 16px' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto' }}>
          <Text style={{ textAlign: 'center' as const, fontSize: 24, fontWeight: 700, color: ACCENT, marginBottom: 24 }}>
            Know Before You Glow
          </Text>
          <Section style={{ backgroundColor: CARD_BG, borderRadius: 16, padding: '40px 32px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <Text style={{ fontSize: 24, fontWeight: 700, color: TEXT_PRIMARY, textAlign: 'center' as const, margin: '0 0 8px' }}>
              This week: {providerName}
            </Text>
            <Text style={{ fontSize: 16, color: TEXT_SECONDARY, textAlign: 'center' as const, margin: '0 0 32px' }}>
              Here's how your listing performed over the last 7 days.
            </Text>

            <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ border: 'none' }}>
              <tbody>
                <tr>
                  <td style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: 20, textAlign: 'center' as const, width: '31%' }}>
                    <Text style={{ margin: 0, fontSize: 28, fontWeight: 700, color: TEXT_PRIMARY }}>{impressions.toLocaleString()}</Text>
                    <Text style={{ margin: '4px 0 0', fontSize: 13, color: TEXT_SECONDARY }}>Impressions</Text>
                  </td>
                  <td style={{ width: '3%' }} />
                  <td style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: 20, textAlign: 'center' as const, width: '31%' }}>
                    <Text style={{ margin: 0, fontSize: 28, fontWeight: 700, color: TEXT_PRIMARY }}>{clicks.toLocaleString()}</Text>
                    <Text style={{ margin: '4px 0 0', fontSize: 13, color: TEXT_SECONDARY }}>Clicks</Text>
                  </td>
                  <td style={{ width: '3%' }} />
                  <td style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: 20, textAlign: 'center' as const, width: '31%' }}>
                    <Text style={{ margin: 0, fontSize: 28, fontWeight: 700, color: TEXT_PRIMARY }}>{calls.toLocaleString()}</Text>
                    <Text style={{ margin: '4px 0 0', fontSize: 13, color: TEXT_SECONDARY }}>Calls</Text>
                  </td>
                </tr>
              </tbody>
            </table>

            {topProcedure && (
              <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ border: 'none', marginTop: 24, borderTop: '1px solid #E5E7EB', paddingTop: 16 }}>
                <tbody>
                  <tr>
                    <td style={{ fontSize: 14, color: TEXT_SECONDARY, padding: '6px 0' }}>Top procedure nearby</td>
                    <td style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, textAlign: 'right' as const, padding: '6px 0' }}>{topProcedure}</td>
                  </tr>
                </tbody>
              </table>
            )}

            <Section style={{ textAlign: 'center' as const, marginTop: 24 }}>
              <Button href="https://knowbeforeyouglow.com/business/dashboard" style={{ backgroundColor: ACCENT, color: '#fff', borderRadius: 999, padding: '14px 32px', fontSize: 16, fontWeight: 600, textDecoration: 'none' }}>
                View Analytics
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
