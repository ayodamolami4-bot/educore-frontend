/**
 * PlaceholderScreen — shown for the AD templates not built yet. It tells the
 * team exactly what to build next and how the pattern repeats. Replace it by
 * pointing the route in views/screens/index.js at your real View.
 */
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import { colors, typography, spacing } from '../theme';

export default function PlaceholderScreen({ adCode, title, nextSteps }) {
  return (
    <AdminScaffold eyebrow={adCode} title={title} subtitle="Not built yet — here is the recipe.">
      <Text style={styles.intro}>Copy an existing screen trio as the starting point:</Text>
      <Text style={styles.step}>1. models/&lt;Domain&gt;Model.js — add the endpoint calls.</Text>
      <Text style={styles.step}>2. presenters/&lt;Screen&gt;Presenter.js — state + actions.</Text>
      <Text style={styles.step}>
        3. views/screens/&lt;Screen&gt;View.js — render and forward taps.
      </Text>
      <Text style={styles.step}>
        4. Point this route in views/screens/index.js at the new View.
      </Text>
      {nextSteps ? <Text style={styles.next}>{nextSteps}</Text> : null}
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  intro: { ...typography.body, marginBottom: spacing.sm },
  step: { ...typography.body, color: colors.muted, marginBottom: spacing.xs },
  next: { ...typography.label, marginTop: spacing.lg, color: colors.primary },
});
