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
  slug?: string;
  menuCount?: number;
  tier?: string;
}

export default function ProviderWelcome({
  providerName = 'Glow Med Spa',
  slug = 'glow-med-spa-new-orleans',
  menuCount = 8,
  tier = 'free',
}: Props) {
  const tierLabel =
    tier === 'enterprise' ? 'Enterprise'
    : tier === 'certified' ? 'Certified'
    : tier === 'verified' ? 'Verified'
    : 'Free';
  const listingUrl = `https://knowbeforeyouglow.com/provider/${slug}`;

  return (
    <Html lang="en">
      <Head>
        <Font fontFamily="system-ui" fallbackFontFamily="Arial" />
      </Head>
      <Preview>{providerName} is now live on Know Before You Glow</Preview>
      <Body style={{ backgroundColor: BG, fontFamily: FONT_FAMILY, margin: 0, padding: '40px 16px' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto' }}>
          <Text style={{ textAlign: 'center' as const, fontSize: 24, fontWeight: 700, color: ACCENT, marginBottom: 24 }}>
            Know Before You Glow
          </Text>
          <Section style={{ backgroundColor: CARD_BG, borderRadius: 16, padding: '40px 32px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <Text style={{ fontSize: 24, fontWeight: 700, color: TEXT_PRIMARY, textAlign: 'center' as const, margin: '0 0 8px' }}>
              {providerName} is live!
            </Text>
            <Text style={{ fontSize: 16, color: TEXT_SECONDARY, textAlign: 'center' as const, margin: '0 0 32px' }}>
              Your practice is now listed on Know Before You Glow. Here's what to do next.
            </Text>

            <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ border: 'none' }}>
              <tbody>
                {[
                  { num: '1.', title: 'Complete your profile', desc: 'Add photos and a tagline to stand out to potential clients.' },
                  { num: '2.', title: 'Create a special offer', desc: 'Featured specials get up to 10x more visibility.' },
                  { num: '3.', title: 'Share your listing', desc: 'Send your Know Before You Glow profile link to existing clients.' },
                ].map((item) => (
                  <tr key={item.num}>
                    <td style={{ width: 40, verticalAlign: 'top', fontSize: 18, fontWeight: 700, color: ACCENT, padding: '12px 0' }}>{item.num}</td>
                    <td style={{ padding: '12px 0' }}>
                      <Text style={{ margin: 0, fontSize: 15, fontWeight: 600, color: TEXT_PRIMARY }}>{item.title}</Text>
                      <Text style={{ margin: '4px 0 0', fontSize: 14, color: TEXT_SECONDARY }}>{item.desc}</Text>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ border: 'none', marginTop: 24, borderTop: '1px solid #E5E7EB', paddingTop: 16 }}>
              <tbody>
                <tr>
                  <td style={{ fontSize: 14, color: TEXT_SECONDARY, padding: '6px 0' }}>Plan</td>
                  <td style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, textAlign: 'right' as const, padding: '6px 0' }}>{tierLabel}</td>
                </tr>
                <tr>
                  <td style={{ fontSize: 14, color: TEXT_SECONDARY, padding: '6px 0' }}>Menu items</td>
                  <td style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, textAlign: 'right' as const, padding: '6px 0' }}>{menuCount}</td>
                </tr>
                <tr>
                  <td style={{ fontSize: 14, color: TEXT_SECONDARY, padding: '6px 0' }}>Listing URL</td>
                  <td style={{ textAlign: 'right' as const, padding: '6px 0' }}>
                    <a href={listingUrl} style={{ fontSize: 14, color: ACCENT, textDecoration: 'underline' }}>{listingUrl.replace('https://', '')}</a>
                  </td>
                </tr>
              </tbody>
            </table>

            <Section style={{ textAlign: 'center' as const, marginTop: 24 }}>
              <Button href="https://knowbeforeyouglow.com/business/dashboard" style={{ backgroundColor: ACCENT, color: '#fff', borderRadius: 999, padding: '14px 32px', fontSize: 16, fontWeight: 600, textDecoration: 'none' }}>
                Go to Dashboard
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
