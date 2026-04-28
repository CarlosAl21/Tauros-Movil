import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

const surface = '#111111';
const surfaceAlt = '#191919';
const border = '#2a2a2a';
const text = '#f2f2f2';
const muted = '#9b9b9b';
const accent = '#f4ae1a';
const accentSoft = 'rgba(244, 174, 26, 0.14)';
const blue = '#4da3ff';

type ScreenProps = {
  children: ReactNode;
  scrollable?: boolean;
};

type SectionProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
};

type CardProps = {
  children: ReactNode;
  style?: object;
};

type PillProps = {
  label: string;
  tone?: 'accent' | 'blue' | 'muted' | 'success';
};

export function TaurosScreen({ children, scrollable = true }: ScreenProps) {
  const Wrapper = scrollable ? ScrollView : View;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View pointerEvents="none" style={styles.glowTop} />
      <View pointerEvents="none" style={styles.glowBottom} />
      <Wrapper
        style={styles.wrapper}
        contentContainerStyle={scrollable ? styles.scrollContent : styles.wrapperContent}
        showsVerticalScrollIndicator={false}>
        {children}
      </Wrapper>
    </SafeAreaView>
  );
}

export function TaurosHeader({
  title,
  subtitle,
  right,
  onBack,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onBack?: () => void;
}) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Ionicons name="chevron-back" size={22} color={text} />
      </Pressable>
      <View style={styles.headerTextBlock}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      <View>{right}</View>
    </View>
  );
}

export function TaurosSection({ title, subtitle, actionLabel, onAction, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleBlock}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
        {actionLabel ? (
          <Pressable onPress={onAction} style={styles.sectionAction}>
            <Text style={styles.sectionActionText}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function TaurosCard({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function TaurosPill({ label, tone = 'muted' }: PillProps) {
  return (
    <View style={[styles.pill, pillToneStyles[tone]]}>
      <Text style={[styles.pillText, pillTextToneStyles[tone]]}>{label}</Text>
    </View>
  );
}

export function TaurosStat({ label, value, icon }: { label: string; value: string | number; icon?: ReactNode }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>{icon}</View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function TaurosButton({
  label,
  onPress,
  variant = 'primary',
  compact = false,
  disabled = false,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  compact?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.buttonBase,
        variant === 'primary' ? styles.buttonPrimary : undefined,
        variant === 'secondary' ? styles.buttonSecondary : undefined,
        variant === 'ghost' ? styles.buttonGhost : undefined,
        compact ? styles.buttonCompact : undefined,
        disabled ? styles.buttonDisabled : undefined,
        pressed && !disabled ? styles.buttonPressed : undefined,
      ]}>
      <Text
        style={[
          styles.buttonLabel,
          variant === 'secondary' ? styles.buttonLabelDark : undefined,
          variant === 'ghost' ? styles.buttonLabelLight : undefined,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function TaurosInputButton({
  label,
  href,
  icon,
}: {
  label: string;
  href: string;
  icon?: ReactNode;
}) {
  return (
    <Link href={href} asChild>
      <Pressable style={styles.linkCard}>
        <View style={styles.linkIcon}>{icon}</View>
        <Text style={styles.linkLabel}>{label}</Text>
      </Pressable>
    </Link>
  );
}

export function TaurosInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export function TaurosProgressBar({ value }: { value: number }) {
  const normalized = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${normalized}%` }]} />
    </View>
  );
}

export function TaurosEmptyState({ message }: { message: string }) {
  return (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="alert-circle-outline" size={28} color={muted} />
      <Text style={styles.emptyStateText}>{message}</Text>
    </View>
  );
}

const pillToneStyles = {
  accent: { backgroundColor: accentSoft },
  blue: { backgroundColor: 'rgba(77, 163, 255, 0.14)' },
  muted: { backgroundColor: 'rgba(255, 255, 255, 0.06)' },
  success: { backgroundColor: 'rgba(69, 196, 111, 0.14)' },
};

const pillTextToneStyles = {
  accent: { color: accent },
  blue: { color: blue },
  muted: { color: '#cfcfcf' },
  success: { color: '#45c46f' },
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050505',
  },
  wrapper: {
    flex: 1,
  },
  wrapperContent: {
    padding: 16,
    paddingBottom: 28,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 28,
  },
  glowTop: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 260,
    backgroundColor: 'rgba(244, 174, 26, 0.08)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -140,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 300,
    backgroundColor: 'rgba(77, 163, 255, 0.08)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: surfaceAlt,
    borderWidth: 1,
    borderColor: border,
  },
  headerTextBlock: {
    flex: 1,
  },
  headerTitle: {
    color: text,
    fontSize: 22,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: muted,
    marginTop: 4,
    fontSize: 13,
  },
  section: {
    gap: 12,
    marginTop: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitleBlock: {
    flex: 1,
  },
  sectionTitle: {
    color: text,
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: muted,
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionAction: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(244, 174, 26, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244, 174, 26, 0.2)',
  },
  sectionActionText: {
    color: accent,
    fontWeight: '700',
    fontSize: 12,
  },
  card: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: surface,
    borderWidth: 1,
    borderColor: border,
  },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statCard: {
    flex: 1,
    minWidth: '46%',
    borderRadius: 20,
    backgroundColor: surface,
    borderWidth: 1,
    borderColor: border,
    padding: 14,
    gap: 6,
  },
  statIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(244, 174, 26, 0.12)',
  },
  statValue: {
    color: text,
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    color: muted,
    fontSize: 12,
  },
  buttonBase: {
    minHeight: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonCompact: {
    minHeight: 42,
    borderRadius: 14,
  },
  buttonPrimary: {
    backgroundColor: accent,
  },
  buttonSecondary: {
    backgroundColor: '#ffffff',
  },
  buttonGhost: {
    backgroundColor: surfaceAlt,
    borderWidth: 1,
    borderColor: border,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonPressed: {
    transform: [{ scale: 0.99 }],
  },
  buttonLabel: {
    color: '#111111',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  buttonLabelDark: {
    color: '#111111',
  },
  buttonLabelLight: {
    color: text,
  },
  linkCard: {
    minHeight: 50,
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: surfaceAlt,
    borderWidth: 1,
    borderColor: border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linkIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkLabel: {
    color: text,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoLabel: {
    color: muted,
    fontSize: 13,
  },
  infoValue: {
    color: text,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#232323',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: accent,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  emptyStateText: {
    color: muted,
    fontSize: 13,
    textAlign: 'center',
  },
});
