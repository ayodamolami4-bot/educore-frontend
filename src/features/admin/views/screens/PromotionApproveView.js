/**
 * AD27 — Approve promotion and graduation (View). The list of previews with
 * their decision summaries; open one, validate, then confirm in a dialog.
 * Confirmation is the step that actually moves the classes up.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import RecordList from '../components/RecordList';
import StatusBadge from '../components/StatusBadge';
import { LoadingView, ErrorState, useActionErrorAlert } from '../components/FeedbackViews';
import { PrimaryButton, SecondaryButton } from './AdminHomeView';
import { PromotionApprovePresenter } from '../../presenters/PromotionApprovePresenter';
import { PromotionModel } from '../../models';
import { destinationLabel } from '../../utils/validators';
import { colors, typography, spacing } from '../theme';

export default function PromotionApproveView({ navigation }) {
  const [presenter] = useState(() => new PromotionApprovePresenter(PromotionModel));
  const [state, setState] = useState(presenter.initialState);

  useEffect(() => {
    presenter.attach(setState, navigation);
    presenter.load();
    return () => presenter.detach();
  }, [presenter, navigation]);

  useActionErrorAlert(state.errorText);

  const preview = state.preview;

  const onConfirm = () => {
    Alert.alert(
      `Confirm ${preview.classLabel}?`,
      `Promote ${preview.summary.promote} · repeat ${preview.summary.repeat} · graduate ${preview.summary.graduate}. ` +
        'This moves the students for the next session and cannot be undone here.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', style: 'default', onPress: () => presenter.confirm() },
      ],
    );
  };

  return (
    <AdminScaffold
      eyebrow="Records"
      title={preview ? `Approve — ${preview.classLabel}` : 'Approve promotion and graduation'}
      subtitle={
        preview
          ? `${preview.classLabel} · ${preview.status}`
          : 'Validate the saved previews, then confirm — confirming moves the students.'
      }
      onBack={preview ? () => presenter.backToList() : undefined}
    >
      {state.status === 'loading' ? <LoadingView label="Loading the previews…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} />
      ) : null}

      {state.status === 'content' && !preview ? (
        <View>
          {state.notice ? <Text style={styles.notice}>{state.notice}</Text> : null}
          <RecordList
            items={state.previews.map((p) => ({
              id: p.id,
              title: `${p.classLabel} · ${p.sessionLabel}`,
              meta: `Promote ${p.summary.promote} · repeat ${p.summary.repeat} · graduate ${p.summary.graduate}`,
              status: p.status,
              raw: p,
            }))}
            onPressItem={(row) => presenter.open(row.raw.id)}
            emptyText={'No previews yet — build them in "Preview promotion or completion".'}
          />
        </View>
      ) : null}

      {state.status === 'content' && preview ? (
        <View>
          {state.notice ? <Text style={styles.notice}>{state.notice}</Text> : null}
          <View style={styles.badgeRow}>
            <StatusBadge
              label={preview.status}
              tone={preview.status === 'Confirmed' ? 'positive' : 'info'}
            />
            <Text style={styles.badgeMeta}>
              Promote {preview.summary.promote} · repeat {preview.summary.repeat} · graduate{' '}
              {preview.summary.graduate}
            </Text>
          </View>

          <RecordList
            items={preview.rows.map((r) => ({
              id: String(r.studentId),
              title: r.fullName,
              // Every row names WHERE the student goes — same wording as the
              // preview screen.
              meta: `Average ${r.average}% — ${destinationLabel(preview.classLabel, r.decision)}`,
              status: r.decision,
              raw: r,
            }))}
            emptyText="No students in this preview."
          />

          {preview.status === 'Confirmed' ? (
            <Text style={styles.hint}>
              Confirmed — the class moves next session and this preview is frozen.
            </Text>
          ) : (
            <View style={styles.actionsWrap}>
              <PrimaryButton
                label={state.busy ? 'Working…' : 'Confirm promotion'}
                disabled={state.busy}
                onPress={onConfirm}
              />
              <View style={styles.secondaryWrap}>
                <SecondaryButton
                  label={state.busy ? 'Checking…' : 'Validate first'}
                  disabled={state.busy}
                  onPress={() => presenter.validate()}
                />
              </View>
            </View>
          )}
        </View>
      ) : null}
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  notice: { ...typography.body, color: colors.primary, marginBottom: spacing.sm },
  hint: { ...typography.label, color: colors.muted, marginTop: spacing.sm },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  badgeMeta: { ...typography.label, color: colors.muted, flex: 1 },
  actionsWrap: { marginTop: spacing.md },
  secondaryWrap: { marginTop: spacing.xs },
});
