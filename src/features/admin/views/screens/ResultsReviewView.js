/**
 * AD19 — Review assessment cycles, submitted subject sheets and official
 * report publication. Each action uses the cycle/sheet version from the API.
 */
import React, { useEffect, useState } from 'react';
import { Text, TextInput, View, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import RecordList from '../components/RecordList';
import { LoadingView, ErrorState, EmptyState, Notice } from '../components/FeedbackViews';
import { PrimaryButton, SecondaryButton } from './AdminHomeView';
import { ResultsReviewPresenter } from '../../presenters/ResultsReviewPresenter';
import { ResultsModel } from '../../models';
import { getActiveContext } from '../../api/client';
import { colors, typography, spacing } from '../theme';

export default function ResultsReviewView({ navigation }) {
  const role = getActiveContext().role;
  const [presenter] = useState(() => new ResultsReviewPresenter(ResultsModel, role));
  const [state, setState] = useState(presenter.initialState);
  const [sheetReason, setSheetReason] = useState('');
  const [cycleReason, setCycleReason] = useState('');
  const [principalRemark, setPrincipalRemark] = useState('');
  const [nextResumptionOn, setNextResumptionOn] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [closesOn, setClosesOn] = useState('');
  const [closesTime, setClosesTime] = useState('17:00');

  useEffect(() => {
    presenter.attach(setState, navigation);
    presenter.load();
    const unsubscribe = navigation.addListener('focus', () => {
      if (!state.selectedCycle) presenter.load();
      else presenter.refresh();
    });
    return () => {
      unsubscribe?.remove?.();
      presenter.detach();
    };
  }, [presenter, navigation]);

  const cycle = state.selectedCycle;
  const review = state.review;
  const sheets = review?.sheets ?? [];
  const students = review?.students ?? [];
  const isPrincipal = role === 'PRINCIPAL';

  const openCycle = async (selected) => {
    setSheetReason('');
    setCycleReason('');
    setPrincipalRemark('');
    setNextResumptionOn('');
    setReopenReason('');
    setClosesOn('');
    setClosesTime('17:00');
    await presenter.openCycle(selected);
  };

  const closeCycle = () => {
    presenter.closeCycle();
    setSheetReason('');
    setCycleReason('');
  };

  return (
    <AdminScaffold
      eyebrow="Academics"
      title={review && cycle ? 'Cycle review' : 'Review and publish results'}
      subtitle={cycle
        ? [cycle.classLabel || 'Assigned class', cycle.termLabel || 'Assessment term', cycle.state].filter(Boolean).join(' · ')
        : 'Assessment cycles, subject-sheet review and report-card publication.'}
      onBack={review ? closeCycle : undefined}
    >
      {state.status === 'loading' ? <LoadingView label="Loading assessment cycles…" /> : null}
      {state.status === 'error' ? <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} /> : null}
      {state.notice ? <Notice text={state.notice} /> : null}
      {state.errorText && state.status !== 'error' ? <Notice text={state.errorText} tone="error" /> : null}

      {state.status === 'content' && !review ? (
        <>
          <Text style={styles.section}>Assessment cycles</Text>
          <Text style={styles.hint}>
            A cycle contains the class roster, every subject mark sheet, teacher remarks and the report publication state.
          </Text>
          <RecordList
            items={state.cycles.map((item) => ({
              id: item.id,
              title: item.label || 'Assessment cycle',
              meta: [
                item.opensAt ? 'Opens ' + item.opensAt : '',
                item.closesAt ? 'Closes ' + item.closesAt : '',
                'Cycle ' + item.id,
              ].filter(Boolean).join(' · '),
              status: item.state,
              raw: item,
            }))}
            onPressItem={(row) => openCycle(row.raw)}
            emptyText="No assessment cycles have been created."
          />
        </>
      ) : null}

      {review && cycle ? (
        <View>
          <View style={styles.summaryCard}>
            <Text style={styles.section}>Cycle status</Text>
            <Text style={styles.meta}>State: {review.state}</Text>
            <Text style={styles.meta}>Revision: {review.revision}</Text>
            <Text style={styles.meta}>
              Policy approval: {review.policyApprovedAt ? 'Approved' : 'Not approved'}
            </Text>
            <Text style={styles.meta}>Submitted mark sheets: {sheets.filter((item) => item.state === 'SUBMITTED').length} / {sheets.filter((item) => item.active).length}</Text>
            <Text style={styles.meta}>Missing mark rows: {review.missingMarkRows ?? 0}</Text>
            <Text style={styles.meta}>Active students: {students.length}</Text>
            <Text style={[styles.readiness, review.readyToPublish ? styles.ready : styles.notReady]}>
              {review.readyToPublish ? 'Ready to publish' : 'Not ready to publish'}
            </Text>
          </View>

          {review.rosterIssues?.length ? (
            <View style={styles.issueCard}>
              <Text style={styles.section}>Roster issues</Text>
              {review.rosterIssues.map((issue, index) => (
                <Text key={'roster-' + index} style={styles.problem}>{String(issue.message ?? issue.code ?? issue)}</Text>
              ))}
            </View>
          ) : null}

          <Text style={styles.section}>Subject mark sheets</Text>
          <RecordList
            items={sheets.map((sheet) => ({
              id: sheet.assignmentId,
              title: sheet.subjectName,
              meta: [
                sheet.teacherId ? 'Teacher ' + sheet.teacherId : '',
                'Assignment ' + sheet.assignmentId,
                'Version ' + sheet.version,
                sheet.active ? '' : 'Inactive roster',
              ].filter(Boolean).join(' · '),
              status: sheet.active ? sheet.state : 'INACTIVE',
              raw: sheet,
            }))}
            onPressItem={(row) => presenter.selectSheet(row.raw)}
            emptyText="No subject sheets have been created for this cycle."
          />

          {state.selectedSheet ? (
            <View style={styles.actionCard}>
              <Text style={styles.section}>Selected subject sheet</Text>
              <Text style={styles.meta}>{state.selectedSheet.subjectName} · {state.selectedSheet.state}</Text>
              {role === 'PRINCIPAL' || role === 'SCHOOL_OFFICE' ? (
                <>
                  <TextInput
                    style={styles.input}
                    value={sheetReason}
                    onChangeText={setSheetReason}
                    placeholder="Reason to return this submitted sheet (at least 5 characters)"
                    placeholderTextColor={colors.muted}
                    maxLength={500}
                  />
                  <SecondaryButton
                    label={state.busy ? 'Returning…' : 'Return selected submitted sheet'}
                    disabled={state.busy || state.selectedSheet.state !== 'SUBMITTED' || sheetReason.trim().length < 5}
                    onPress={async () => {
                      const returned = await presenter.returnSheet(sheetReason);
                      if (returned) setSheetReason('');
                    }}
                  />
                </>
              ) : null}
            </View>
          ) : null}

          <Text style={styles.section}>Student report completeness</Text>
          <RecordList
            items={students.map((student) => ({
              id: student.studentId,
              title: student.fullName,
              meta: [
                student.admissionNumber,
                (student.subjects ?? []).length + ' subject marks',
                student.remark ? 'Class remark recorded' : 'Class remark missing',
              ].filter(Boolean).join(' · '),
              status: student.remark ? 'REMARKED' : 'NEEDS REMARK',
            }))}
            emptyText="No active students in this cycle's assessment roster."
          />

          {review.state === 'REVIEW' && ['PRINCIPAL', 'SCHOOL_OFFICE'].includes(role) ? (
            <View style={styles.actionCard}>
              <Text style={styles.section}>Return the complete class package</Text>
              <TextInput
                style={styles.input}
                value={cycleReason}
                onChangeText={setCycleReason}
                placeholder="Why is the class package being returned?"
                placeholderTextColor={colors.muted}
                maxLength={500}
              />
              <SecondaryButton
                label={state.busy ? 'Returning…' : 'Return class package for correction'}
                disabled={state.busy || cycleReason.trim().length < 5}
                onPress={async () => {
                  const returned = await presenter.returnReview(cycleReason);
                  if (returned) setCycleReason('');
                }}
              />
            </View>
          ) : null}

          {review.state === 'REVIEW' && isPrincipal ? (
            <View style={styles.actionCard}>
              <Text style={styles.section}>Publish official report cards</Text>
              <Text style={styles.hint}>
                The backend publishes immutable report snapshots for the cycle's active students. It will reject this action unless all sheets, marks and class remarks are complete.
              </Text>
              <TextInput
                style={styles.input}
                value={principalRemark}
                onChangeText={setPrincipalRemark}
                placeholder="Principal's report remark (at least 5 characters)"
                placeholderTextColor={colors.muted}
                maxLength={1500}
                multiline
              />
              <TextInput
                style={styles.input}
                value={nextResumptionOn}
                onChangeText={setNextResumptionOn}
                placeholder="Next resumption date · YYYY-MM-DD"
                placeholderTextColor={colors.muted}
              />
              <PrimaryButton
                label={state.busy ? 'Publishing…' : 'Publish report cards'}
                disabled={state.busy || !review.readyToPublish || principalRemark.trim().length < 5 || !/^\d{4}-\d{2}-\d{2}$/.test(nextResumptionOn)}
                onPress={async () => {
                  const published = await presenter.publish({ principalRemark, nextResumptionOn });
                  if (published) {
                    setPrincipalRemark('');
                    setNextResumptionOn('');
                  }
                }}
              />
            </View>
          ) : null}

          {review.state === 'PUBLISHED' && isPrincipal ? (
            <View style={styles.actionCard}>
              <Text style={styles.section}>Open a correction window</Text>
              <Text style={styles.hint}>
                Reopening creates a reasoned correction window. Select a subject sheet above to limit the correction to that sheet, or leave the sheet unselected for a cycle-wide correction.
              </Text>
              <TextInput
                style={styles.input}
                value={reopenReason}
                onChangeText={setReopenReason}
                placeholder="Correction reason (at least 5 characters)"
                placeholderTextColor={colors.muted}
                maxLength={500}
              />
              <TextInput
                style={styles.input}
                value={closesOn}
                onChangeText={setClosesOn}
                placeholder="Correction window closes · YYYY-MM-DD"
                placeholderTextColor={colors.muted}
              />
              <TextInput
                style={styles.input}
                value={closesTime}
                onChangeText={setClosesTime}
                placeholder="Closing time, Lagos · HH:MM"
                placeholderTextColor={colors.muted}
              />
              <PrimaryButton
                label={state.busy ? 'Opening correction window…' : 'Reopen for correction'}
                disabled={state.busy || reopenReason.trim().length < 5 || !/^\d{4}-\d{2}-\d{2}$/.test(closesOn)}
                onPress={async () => {
                  const reopened = await presenter.reopen({
                    reason: reopenReason,
                    closesOn,
                    closesTime,
                  });
                  if (reopened) {
                    setReopenReason('');
                    setClosesOn('');
                  }
                }}
              />
            </View>
          ) : null}

          <SecondaryButton title="Refresh cycle review" label="Refresh cycle review" onPress={() => presenter.refresh()} disabled={state.busy} />
          <SecondaryButton label="Back to assessment cycles" onPress={closeCycle} disabled={state.busy} />
        </View>
      ) : null}
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  section: { ...typography.sectionTitle, marginTop: spacing.md, marginBottom: spacing.sm },
  hint: { ...typography.label, color: colors.muted, marginBottom: spacing.sm },
  meta: { ...typography.label, color: colors.muted, marginTop: spacing.xs },
  summaryCard: {
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
  },
  issueCard: {
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  actionCard: {
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  readiness: { ...typography.body, fontWeight: '700', marginTop: spacing.sm },
  ready: { color: '#217346' },
  notReady: { color: '#9A5A15' },
  problem: { ...typography.label, color: '#A33A2A', marginTop: spacing.xs },
  input: {
    ...typography.input,
    color: colors.text,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 46,
    marginTop: spacing.sm,
  },
});
