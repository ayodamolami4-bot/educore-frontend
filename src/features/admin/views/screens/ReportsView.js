/**
 * AD20 — Reports (View). The catalogue of class report batches; tapping a
 * published batch opens a learner's report card (subjects, scores, grade
 * bands), and every batch exports.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import AdminScaffold from '../components/AdminScaffold';
import RecordList from '../components/RecordList';
import StatusBadge from '../components/StatusBadge';
import { LoadingView, ErrorState, useActionErrorAlert } from '../components/FeedbackViews';
import { PrimaryButton, SecondaryButton } from './AdminHomeView';
import { ReportsPresenter } from '../../presenters/ReportsPresenter';
import { ReportsModel } from '../../models';
import { colors, typography, spacing } from '../theme';

export default function ReportsView({ navigation }) {
  const [presenter] = useState(() => new ReportsPresenter(ReportsModel));
  const [state, setState] = useState(presenter.initialState);

  useEffect(() => {
    presenter.attach(setState, navigation);
    presenter.load();
    return () => presenter.detach();
  }, [presenter, navigation]);

  useActionErrorAlert(state.errorText);

  /** The export the office actually gets: the CSV is built from the data on
      screen, copied to the clipboard AND opened in the share sheet, where
      "Save to Files" (or email / WhatsApp) stores it. */
  const onExport = async () => {
    await presenter.runExport(state.openBatch);
    const { fileName, csv } = presenter.buildCsv();
    try {
      await Clipboard.setStringAsync(csv);
    } catch (_e) {
      /* clipboard unavailable on this device — the share sheet still works */
    }
    try {
      await Share.share({ title: fileName, message: `${fileName}\n\n${csv}` });
    } catch (_e) {
      /* the office dismissed the sheet — the clipboard copy remains */
    }
  };
  const report = state.report;

  return (
    <AdminScaffold
      eyebrow="Academics"
      title={report ? `Report card — ${report.studentName}` : 'Reports'}
      subtitle={
        report
          ? `${report.classLabel} · ${report.termLabel}`
          : 'Class report batches — open one to see a learner\u2019s report card.'
      }
      onBack={report ? () => presenter.closeReport() : undefined}
    >
      {state.status === 'loading' ? <LoadingView label="Loading the catalogue…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} />
      ) : null}

      {state.status === 'content' && !report ? (
        <View>
          {state.notice ? <Text style={styles.notice}>{state.notice}</Text> : null}
          <RecordList
            items={state.batches.map((b) => ({
              id: b.id,
              title: `${b.classLabel} · ${b.termLabel}`,
              meta: `${b.studentCount} students · published ${b.publishedAt || '—'}`,
              status: b.status,
              raw: b,
            }))}
            onPressItem={(row) => presenter.openReport(row.raw)}
            emptyText="No report batches yet."
          />
          <Text style={styles.hint}>
            Draft batches have no report cards yet. Published batches open a sample learner&apos;s card.
          </Text>
        </View>
      ) : null}

      {state.status === 'content' && report ? (
        <View>
          <Text style={styles.notice}>{state.notice}</Text>
          <View style={styles.badgeRow}>
            <StatusBadge
              label={state.openBatch ? state.openBatch.status : 'Report'}
              tone={state.openBatch && state.openBatch.status === 'Published' ? 'positive' : 'info'}
            />
          </View>
          <Text style={styles.student}>{report.studentName}</Text>
          <Text style={styles.meta}>
            {report.classLabel} · {report.termLabel} · Form teacher: {report.formTeacherName}
          </Text>

          <Text style={styles.section}>Subjects</Text>
          <RecordList
            items={report.subjects.map((s, i) => ({
              id: `${s.subject}-${i}`,
              title: s.subject,
              meta: `CA ${s.caScore} · Exam ${s.examScore} · Total ${s.total} — ${s.grade} (${s.remark})`,
            }))}
            emptyText="No subjects on this report."
          />

          <Text style={styles.summary}>
            Average {report.average}% · Position {report.position} · &quot;{report.overallRemark}&quot;
          </Text>

          <View style={styles.actionsWrap}>
            <PrimaryButton
              label={state.working ? 'Exporting…' : 'Export as CSV (clipboard + share sheet)'}
              disabled={state.working}
              onPress={onExport}
            />
            <View style={styles.secondaryWrap}>
              <SecondaryButton label="Back to the catalogue" onPress={() => presenter.closeReport()} />
            </View>
          </View>
        </View>
      ) : null}
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  notice: { ...typography.body, color: colors.primary, marginBottom: spacing.sm },
  hint: { ...typography.label, color: colors.muted, marginTop: spacing.sm },
  badgeRow: { flexDirection: 'row', marginBottom: spacing.sm },
  student: { ...typography.sectionTitle },
  meta: { ...typography.label, color: colors.muted, marginTop: spacing.xs },
  section: { ...typography.sectionTitle, marginTop: spacing.md, marginBottom: spacing.sm },
  summary: { ...typography.body, marginTop: spacing.sm },
  actionsWrap: { marginTop: spacing.md },
  secondaryWrap: { marginTop: spacing.xs },
});
