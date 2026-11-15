/**
 * AD06 — Guardian profile (View). Contact facts and Parent app account
 * state at the top, the linked children underneath; a child opens the
 * student's profile. Re-fetches on focus.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import RecordList from '../components/RecordList';
import StatusBadge from '../components/StatusBadge';
import { LoadingView, EmptyState, ErrorState } from '../components/FeedbackViews';
import { GuardianProfilePresenter } from '../../presenters/GuardianProfilePresenter';
import { GuardianModel } from '../../models';
import { colors, typography, spacing, statusTone } from '../theme';

export default function GuardianProfileView({ route, navigation }) {
  const [presenter] = useState(() => new GuardianProfilePresenter(GuardianModel));
  const [state, setState] = useState(presenter.initialState);
  const guardianId = route.params?.guardianId;
  const loadedOnce = useRef(false);

  useEffect(() => {
    presenter.attach(setState, navigation);
    if (guardianId) presenter.load(guardianId);
    // Links can be revoked elsewhere, so re-fetch on every focus after the
    // first.
    const unsubscribe = navigation.addListener('focus', () => {
      if (loadedOnce.current && guardianId) presenter.load(guardianId);
      loadedOnce.current = true;
    });
    return () => {
      unsubscribe?.remove?.();
      presenter.detach();
    };
  }, [presenter, guardianId, navigation]);

  const g = state.guardian;

  if (!guardianId) {
    return (
      <AdminScaffold eyebrow="People" title="Guardian profile">
        <EmptyState
          title="No guardian selected"
          hint="Open one from Parents and guardians — this page shows one guardian and their children."
        />
      </AdminScaffold>
    );
  }

  return (
    <AdminScaffold
      eyebrow="People"
      title={g ? g.fullName : 'Guardian profile'}
      subtitle={g ? `${g.relationship} of the linked student${g.childrenCount > 1 ? 's' : ''}` : undefined}
    >
      {state.status === 'loading' ? <LoadingView label="Loading the guardian…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} />
      ) : null}

      {state.status === 'content' && g ? (
        <View>
          <View style={styles.badgeRow}>
            <StatusBadge label={g.status} tone={statusTone[g.status] || 'muted'} />
            <Text style={styles.meta}>
              {g.status === 'Active'
                ? 'Uses the Parent app'
                : 'Invite sent — waiting to be accepted'}
            </Text>
          </View>

          <Text style={styles.fact}>{g.phone}</Text>
          <Text style={styles.fact}>{g.email}</Text>

          <Text style={styles.section}>Children linked</Text>
          <RecordList
            items={(g.children || []).map((c) => ({
              id: `${c.studentId}-${c.relationship}`,
              title: c.name,
              meta: `${c.classLabel} · ${c.relationship}`,
            }))}
            onPressItem={(row) => {
              const child = (g.children || []).find(
                (c) => `${c.studentId}-${c.relationship}` === row.id,
              );
              presenter.onOpenChild(child);
            }}
            emptyText="No children linked yet."
          />
        </View>
      ) : null}
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  meta: { ...typography.label, color: colors.muted },
  fact: { ...typography.body, marginTop: spacing.sm },
  section: { ...typography.sectionTitle, marginTop: spacing.lg, marginBottom: spacing.sm },
});
