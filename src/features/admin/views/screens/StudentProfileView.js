/**
 * AD04 — Student profile (View). Renders the profile sections and forwards
 * the guarded actions (class move, withdrawal) to the Presenter. The
 * double-confirm dialogs live here in the View, per the handoff.
 *
 * Note: no inner ScrollView — AdminScaffold already provides the scrollable
 * body; a nested same-direction ScrollView is what clipped the enrolment
 * lines on Android.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import StatusBadge from '../components/StatusBadge';
import SelectSheet from '../components/SelectSheet';
import LabelledField from '../components/LabelledField';
import { LoadingView, ErrorState, useActionErrorAlert } from '../components/FeedbackViews';
import { PrimaryButton, SecondaryButton } from './AdminHomeView';
import { StudentProfilePresenter } from '../../presenters/StudentProfilePresenter';
import { StudentModel } from '../../models';
import useClassOptions from '../components/useClassOptions';
import { colors, typography, spacing, statusTone } from '../theme';

export default function StudentProfileView({ route, navigation }) {
  const [presenter] = useState(() => new StudentProfilePresenter(StudentModel));
  const [state, setState] = useState(presenter.initialState);
  const [classSheet, setClassSheet] = useState(false);
  const [targetClass, setTargetClass] = useState(null);
  const loadedOnce = useRef(false);
  // Live class list — a class created in AD12 is a valid move target here.
  const CLASSES = useClassOptions();

  useEffect(() => {
    presenter.attach(setState, navigation);
    presenter.load(route.params.studentId);
    // Coming back from Edit student (AD03) the header may have changed;
    // re-fetch on every focus after the first so the profile is never stale.
    const unsubscribe = navigation.addListener('focus', () => {
      if (loadedOnce.current) presenter.load(route.params.studentId);
      loadedOnce.current = true;
    });
    return () => {
      unsubscribe?.remove?.();
      presenter.detach();
    };
  }, [presenter, navigation, route.params]);

  // Withdraw/class-move refusals pop up — they were invisible before.
  useActionErrorAlert(state.withdrawalError, 'Withdrawal not accepted');

  const s = state.student;
  const today = new Date().toISOString().slice(0, 10);

  const confirmWithdrawal = () => {
    Alert.alert(
      'Withdraw this student?',
      `${
        s ? s.name : 'This student'
      } will be marked Withdrawn from ${today}. The student list shows them again under the Withdrawn filter.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: () => presenter.confirmWithdrawal('Withdrawn by admin', today),
        },
      ],
    );
  };

  return (
    <AdminScaffold
      eyebrow="Student profile"
      title={s ? s.name : 'Student'}
      subtitle={s ? `${s.admissionNumber} · ${s.classLabel}` : undefined}
    >
      {state.status === 'loading' ? <LoadingView label="Loading profile…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} />
      ) : null}

      {state.status === 'content' && s ? (
        <View>
          <StatusBadge label={s.status} tone={statusTone[s.status] || 'muted'} />

          <Text style={styles.section}>Enrolments</Text>
          {state.enrolments.length === 0 ? (
            <Text style={styles.muted}>No enrolment history yet.</Text>
          ) : (
            state.enrolments.map((e) => (
              <Text key={String(e.id || e.session)} style={styles.line}>
                {e.sessionLabel || e.session || ''} · {e.classLabel || e.className || ''} ·{' '}
                {e.status || ''}
              </Text>
            ))
          )}

          <Text style={styles.section}>Fee status</Text>
          <Text style={styles.line}>
            {state.feeStatus ? state.feeStatus.summary || 'Up to date' : 'Not available'}
          </Text>

          <Text style={styles.section}>Guardian</Text>
          <Text style={styles.line}>{s.guardianName || 'No guardian recorded'}</Text>
          {s.guardianPhone || s.guardianEmail ? (
            <Text style={styles.line}>
              {[s.guardianPhone, s.guardianEmail].filter(Boolean).join(' · ')}
            </Text>
          ) : null}

          {s.status === 'Withdrawn' || s.status === 'Graduated' ? (
            <Text style={styles.muted}>
              {s.status === 'Withdrawn'
                ? 'No class moves or withdrawal for a withdrawn student.'
                : 'No class moves or withdrawal for a graduated student.'}
            </Text>
          ) : (
            <>
              <Text style={styles.section}>Move class</Text>
              <LabelledField
                label="New class"
                placeholder="Choose the class to move to"
                displayValue={targetClass || ''}
                onPress={() => setClassSheet(true)}
              />
              {state.classMoveError ? <Text style={styles.error}>{state.classMoveError}</Text> : null}
              {state.classMoveNotice ? (
                <Text style={styles.moveNotice}>{state.classMoveNotice}</Text>
              ) : null}
              <SecondaryButton
                label={
                  state.classMoveState === 'saving'
                    ? 'Saving…'
                    : state.classMoveState === 'accepted'
                      ? 'Class move accepted'
                      : 'Request class move'
                }
                disabled={state.classMoveState === 'saving' || !targetClass}
                onPress={() => presenter.confirmClassMove(targetClass, today)}
              />
            </>
          )}

          {s.status === 'Withdrawn' || s.status === 'Graduated' ? (
            <Text style={styles.muted}>
              {s.status === 'Withdrawn'
                ? 'This student has already been withdrawn — no further action here.'
                : 'This student has graduated — withdrawal no longer applies.'}
            </Text>
          ) : (
            <>
              <Text style={styles.section}>Withdraw student</Text>
              {state.withdrawalError ? <Text style={styles.error}>{state.withdrawalError}</Text> : null}
              <PrimaryButton
                label={
                  state.withdrawalState === 'saving'
                    ? 'Saving…'
                    : state.withdrawalState === 'accepted'
                      ? 'Withdrawal accepted'
                      : 'Withdraw this student'
                }
                disabled={state.withdrawalState === 'saving'}
                onPress={confirmWithdrawal}
              />
            </>
          )}

          <Text style={styles.section}>More</Text>
          {/* The gap stops "View reports" and "Edit student" from touching. */}
          <View style={styles.moreButtons}>
            <SecondaryButton label="View reports" onPress={() => presenter.onViewReports()} />
            {s && s.status !== 'Withdrawn' ? (
              <SecondaryButton label="Edit student" onPress={() => presenter.onEditStudent()} />
            ) : null}
          </View>
          {s && s.status === 'Withdrawn' ? (
            <Text style={styles.muted}>
              Withdrawn students are read-only — readmit them before editing their record.
            </Text>
          ) : null}
        </View>
      ) : null}

      <SelectSheet
        visible={classSheet}
        label="Move to class"
        options={CLASSES}
        value={targetClass}
        onSelect={(v) => setTargetClass(v)}
        onClose={() => setClassSheet(false)}
      />
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  section: { ...typography.sectionTitle, marginTop: spacing.lg, marginBottom: spacing.sm },
  line: { ...typography.body, marginBottom: spacing.xs },
  muted: { ...typography.body, color: colors.muted },
  error: { ...typography.label, color: '#a33a2a', marginBottom: spacing.sm },
  moveNotice: { ...typography.label, color: colors.primary, marginBottom: spacing.sm },
  moreButtons: { gap: spacing.sm, marginTop: spacing.xs },
});
