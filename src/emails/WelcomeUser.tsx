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

export default function WelcomeUser() {
  return (
    <Html lang="en">
      <Head>
        <Font fontFamily="system-ui" fallbackFontFamily="Arial" />
      </Head>
      <Preview>See what real people pay for med spa treatments near you.</Preview>
      <Body style={{ backgroundColor: BG, fontFamily: FONT_FAMILY, margin: 0, padding: '40px 16px' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto' }}>
          <Text style={{ textAlign: 'center' as const, fontSize: 24, fontWeight: 700, color: ACCENT, marginBottom: 24 }}>
            Glow<span style={{ fontWeight: 400 }}>Buddy</span>
          </Text>
          <Section style={{ backgroundColor: CARD_BG, borderRadius: 16, padding: '40px 32px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <Text style={{ fontSize: 24, fontWeight: 700, color: TEXT_PRIMARY, textAlign: 'center' as const, margin: '0 0 8px' }}>
              Welcome to GlowBuddy!
            </Text>
            <Text style={{ fontSize: 16, color: TEXT_SECONDARY, textAlign: 'center' as const, margin: '0 0 32px' }}>
              See what real people pay for med spa treatments near you.
            </Text>

            <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ border: 'none' }}>
              <tbody>
                {[
                  { icon: '\u{1F4B0}', title: 'Browse real prices', desc: 'See what others actually pay for Botox, fillers, and more.' },
                  { icon: '\u{1F4CB}', title: 'Log your treatments', desc: 'Share anonymously and help others make informed decisions.' },
                  { icon: '\u{1F381}', title: 'Win monthly giveaways', desc: 'Every submission earns you entries into our monthly drawing.' },
                ].map((item) => (
                  <tr key={item.title}>
                    <td style={{ width: 40, verticalAlign: 'top', fontSize: 20, padding: '12px 0' }}>{item.icon}</td>
                    <td style={{ padding: '12px 0' }}>
                      <Text style={{ margin: 0, fontSize: 15, fontWeight: 600, color: TEXT_PRIMARY }}>{item.title}</Text>
                      <Text style={{ margin: '4px 0 0', fontSize: 14, color: TEXT_SECONDARY }}>{item.desc}</Text>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Section style={{ textAlign: 'center' as const, marginTop: 24 }}>
              <Button href="https://glowbuddy.com" style={{ backgroundColor: ACCENT, color: '#fff', borderRadius: 999, padding: '14px 32px', fontSize: 16, fontWeight: 600, textDecoration: 'none' }}>
                Browse Prices
              </Button>
            </Section>
          </Section>

          <Text style={{ textAlign: 'center' as const, fontSize: 13, color: TEXT_SECONDARY, marginTop: 32 }}>
            <a href="https://glowbuddy.com" style={{ color: TEXT_SECONDARY }}>glowbuddy.com</a> · <a href="https://glowbuddy.com/settings" style={{ color: TEXT_SECONDARY }}>Manage email preferences</a>
          </Text>
          <Text style={{ textAlign: 'center' as const, fontSize: 12, color: TEXT_SECONDARY }}>GlowBuddy · New Orleans, LA</Text>
        </Container>
      </Body>
    </Html>
  );
}
