// Shows which backend the running app is connected to. A STAGING pill
// whenever the Supabase client points at staging (any build); in development
// builds a NOT STAGING pill otherwise, plus a one-line diagnostic: project
// ref, bundle source, SDK. Release builds not on staging show nothing.
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { getBackendInfo } from '@/services/backendInfo';

export function BackendBadge() {
  const { colors } = useTheme();
  const info = useMemo(() => getBackendInfo(), []);
  const isStaging = info.environment === 'staging';

  if (!isStaging && !__DEV__) return null;

  return (
    <View style={styles.wrap} testID="backend-badge">
      <View
        style={[styles.pill, { backgroundColor: isStaging ? colors.amber : colors.danger }]}
        accessibilityRole="text"
        accessibilityLabel={isStaging ? 'Connected to staging' : 'Not connected to staging'}
        testID="backend-pill"
      >
        <Text style={styles.pillText}>{isStaging ? 'STAGING' : 'NOT STAGING'}</Text>
      </View>
      {__DEV__ && (
        <Text style={[styles.diag, { color: colors.textSoft }]} selectable testID="backend-diagnostic">
          {`Supabase ${info.projectRef} (${info.environment}) · ${info.bundleSource} · SDK ${info.sdkVersion}`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillText: {
    color: '#041318',
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: 1.5,
  },
  diag: {
    fontSize: 11,
    textAlign: 'center',
  },
});
