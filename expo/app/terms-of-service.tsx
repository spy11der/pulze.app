import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FileText } from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import type { AppColors } from '@/constants/colors';

const LAST_UPDATED = 'March 15, 2026';

export default function TermsOfServiceScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Terms of Service',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '800' as const, fontSize: 18 },
        }}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(53, 212, 207, 0.12)' : 'rgba(26, 168, 163, 0.08)' }]}>
            <FileText color={colors.aqua} size={28} />
          </View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Terms of Service</Text>
          <Text style={[styles.headerDate, { color: colors.textMuted }]}>Last updated: {LAST_UPDATED}</Text>
        </View>

        <Section title="1. Acceptance of Terms" colors={colors}>
          <Paragraph colors={colors}>
            By downloading, installing, or using the Pulse mobile application ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the App. We reserve the right to modify these Terms at any time, and your continued use of Pulse constitutes acceptance of any changes.
          </Paragraph>
        </Section>

        <Section title="2. Eligibility" colors={colors}>
          <Paragraph colors={colors}>
            You must be at least 13 years of age to use Pulse. If you are under 18, you represent that your parent or legal guardian has reviewed and agreed to these Terms on your behalf. By using Pulse, you represent and warrant that you meet these eligibility requirements.
          </Paragraph>
        </Section>

        <Section title="3. Your Account" colors={colors}>
          <BulletPoint colors={colors}>You are responsible for maintaining the confidentiality of your account credentials.</BulletPoint>
          <BulletPoint colors={colors}>You are responsible for all activity that occurs under your account.</BulletPoint>
          <BulletPoint colors={colors}>You must provide accurate and complete information when creating your account.</BulletPoint>
          <BulletPoint colors={colors}>You must notify us immediately of any unauthorized use of your account.</BulletPoint>
          <BulletPoint colors={colors}>We reserve the right to suspend or terminate accounts that violate these Terms.</BulletPoint>
        </Section>

        <Section title="4. Acceptable Use" colors={colors}>
          <Paragraph colors={colors}>When using Pulse, you agree not to:</Paragraph>
          <BulletPoint colors={colors}>Post content that is illegal, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable.</BulletPoint>
          <BulletPoint colors={colors}>Impersonate any person or entity, or falsely represent your affiliation with any person or entity.</BulletPoint>
          <BulletPoint colors={colors}>Use the App to spam, phish, or distribute malware.</BulletPoint>
          <BulletPoint colors={colors}>Attempt to gain unauthorized access to other users' accounts or our systems.</BulletPoint>
          <BulletPoint colors={colors}>Use automated means (bots, scrapers) to access or interact with the App.</BulletPoint>
          <BulletPoint colors={colors}>Interfere with or disrupt the App's functionality or servers.</BulletPoint>
          <BulletPoint colors={colors}>Violate any applicable local, state, national, or international law.</BulletPoint>
        </Section>

        <Section title="5. Content & Intellectual Property" colors={colors}>
          <Paragraph colors={colors}>
            You retain ownership of content you create and share on Pulse. By posting content, you grant Pulse a non-exclusive, worldwide, royalty-free license to use, display, reproduce, and distribute your content within the App and for promotional purposes.
          </Paragraph>
          <Paragraph colors={colors}>
            The Pulse name, logo, and all related graphics, icons, and service names are trademarks of Pulse. You may not use these without prior written permission.
          </Paragraph>
        </Section>

        <Section title="6. Tickets & Purchases" colors={colors}>
          <BulletPoint colors={colors}>All ticket purchases made through Pulse are final unless the event is cancelled by the organizer.</BulletPoint>
          <BulletPoint colors={colors}>Ticket prices are set by event organizers and may include service fees.</BulletPoint>
          <BulletPoint colors={colors}>Pulse acts as a platform facilitating ticket sales and is not the event organizer.</BulletPoint>
          <BulletPoint colors={colors}>Refund policies are determined by individual event organizers. Pulse will facilitate refund requests where applicable.</BulletPoint>
          <BulletPoint colors={colors}>Resale or transfer of tickets is subject to the event organizer's policies.</BulletPoint>
        </Section>

        <Section title="7. Wallet & Digital Assets" colors={colors}>
          <Paragraph colors={colors}>
            The Pulse Wallet feature allows you to store tickets and digital credentials securely on your device. Wallet data is encrypted using device-level security (SecureStore). Pulse is not responsible for loss of wallet data due to device loss, damage, or unauthorized access to your device.
          </Paragraph>
        </Section>

        <Section title="8. Location Services" colors={colors}>
          <Paragraph colors={colors}>
            Certain features of Pulse require access to your device's location services. You can control location permissions through your device settings and within the App. Pulse uses location data in accordance with our Privacy Policy.
          </Paragraph>
        </Section>

        <Section title="9. Disclaimer of Warranties" colors={colors}>
          <Paragraph colors={colors}>
            Pulse is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not guarantee that the App will be uninterrupted, error-free, or free of viruses or other harmful components. Your use of Pulse is at your sole risk.
          </Paragraph>
        </Section>

        <Section title="10. Limitation of Liability" colors={colors}>
          <Paragraph colors={colors}>
            To the maximum extent permitted by law, Pulse and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or goodwill, arising from your use of or inability to use the App.
          </Paragraph>
        </Section>

        <Section title="11. Indemnification" colors={colors}>
          <Paragraph colors={colors}>
            You agree to indemnify and hold harmless Pulse, its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of the App, your violation of these Terms, or your violation of any rights of another party.
          </Paragraph>
        </Section>

        <Section title="12. Termination" colors={colors}>
          <Paragraph colors={colors}>
            We may suspend or terminate your access to Pulse at any time, with or without cause, and with or without notice. Upon termination, your right to use the App will cease immediately. You may delete your account at any time through the Settings screen.
          </Paragraph>
        </Section>

        <Section title="13. Governing Law" colors={colors}>
          <Paragraph colors={colors}>
            These Terms shall be governed by and construed in accordance with the laws of the State of Colorado, United States, without regard to its conflict of law provisions. Any disputes shall be resolved in the state or federal courts located in Denver, Colorado.
          </Paragraph>
        </Section>

        <Section title="14. Contact Us" colors={colors}>
          <Paragraph colors={colors}>
            If you have questions about these Terms, please contact us at legal@pulze.app.
          </Paragraph>
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, colors, children }: { title: string; colors: AppColors; children: React.ReactNode }) {
  return (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function Paragraph({ colors, children }: { colors: AppColors; children: React.ReactNode }) {
  return <Text style={[styles.paragraph, { color: colors.textMuted }]}>{children}</Text>;
}

function BulletPoint({ colors, children }: { colors: AppColors; children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <View style={[styles.bullet, { backgroundColor: colors.aqua }]} />
      <Text style={[styles.bulletText, { color: colors.textMuted }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    padding: 18,
    gap: 14,
  },
  header: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
  },
  headerDate: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  section: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800' as const,
    marginBottom: 2,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400' as const,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingRight: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    flexShrink: 0,
  },
  bulletText: {
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
    fontWeight: '400' as const,
  },
});
