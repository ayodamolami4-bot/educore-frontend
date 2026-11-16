/**
 * ST13 — Student school record, academic history, external results and
 * published historical report attachments. Only fields exposed to the
 * authenticated Student role are displayed here.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import StudentScaffold from '../components/StudentScaffold';
import {
  LoadingView,
  ErrorState,
  EmptyState,
  useActionErrorAlert,
} from '../components/FeedbackViews';
import { StudentProfilePresenter } from '../../presenters/StudentReadPresenters';
import { StudentModel } from '../../models';
import { colors, typography, spacing } from '../theme';

function Field({ label, value }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || '—'}</Text>
    </View>
  );
}

export default function ProfileScreen({ route }) {
  const studentId = route.params?.studentId;
  const [presenter] = useState(() => new StudentProfilePresenter(StudentModel));
  const [state, setState] = useState(presenter.initialState);

  useEffect(() => {
    presenter.attach(setState);
    presenter.load(studentId);
    return () => presenter.detach();
  }, [presenter, studentId]);

  useActionErrorAlert(state.errorText);

  const p = state.profile;

  return (
    <StudentScaffold
      eyebrow="Profile"
      title={p ? p.studentName : 'My profile'}
      subtitle={p ? `${p.classLabel} · ${p.admissionNumber}` : ''}
    >
      {state.status === 'loading' ? <LoadingView label="Loading your profile…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry(studentId)} />
      ) : null}
      {state.status === 'content' && p ? (
        <View>
          <Text style={styles.section}>School record</Text>
          <Field label="Full name" value={p.studentName} />
          <Field label="Admission number" value={p.admissionNumber} />
          <Field label="Student status" value={p.status} />
          <Field label="Class" value={p.classLabel} />
          {p.department ? <Field label="Department" value={p.department} /> : null}

          <Text style={styles.section}>Academic history</Text>
          {p.academicHistory && p.academicHistory.length > 0 ? (
            p.academicHistory.map((h, i) => (
              <View key={i} style={styles.historyRow}>
                <Text style={styles.historyTerm}>
                  {h.sessionLabel} · {h.termLabel}
                </Text>
                <Text style={styles.historyMeta}>
                  {h.classLabel} · {h.status}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.empty}>No history yet.</Text>
          )}

          <Text style={styles.section}>External results</Text>
          {state.externalResults.length === 0 ? (
            <EmptyState
              title="No external results"
              hint="WAEC/NECO results appear here once recorded by the office."
            />
          ) : (
            state.externalResults.map((r) => (
              <View key={r.id} style={styles.historyRow}>
                <Text style={styles.historyTerm}>{r.examName}</Text>
                <Text style={styles.historyMeta}>
                  {r.subjects} subjects · {r.grade}
                </Text>
              </View>
            ))
          )}

          <Text style={styles.section}>Historical report attachments</Text>
          {state.historicalReports.length === 0 ? (
            <EmptyState
              title="No historical attachments"
              hint="Past report cards the office attaches appear here."
            />
          ) : (
            state.historicalReports.map((r) => (
              <View key={r.id} style={styles.historyRow}>
                <Text style={styles.historyTerm}>{r.termLabel}</Text>
                <Text style={styles.historyMeta}>{r.fileName}</Text>
              </View>
            ))
          )}
        </View>
      ) : null}
    </StudentScaffold>
  );
}

const styles = StyleSheet.create({
  section: { ...typography.sectionTitle, marginTop: spacing.lg, marginBottom: spacing.xs },
  field: {
    flexDirection: 'row',
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  fieldLabel: { ...typography.label, width: 140 },
  fieldValue: { ...typography.body, flex: 1 },
  historyRow: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  historyTerm: { ...typography.body, fontWeight: '600' },
  historyMeta: { ...typography.label, marginTop: 2 },
  empty: { ...typography.body, color: colors.muted, paddingVertical: spacing.sm },
});
