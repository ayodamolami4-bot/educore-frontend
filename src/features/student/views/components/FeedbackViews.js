/**
 * Shared feedback states for the student app (loading, empty, error, action
 * error alert). Mirrors the admin FeedbackViews so every student screen
 * renders the same loading and error states.
 */
import React from 'react';
import { View, Text, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../theme';

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
      <Text style={[styles.title, { color: colors.danger }]}>{message}</Text>
      {onRetry ? (
        <Text style={styles.link} onPress={onRetry}>
          Try again
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.xl, alignItems: 'center' },
  title: { ...typography.sectionTitle, textAlign: 'center' },
  text: { ...typography.body, color: colors.muted, marginTop: spacing.xs, textAlign: 'center' },
  link: { ...typography.body, color: colors.primary, marginTop: spacing.sm },
});
