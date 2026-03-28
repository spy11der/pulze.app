import React, { useCallback, useMemo, useState, useRef } from 'react';
import {
  Alert,
  Animated,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Plus,
  Shield,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/providers/ThemeProvider';
import { useSecureWallet, type DocumentType, type SecureDocument } from '@/providers/SecureWalletProvider';

const DOC_TYPE_OPTIONS: { id: DocumentType; label: string; icon: string }[] = [
  { id: 'drivers_license', label: "Driver's License", icon: 'DL' },
  { id: 'state_id', label: 'State ID', icon: 'ID' },
  { id: 'passport', label: 'Passport', icon: 'PP' },
  { id: 'other', label: 'Other', icon: '••' },
];

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

function maskDocNumber(num: string): string {
  if (num.length <= 4) return '••••';
  return '••••' + num.slice(-4);
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
}

function isExpired(expirationDate: string): boolean {
  if (!expirationDate) return false;
  return new Date(expirationDate) < new Date();
}

function isExpiringSoon(expirationDate: string): boolean {
  if (!expirationDate) return false;
  const exp = new Date(expirationDate);
  const now = new Date();
  const diff = exp.getTime() - now.getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  return days > 0 && days <= 90;
}

export default function SecureWalletScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { documents, isLoading, addDocument, removeDocument, isAdding } = useSecureWallet();

  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  const [docType, setDocType] = useState<DocumentType>('drivers_license');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [docNumber, setDocNumber] = useState<string>('');
  const [dob, setDob] = useState<string>('');
  const [expDate, setExpDate] = useState<string>('');
  const [issuingState, setIssuingState] = useState<string>('');
  const [statePickerOpen, setStatePickerOpen] = useState<boolean>(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const resetForm = useCallback(() => {
    setDocType('drivers_license');
    setFirstName('');
    setLastName('');
    setDocNumber('');
    setDob('');
    setExpDate('');
    setIssuingState('');
    setStatePickerOpen(false);
  }, []);

  const handleOpenAdd = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    resetForm();
    setShowAddForm(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, resetForm]);

  const handleCloseAdd = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowAddForm(false);
      resetForm();
    });
  }, [fadeAnim, resetForm]);

  const formatDateInput = useCallback((text: string, setter: (v: string) => void) => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2 && cleaned.length <= 4) {
      formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    } else if (cleaned.length > 4) {
      formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4) + '/' + cleaned.slice(4, 8);
    }
    setter(formatted);
  }, []);

  const parseDateString = useCallback((dateStr: string): string => {
    const parts = dateStr.split('/');
    if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
      const month = parseInt(parts[0], 10);
      const day = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900) {
        return new Date(year, month - 1, day).toISOString();
      }
    }
    return '';
  }, []);

  const canSubmit = useMemo(() => {
    return (
      firstName.trim().length > 0 &&
      lastName.trim().length > 0 &&
      docNumber.trim().length > 0 &&
      dob.length === 10 &&
      expDate.length === 10
    );
  }, [firstName, lastName, docNumber, dob, expDate]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Keyboard.dismiss();

    const typeLabel = DOC_TYPE_OPTIONS.find((o) => o.id === docType)?.label ?? 'Document';

    try {
      await addDocument({
        type: docType,
        label: typeLabel,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        documentNumber: docNumber.trim(),
        dateOfBirth: parseDateString(dob),
        expirationDate: parseDateString(expDate),
        issuingState: issuingState,
      });
      console.log('[SecureWallet] Document added successfully');
      handleCloseAdd();
    } catch (e) {
      console.log('[SecureWallet] Error adding document:', e);
      Alert.alert('Error', 'Failed to save document securely. Please try again.');
    }
  }, [canSubmit, docType, firstName, lastName, docNumber, dob, expDate, issuingState, addDocument, parseDateString, handleCloseAdd]);

  const handleRemove = useCallback(
    (doc: SecureDocument) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      Alert.alert(
        'Remove Document',
        `Are you sure you want to remove ${doc.label} ending in ${doc.documentNumber.slice(-4)}? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                await removeDocument(doc.id);
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch (e) {
                console.log('[SecureWallet] Error removing document:', e);
              }
            },
          },
        ]
      );
    },
    [removeDocument]
  );

  const toggleReveal = useCallback((docId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  }, []);

  const accentGradientStart = isDark ? 'rgba(53, 212, 207, 0.08)' : 'rgba(26, 168, 163, 0.05)';
  const cardGlow = isDark ? 'rgba(53, 212, 207, 0.06)' : 'rgba(26, 168, 163, 0.04)';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID="secure-wallet-screen">
      <Stack.Screen
        options={{
          title: '',
          headerShown: false,
        }}
      />
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.background }]}>
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={({ pressed }) => [styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}
          testID="back-btn"
        >
          <ChevronLeft color={colors.text} size={20} />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <Shield color={colors.aqua} size={18} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>Secure Wallet</Text>
          </View>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>Encrypted on-device storage</Text>
        </View>
        <Pressable
          onPress={handleOpenAdd}
          style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.aqua }, pressed && styles.pressed]}
          testID="add-doc-btn"
        >
          <Plus color={isDark ? colors.background : '#fff'} size={20} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.securityBanner, { backgroundColor: isDark ? 'rgba(165, 240, 92, 0.08)' : 'rgba(92, 168, 48, 0.06)', borderColor: isDark ? 'rgba(165, 240, 92, 0.15)' : 'rgba(92, 168, 48, 0.12)' }]}>
          <View style={[styles.securityIconWrap, { backgroundColor: isDark ? 'rgba(165, 240, 92, 0.15)' : 'rgba(92, 168, 48, 0.1)' }]}>
            <Lock color={colors.lime} size={16} />
          </View>
          <View style={styles.securityBannerBody}>
            <Text style={[styles.securityBannerTitle, { color: colors.lime }]}>AES-256 Encrypted</Text>
            <Text style={[styles.securityBannerText, { color: colors.textSoft }]}>
              Your documents are stored in the device's secure enclave. Data never leaves this device.
            </Text>
          </View>
        </View>

        {isLoading && (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>Loading secure vault...</Text>
          </View>
        )}

        {!isLoading && documents.length === 0 && !showAddForm && (
          <Pressable
            onPress={handleOpenAdd}
            style={({ pressed }) => [styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}
          >
            <View style={[styles.emptyIcon, { backgroundColor: accentGradientStart }]}>
              <CreditCard color={colors.aqua} size={32} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No documents yet</Text>
            <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
              Add your driver's license, state ID, or passport to keep them securely stored.
            </Text>
            <View style={[styles.emptyAddBtn, { backgroundColor: colors.aqua }]}>
              <Plus color={isDark ? colors.background : '#fff'} size={16} />
              <Text style={[styles.emptyAddBtnText, { color: isDark ? colors.background : '#fff' }]}>Add Document</Text>
            </View>
          </Pressable>
        )}

        {documents.map((doc) => {
          const revealed = revealedIds.has(doc.id);
          const expired = isExpired(doc.expirationDate);
          const expiringSoon = isExpiringSoon(doc.expirationDate);
          const typeOption = DOC_TYPE_OPTIONS.find((o) => o.id === doc.type);

          return (
            <View
              key={doc.id}
              style={[styles.docCard, { backgroundColor: colors.surface, borderColor: expired ? colors.coral + '40' : colors.border }]}
            >
              <View style={[styles.docCardHeader, { backgroundColor: cardGlow }]}>
                <View style={[styles.docTypeBadge, { backgroundColor: isDark ? 'rgba(53, 212, 207, 0.15)' : 'rgba(26, 168, 163, 0.1)' }]}>
                  <Text style={[styles.docTypeBadgeText, { color: colors.aqua }]}>{typeOption?.icon ?? '••'}</Text>
                </View>
                <View style={styles.docCardHeaderBody}>
                  <Text style={[styles.docLabel, { color: colors.text }]}>{doc.label}</Text>
                  {doc.issuingState ? (
                    <Text style={[styles.docIssuer, { color: colors.textMuted }]}>Issued in {doc.issuingState}</Text>
                  ) : null}
                </View>
                <View style={styles.docCardActions}>
                  <Pressable
                    onPress={() => toggleReveal(doc.id)}
                    style={({ pressed }) => [styles.docActionBtn, { backgroundColor: colors.card }, pressed && styles.pressed]}
                    testID={`reveal-btn-${doc.id}`}
                  >
                    {revealed ? <EyeOff color={colors.textMuted} size={16} /> : <Eye color={colors.aqua} size={16} />}
                  </Pressable>
                  <Pressable
                    onPress={() => handleRemove(doc)}
                    style={({ pressed }) => [styles.docActionBtn, { backgroundColor: colors.dangerBg }, pressed && styles.pressed]}
                    testID={`remove-btn-${doc.id}`}
                  >
                    <Trash2 color={colors.coral} size={16} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.docCardBody}>
                <View style={styles.docFieldRow}>
                  <View style={styles.docField}>
                    <Text style={[styles.docFieldLabel, { color: colors.textSoft }]}>Name</Text>
                    <Text style={[styles.docFieldValue, { color: colors.text }]}>
                      {revealed ? `${doc.firstName} ${doc.lastName}` : `${doc.firstName.charAt(0)}••• ${doc.lastName.charAt(0)}•••`}
                    </Text>
                  </View>
                </View>
                <View style={styles.docFieldRow}>
                  <View style={styles.docField}>
                    <Text style={[styles.docFieldLabel, { color: colors.textSoft }]}>Document #</Text>
                    <Text style={[styles.docFieldValueMono, { color: colors.text }]}>
                      {revealed ? doc.documentNumber : maskDocNumber(doc.documentNumber)}
                    </Text>
                  </View>
                  <View style={styles.docField}>
                    <Text style={[styles.docFieldLabel, { color: colors.textSoft }]}>DOB</Text>
                    <Text style={[styles.docFieldValue, { color: colors.text }]}>
                      {revealed ? formatDate(doc.dateOfBirth) : '••/••/••••'}
                    </Text>
                  </View>
                </View>
                <View style={styles.docFieldRow}>
                  <View style={styles.docField}>
                    <Text style={[styles.docFieldLabel, { color: colors.textSoft }]}>Expires</Text>
                    <Text
                      style={[
                        styles.docFieldValue,
                        { color: expired ? colors.coral : expiringSoon ? colors.amber : colors.text },
                      ]}
                    >
                      {formatDate(doc.expirationDate)}
                    </Text>
                  </View>
                  {(expired || expiringSoon) && (
                    <View style={[styles.expiryBadge, { backgroundColor: expired ? colors.dangerBg : colors.amber + '18' }]}>
                      <Text style={[styles.expiryBadgeText, { color: expired ? colors.coral : colors.amber }]}>
                        {expired ? 'Expired' : 'Expiring Soon'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={[styles.docCardFooter, { borderTopColor: colors.border }]}>
                <ShieldCheck color={colors.lime} size={13} />
                <Text style={[styles.docFooterText, { color: colors.textSoft }]}>
                  Added {formatDate(doc.addedAt)} · Encrypted
                </Text>
              </View>
            </View>
          );
        })}

        {showAddForm && (
          <Animated.View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: fadeAnim }]}>
            <View style={styles.formHeader}>
              <FileText color={colors.aqua} size={20} />
              <Text style={[styles.formTitle, { color: colors.text }]}>Add Document</Text>
              <Pressable
                onPress={handleCloseAdd}
                style={({ pressed }) => [styles.formCloseBtn, { backgroundColor: colors.card }, pressed && styles.pressed]}
              >
                <X color={colors.textMuted} size={18} />
              </Pressable>
            </View>

            <Text style={[styles.formLabel, { color: colors.textMuted }]}>Document Type</Text>
            <View style={styles.typeGrid}>
              {DOC_TYPE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.id}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setDocType(opt.id);
                  }}
                  style={[
                    styles.typeOption,
                    {
                      backgroundColor: docType === opt.id ? colors.aqua + '18' : colors.card,
                      borderColor: docType === opt.id ? colors.aqua : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.typeOptionIcon, { color: docType === opt.id ? colors.aqua : colors.textMuted }]}>{opt.icon}</Text>
                  <Text style={[styles.typeOptionLabel, { color: docType === opt.id ? colors.aqua : colors.textMuted }]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.formRow}>
              <View style={styles.formFieldHalf}>
                <Text style={[styles.formLabel, { color: colors.textMuted }]}>First Name</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="John"
                  placeholderTextColor={colors.textSoft}
                  autoCapitalize="words"
                  testID="input-first-name"
                />
              </View>
              <View style={styles.formFieldHalf}>
                <Text style={[styles.formLabel, { color: colors.textMuted }]}>Last Name</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Doe"
                  placeholderTextColor={colors.textSoft}
                  autoCapitalize="words"
                  testID="input-last-name"
                />
              </View>
            </View>

            <Text style={[styles.formLabel, { color: colors.textMuted }]}>Document Number</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={docNumber}
              onChangeText={setDocNumber}
              placeholder="D1234567"
              placeholderTextColor={colors.textSoft}
              autoCapitalize="characters"
              testID="input-doc-number"
            />

            <View style={styles.formRow}>
              <View style={styles.formFieldHalf}>
                <Text style={[styles.formLabel, { color: colors.textMuted }]}>Date of Birth</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={dob}
                  onChangeText={(t) => formatDateInput(t, setDob)}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor={colors.textSoft}
                  keyboardType="number-pad"
                  maxLength={10}
                  testID="input-dob"
                />
              </View>
              <View style={styles.formFieldHalf}>
                <Text style={[styles.formLabel, { color: colors.textMuted }]}>Expiration Date</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={expDate}
                  onChangeText={(t) => formatDateInput(t, setExpDate)}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor={colors.textSoft}
                  keyboardType="number-pad"
                  maxLength={10}
                  testID="input-exp-date"
                />
              </View>
            </View>

            <Text style={[styles.formLabel, { color: colors.textMuted }]}>Issuing State (optional)</Text>
            <Pressable
              onPress={() => {
                void Haptics.selectionAsync();
                setStatePickerOpen(!statePickerOpen);
              }}
              style={[styles.formInput, styles.statePicker, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={[styles.statePickerText, { color: issuingState ? colors.text : colors.textSoft }]}>
                {issuingState || 'Select state'}
              </Text>
            </Pressable>
            {statePickerOpen && (
              <View style={[styles.stateGrid, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ScrollView style={styles.stateGridScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                  <View style={styles.stateGridInner}>
                    {US_STATES.map((st) => (
                      <Pressable
                        key={st}
                        onPress={() => {
                          void Haptics.selectionAsync();
                          setIssuingState(st);
                          setStatePickerOpen(false);
                        }}
                        style={[
                          styles.stateChip,
                          {
                            backgroundColor: issuingState === st ? colors.aqua + '20' : colors.surface,
                            borderColor: issuingState === st ? colors.aqua : colors.border,
                          },
                        ]}
                      >
                        <Text style={[styles.stateChipText, { color: issuingState === st ? colors.aqua : colors.textMuted }]}>{st}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit || isAdding}
              style={({ pressed }) => [
                styles.submitBtn,
                { backgroundColor: canSubmit ? colors.aqua : colors.card, opacity: isAdding ? 0.6 : 1 },
                pressed && canSubmit && styles.pressed,
              ]}
              testID="submit-doc-btn"
            >
              <Lock color={canSubmit ? (isDark ? colors.background : '#fff') : colors.textSoft} size={16} />
              <Text style={[styles.submitBtnText, { color: canSubmit ? (isDark ? colors.background : '#fff') : colors.textSoft }]}>
                {isAdding ? 'Encrypting...' : 'Save Securely'}
              </Text>
            </Pressable>

            <View style={styles.formFooterNote}>
              <Lock color={colors.textSoft} size={12} />
              <Text style={[styles.formFooterNoteText, { color: colors.textSoft }]}>
                Stored locally with AES-256 encryption via Secure Enclave
              </Text>
            </View>
          </Animated.View>
        )}

        {documents.length > 0 && (
          <View style={[styles.infoSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <ShieldCheck color={colors.lime} size={16} />
              <Text style={[styles.infoText, { color: colors.textSoft }]}>
                {documents.length} document{documents.length !== 1 ? 's' : ''} stored securely
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Lock color={colors.textSoft} size={14} />
              <Text style={[styles.infoTextSmall, { color: colors.textSoft }]}>
                Data encrypted at rest · Never transmitted · Device-only access
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerCenter: {
    flex: 1,
    gap: 2,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    gap: 14,
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  securityIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityBannerBody: {
    flex: 1,
    gap: 3,
  },
  securityBannerTitle: {
    fontSize: 14,
    fontWeight: '800' as const,
  },
  securityBannerText: {
    fontSize: 12,
    lineHeight: 17,
  },
  emptyState: {
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 6,
  },
  emptyAddBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  docCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  docCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  docTypeBadge: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTypeBadgeText: {
    fontSize: 16,
    fontWeight: '900' as const,
    letterSpacing: 1,
  },
  docCardHeaderBody: {
    flex: 1,
    gap: 2,
  },
  docLabel: {
    fontSize: 17,
    fontWeight: '800' as const,
  },
  docIssuer: {
    fontSize: 13,
  },
  docCardActions: {
    flexDirection: 'row',
    gap: 6,
  },
  docActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docCardBody: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 10,
  },
  docFieldRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-end',
  },
  docField: {
    flex: 1,
    gap: 2,
  },
  docFieldLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  docFieldValue: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  docFieldValueMono: {
    fontSize: 15,
    fontWeight: '700' as const,
    letterSpacing: 1.5,
  },
  expiryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-end',
  },
  expiryBadgeText: {
    fontSize: 11,
    fontWeight: '800' as const,
  },
  docCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  docFooterText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  formCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    gap: 12,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
    flex: 1,
  },
  formCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    marginTop: 2,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    flex: 1,
    minWidth: '45%' as unknown as number,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  typeOptionIcon: {
    fontSize: 14,
    fontWeight: '900' as const,
    letterSpacing: 1,
  },
  typeOptionLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  formFieldHalf: {
    flex: 1,
    gap: 6,
  },
  formInput: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '600' as const,
    borderWidth: 1,
  },
  statePicker: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statePickerText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  stateGrid: {
    borderRadius: 14,
    borderWidth: 1,
    maxHeight: 180,
    overflow: 'hidden',
  },
  stateGridScroll: {
    padding: 8,
  },
  stateGridInner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  stateChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  stateChipText: {
    fontSize: 13,
    fontWeight: '800' as const,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 4,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '800' as const,
  },
  formFooterNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 4,
  },
  formFooterNoteText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  infoSection: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  infoTextSmall: {
    fontSize: 12,
    flex: 1,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
