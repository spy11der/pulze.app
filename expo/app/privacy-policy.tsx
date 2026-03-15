import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shield } from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import type { AppColors } from '@/constants/colors';

const LAST_UPDATED = 'March 15, 2026';

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Privacy Policy',
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
            <Shield color={colors.aqua} size={28} />
          </View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Privacy Policy</Text>
          <Text style={[styles.headerDate, { color: colors.textMuted }]}>Last updated: {LAST_UPDATED}</Text>
        </View>

        <Section title="1. Information We Collect" colors={colors}>
          <BulletPoint colors={colors}>
            <Bold colors={colors}>Account Information:</Bold> When you create a Pulse account, we collect your name, email address, username, and profile photo.
          </BulletPoint>
          <BulletPoint colors={colors}>
            <Bold colors={colors}>Location Data:</Bold> With your permission, we collect precise or approximate location data to show nearby events, venues, and friends on the map. You can control location visibility in Settings.
          </BulletPoint>
          <BulletPoint colors={colors}>
            <Bold colors={colors}>Content You Create:</Bold> Posts, photos, check-ins, and other content you share through the app.
          </BulletPoint>
          <BulletPoint colors={colors}>
            <Bold colors={colors}>Device Information:</Bold> Device type, operating system, unique device identifiers, and crash data for improving app stability.
          </BulletPoint>
          <BulletPoint colors={colors}>
            <Bold colors={colors}>Usage Data:</Bold> How you interact with Pulse, including features used, time spent, and navigation patterns.
          </BulletPoint>
          <BulletPoint colors={colors}>
            <Bold colors={colors}>Biometric Data:</Bold> If you enable Face ID or fingerprint lock, biometric authentication is processed locally on your device and never sent to our servers.
          </BulletPoint>
        </Section>

        <Section title="2. How We Use Your Information" colors={colors}>
          <Paragraph colors={colors}>We use the information we collect to:</Paragraph>
          <BulletPoint colors={colors}>Provide, maintain, and improve Pulse's features and services</BulletPoint>
          <BulletPoint colors={colors}>Show you relevant events, venues, and experiences near you</BulletPoint>
          <BulletPoint colors={colors}>Connect you with friends and other users</BulletPoint>
          <BulletPoint colors={colors}>Process ticket purchases and wallet transactions</BulletPoint>
          <BulletPoint colors={colors}>Send notifications about events, friends, and account activity</BulletPoint>
          <BulletPoint colors={colors}>Detect and prevent fraud, abuse, and security issues</BulletPoint>
          <BulletPoint colors={colors}>Analyze usage patterns to improve the user experience</BulletPoint>
        </Section>

        <Section title="3. How We Share Your Information" colors={colors}>
          <Paragraph colors={colors}>We do not sell your personal information. We may share information in the following circumstances:</Paragraph>
          <BulletPoint colors={colors}>
            <Bold colors={colors}>With Other Users:</Bold> Profile information, posts, and check-ins are visible to other users based on your privacy settings.
          </BulletPoint>
          <BulletPoint colors={colors}>
            <Bold colors={colors}>Event Organizers:</Bold> When you purchase tickets, we share necessary information with event organizers for entry and verification.
          </BulletPoint>
          <BulletPoint colors={colors}>
            <Bold colors={colors}>Service Providers:</Bold> We work with third-party providers for hosting, analytics, payment processing, and customer support.
          </BulletPoint>
          <BulletPoint colors={colors}>
            <Bold colors={colors}>Legal Requirements:</Bold> We may disclose information when required by law, regulation, or legal process.
          </BulletPoint>
        </Section>

        <Section title="4. Data Security" colors={colors}>
          <Paragraph colors={colors}>
            We implement industry-standard security measures to protect your data. Sensitive information like wallet credentials is encrypted using SecureStore on your device. Payment information is processed through secure, PCI-compliant payment processors and is never stored on our servers.
          </Paragraph>
        </Section>

        <Section title="5. Your Privacy Controls" colors={colors}>
          <Paragraph colors={colors}>Pulse gives you control over your data:</Paragraph>
          <BulletPoint colors={colors}>
            <Bold colors={colors}>Post Privacy:</Bold> Choose who can see your posts (Public, Friends, or Private).
          </BulletPoint>
          <BulletPoint colors={colors}>
            <Bold colors={colors}>Location Visibility:</Bold> Set your location to Precise, Area Only, or Hidden.
          </BulletPoint>
          <BulletPoint colors={colors}>
            <Bold colors={colors}>Nearby Alerts:</Bold> Toggle notifications for nearby activity on or off.
          </BulletPoint>
          <BulletPoint colors={colors}>
            <Bold colors={colors}>Account Deletion:</Bold> You can permanently delete your account and all associated data at any time from Settings.
          </BulletPoint>
        </Section>

        <Section title="6. Data Retention" colors={colors}>
          <Paragraph colors={colors}>
            We retain your information for as long as your account is active or as needed to provide services. When you delete your account, we remove your personal data within 30 days, except where retention is required by law.
          </Paragraph>
        </Section>

        <Section title="7. Children's Privacy" colors={colors}>
          <Paragraph colors={colors}>
            Pulse is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If we learn that we have collected data from a child under 13, we will delete it promptly.
          </Paragraph>
        </Section>

        <Section title="8. Changes to This Policy" colors={colors}>
          <Paragraph colors={colors}>
            We may update this Privacy Policy from time to time. We will notify you of material changes through the app or via email. Your continued use of Pulse after changes constitutes acceptance of the updated policy.
          </Paragraph>
        </Section>

        <Section title="9. Contact Us" colors={colors}>
          <Paragraph colors={colors}>
            If you have questions or concerns about this Privacy Policy or your data, please contact us at privacy@pulze.app.
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

function Bold({ colors, children }: { colors: AppColors; children: React.ReactNode }) {
  return <Text style={{ fontWeight: '700' as const, color: colors.text }}>{children}</Text>;
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
