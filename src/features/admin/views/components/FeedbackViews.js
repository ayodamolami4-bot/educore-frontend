/** Shared feedback states used between successful screens (design handoff, COMPONENT STATES). */
import React from 'react';
import { View, Text, ActivityIndicator, Pressable, Alert, StyleSheet } from 'react-native';
import { colors, typography, spacing, touchTarget } from '../theme';

/**
 * Action errors (save failed, duplicate refused, guard tripped…) are shown as
 * a popup dialog, per the school's preference — not as inline text. Call this
 * once per screen with the state's errorText; presenters null it before every
 * attempt, so each failure alerts exactly once.
 */
export function useActionErrorAlert(errorText, title = 'Action failed') {
  React.useEffect(() => {
    if (errorText) Alert.alert(title, errorText);
  }, [errorText, title]);
}

export function LoadingView({ label = 'Loading…' }) {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title = 'Nothing here yet', hint }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {hint ? <Text style={styles.text}>{hint}</Text> : null}
    </View>
  );
}

export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: '#a33a2a' }]}>{message}</Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [styles.retry, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: spacing.xl * 2, gap: spacing.sm },
  title: { ...typography.sectionTitle, textAlign: 'center' },
  text: { ...typography.body, color: colors.muted, textAlign: 'center' },
  retry: {
    ...touchTarget,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  retryText: { color: colors.onPrimary, fontWeight: '700', fontSize: 14 },
});
