/**
 * ST11 — Attendance. The student's attendance summary (present / absent /
 * late / rate) and the day-by-day log for the term.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import StudentScaffold from '../components/StudentScaffold';
import { LoadingView, ErrorState, useActionErrorAlert } from '../components/FeedbackViews';
import { StudentAttendancePresenter } from '../../presenters/StudentReadPresenters';
import { StudentModel } from '../../models';
import { colors, typography, spacing } from '../theme';

function toneFor(status) {
  if (status === 'Present') return colors.positive;
  if (status === 'Absent') return colors.error;
  if (status === 'Late') return colors.attention;
  return colors.border;
}

export default function AttendanceScreen({ route }) {
  const studentId = route.params?.studentId;
  const [presenter] = useState(() => new StudentAttendancePresenter(StudentModel));
  const [state, setState] = useState(presenter.initialState);

  useEffect(() => {
    presenter.attach(setState);
    presenter.load(studentId);
    return () => presenter.detach();
     
  }, [presenter, studentId]);

  useActionErrorAlert(state.errorText);

  const att = state.data;

  return (
    <StudentScaffold
      eyebrow="Attendance"
      title="My attendance"
      subtitle={att ? `${att.termLabel} · ${att.summary.rate}% present` : ''}
    >
      {state.status === 'loading' ? <LoadingView label="Loading your attendance…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry(studentId)} />
      ) : null}
      {state.status === 'content' && att ? (
        <View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryTile}>
              <Text style={styles.summaryValue}>{att.summary.present}</Text>
              <Text style={styles.summaryLabel}>Present</Text>
            </View>
            <View style={styles.summaryTile}>
              <Text style={[styles.summaryValue, { color: colors.danger }]}>{att.summary.absent}</Text>
              <Text style={styles.summaryLabel}>Absent</Text>
            </View>
            <View style={styles.summaryTile}>
              <Text style={[styles.summaryValue, { color: '#a87b1f' }]}>{att.summary.late}</Text>
              <Text style={styles.summaryLabel}>Late</Text>
            </View>
            <View style={[styles.summaryTile, styles.rateTile]}>
              <Text style={styles.summaryValue}>{att.summary.rate}%</Text>
              <Text style={styles.summaryLabel}>Rate</Text>
            </View>
          </View>

          <Text style={styles.section}>Day-by-day</Text>
          {att.days.map((d) => (
            <View key={d.date} style={styles.dayRow}>
              <Text style={styles.dayDate}>{d.date}</Text>
              <View style={[styles.dayBadge, { backgroundColor: toneFor(d.status) }]}>
                <Text style={styles.dayBadgeText}>{d.status}</Text>
              </View>
              {d.reason ? <Text style={styles.dayReason}>{d.reason}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}
    </StudentScaffold>
  );
}

const styles = StyleSheet.create({
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  summaryTile: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
  },
  rateTile: { borderColor: colors.primary, borderWidth: 2 },
  summaryValue: { ...typography.title, color: colors.primary },
  summaryLabel: { ...typography.label, marginTop: 4 },
  section: { ...typography.sectionTitle, marginBottom: spacing.sm },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  dayDate: { ...typography.label, width: 100, color: colors.muted },
  dayBadge: { borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  dayBadgeText: { ...typography.label, color: colors.text, fontWeight: '700' },
  dayReason: { ...typography.label, flex: 1, color: colors.muted },
});
