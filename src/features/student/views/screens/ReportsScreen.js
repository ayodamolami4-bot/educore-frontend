/**
 * ST09/ST10 — Results list + report card. The list shows the student's
 * published report cards; tapping one opens the card with its subject
 * scores, average and the class teacher's remark. Report data and marks are
 * published snapshots; the PDF is downloaded from the report endpoint.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import StudentScaffold from '../components/StudentScaffold';
import RecordList from '../components/RecordList';
import {
  LoadingView,
  ErrorState,
  EmptyState,
  useActionErrorAlert,
} from '../components/FeedbackViews';
import { StudentReportsPresenter } from '../../presenters/StudentReportsPresenter';
import { StudentModel } from '../../models';
import { colors, typography, spacing } from '../theme';

export default function ReportsScreen({ route }) {
  const studentId = route.params?.studentId;
  const [presenter] = useState(() => new StudentReportsPresenter(StudentModel));
  const [state, setState] = useState(presenter.initialState);

  useEffect(() => {
    presenter.attach(setState);
    presenter.load(studentId);
    return () => presenter.detach();
  }, [presenter, studentId]);

  useActionErrorAlert(state.errorText);

  const report = state.report;

  return (
    <StudentScaffold
      eyebrow="Results"
      title={report ? report.termLabel : 'My results'}
      subtitle={
        report ? `${report.classLabel} · average ${report.average}%` : 'Published report cards'
      }
    >
      {state.status === 'loading' && !report ? <LoadingView label="Loading your results…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry(studentId)} />
      ) : null}

      {!report && state.status === 'content' ? (
        state.items.length === 0 ? (
          <EmptyState title="No report cards yet" hint="Your results appear here once published." />
        ) : (
          <RecordList
            items={state.items.map((r) => ({
              id: r.id,
              title: `${r.termLabel} · ${r.classLabel}`,
              meta: `Average ${r.average}%`,
              status: 'Published',
            }))}
            onPressItem={(row) => presenter.open(studentId, row.id)}
            emptyText="No report cards yet."
          />
        )
      ) : null}

      {report ? (
        <View>
          <Pressable style={styles.backLink} onPress={() => presenter.closeReport()}>
            <Text style={styles.backText}>‹ All results</Text>
          </Pressable>
          <Text style={styles.section}>
            {report.termLabel} · {report.classLabel}
          </Text>
          <Text style={styles.meta}>Average: {report.average}%</Text>
          <Text style={styles.meta}>Class teacher&apos;s remark</Text>
          <Text style={styles.remark}>{report.overallRemark || 'No class teacher remark recorded.'}</Text>
          {report.principalRemark ? (
            <View>
              <Text style={styles.meta}>Principal&apos;s remark</Text>
              <Text style={styles.remark}>{report.principalRemark}</Text>
            </View>
          ) : null}

          <Text style={styles.section}>Subjects</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableHeadCell, { flex: 2 }]}>Subject</Text>
              <Text style={[styles.tableCell, styles.tableHeadCell]}>CA1</Text>
              <Text style={[styles.tableCell, styles.tableHeadCell]}>CA2</Text>
              <Text style={[styles.tableCell, styles.tableHeadCell]}>Exam</Text>
              <Text style={[styles.tableCell, styles.tableHeadCell]}>Total</Text>
              <Text style={[styles.tableCell, styles.tableHeadCell]}>Grade</Text>
            </View>
            {report.subjects.map((s, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>{s.subject}</Text>
                <Text style={styles.tableCell}>{s.ca1 ?? '—'}</Text>
                <Text style={styles.tableCell}>{s.ca2 ?? '—'}</Text>
                <Text style={styles.tableCell}>{s.examScore ?? '—'}</Text>
                <Text style={styles.tableCell}>{s.total ?? '—'}</Text>
                <Text style={[styles.tableCell, { fontWeight: '700' }]}>{s.grade || '—'}</Text>
              </View>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [styles.exportBtn, pressed && { opacity: 0.7 }]}
            onPress={() => presenter.exportReport(studentId, report.id)}
            disabled={state.exporting}
          >
            <Text style={styles.exportText}>
              {state.exporting ? 'Requesting…' : 'Export this report card'}
            </Text>
          </Pressable>
          {state.exportNotice ? <Text style={styles.notice}>{state.exportNotice}</Text> : null}
        </View>
      ) : null}
    </StudentScaffold>
  );
}

const styles = StyleSheet.create({
  backLink: { alignSelf: 'flex-start', marginBottom: spacing.sm },
  backText: { ...typography.body, color: colors.primary, fontWeight: '600' },
  section: { ...typography.sectionTitle, marginTop: spacing.lg, marginBottom: spacing.xs },
  meta: { ...typography.body, marginBottom: 2 },
  remark: { ...typography.body, fontStyle: 'italic', color: colors.muted, marginTop: spacing.xs },
  table: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  tableHeader: { flexDirection: 'row', backgroundColor: colors.surface },
  tableHeadCell: { fontWeight: '700', color: colors.muted },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  tableCell: { ...typography.label, flex: 1, padding: spacing.sm },
  exportBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  exportText: { color: colors.onPrimary, fontWeight: '700', ...typography.body },
  notice: { ...typography.label, color: colors.muted, marginTop: spacing.sm, textAlign: 'center' },
});
