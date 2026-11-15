/**
 * AD09 — Teacher profile (View). Contact facts and status at the top, the
 * form-class responsibility, then the subjects taught. Re-fetches on focus.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import RecordList from '../components/RecordList';
import StatusBadge from '../components/StatusBadge';
import SelectSheet from '../components/SelectSheet';
import { LoadingView, EmptyState, ErrorState, useActionErrorAlert } from '../components/FeedbackViews';
import { SecondaryButton } from './AdminHomeView';
import { TeacherProfilePresenter } from '../../presenters/TeacherProfilePresenter';
import { TeacherModel } from '../../models';
import { colors, typography, spacing, statusTone } from '../theme';

const TEACHER_STATUSES = ['Active', 'On Leave', 'Inactive'].map((s) => ({ label: s, value: s }));

export default function TeacherProfileView({ route, navigation }) {
  const [presenter] = useState(() => new TeacherProfilePresenter(TeacherModel));
  const [state, setState] = useState(presenter.initialState);
  const [statusSheet, setStatusSheet] = useState(false);
  const teacherId = route.params?.teacherId;
  const loadedOnce = useRef(false);

  // Status-change refusals pop up like every other guarded action.
  useActionErrorAlert(state.errorText, 'Status change');

  useEffect(() => {
    presenter.attach(setState, navigation);
    if (teacherId) presenter.load(teacherId);
    const unsubscribe = navigation.addListener('focus', () => {
      if (loadedOnce.current && teacherId) presenter.load(teacherId);
      loadedOnce.current = true;
    });
    return () => {
      unsubscribe?.remove?.();
      presenter.detach();
    };
  }, [presenter, teacherId, navigation]);

  const t = state.teacher;

  if (!teacherId) {
    return (
      <AdminScaffold eyebrow="People" title="Teacher profile">
        <EmptyState
          title="No teacher selected"
          hint="Open one from the teachers list — this page shows one teacher and their responsibilities."
        />
      </AdminScaffold>
    );
  }

  return (
    <AdminScaffold
      eyebrow="People"
      title={t ? t.fullName || t.name : 'Teacher profile'}
      subtitle={t ? t.staffNumber : undefined}
    >
      {state.status === 'loading' ? <LoadingView label="Loading the teacher…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} />
      ) : null}

      {state.status === 'content' && t ? (
        <View>
          <View style={styles.badgeRow}>
            <StatusBadge label={t.status} tone={statusTone[t.status] || 'muted'} />
            <Text style={styles.meta}>
              {t.status === 'On Leave' ? 'Away — reassigned for now' : 'On duty this term'}
            </Text>
          </View>

          <Text style={styles.fact}>{t.phone}</Text>
          <Text style={styles.fact}>{t.email}</Text>

          <Text style={styles.section}>Responsibilities</Text>
          <Text style={styles.line}>
            {t.formClass
              ? `Form teacher of ${t.formClass}`
              : 'Not a form teacher — subject duties only'}
          </Text>

          <Text style={styles.section}>Subjects taught</Text>
          <RecordList
            items={(t.subjects || []).map((subject) => ({
              id: subject,
              title: subject,
              meta: t.formClass ? `Including duties in ${t.formClass}` : 'Subject teacher',
            }))}
            emptyText="No subjects assigned yet."
          />

          <Text style={styles.section}>Status</Text>
          {state.notice ? <Text style={styles.notice}>{state.notice}</Text> : null}
          <SecondaryButton
            label={
              state.busy
                ? 'Saving…'
                : `Change status — now ${t.status === 'On Leave' ? 'On Leave' : t.status || 'Active'}`
            }
            disabled={state.busy}
            onPress={() => setStatusSheet(true)}
          />

          <View style={styles.editWrap}>
            <SecondaryButton
              label="Edit profile, subjects and form class"
              onPress={() => navigation.navigate('TeacherForm', { teacherId: t.id })}
            />
          </View>
        </View>
      ) : null}

      <SelectSheet
        visible={statusSheet}
        label="Teacher status — the list and timetable follow at once"
        options={TEACHER_STATUSES}
        value={t ? t.status : null}
        onSelect={(v) => {
          setStatusSheet(false);
          if (v && t && v !== t.status) presenter.changeStatus(v);
        }}
        onClose={() => setStatusSheet(false)}
      />
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  meta: { ...typography.label, color: colors.muted },
  fact: { ...typography.body, marginTop: spacing.sm },
  line: { ...typography.body },
  notice: { ...typography.label, color: colors.primary, marginBottom: spacing.sm },
  section: { ...typography.sectionTitle, marginTop: spacing.lg, marginBottom: spacing.sm },
  editWrap: { marginTop: spacing.md },
});
