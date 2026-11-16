/**
 * AD18 — Read-only adopted grading policy and assessment-cycle approval.
 * The backend owns the grading rules; only a Principal can approve a cycle
 * and open its versioned mark-entry window.
 */
import React, { useEffect, useState } from 'react';
import { Text, TextInput, View, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import RecordList from '../components/RecordList';
import { LoadingView, ErrorState, Notice, useActionErrorAlert } from '../components/FeedbackViews';
import { PrimaryButton, SecondaryButton } from './AdminHomeView';
import { AssessmentRulesPresenter } from '../../presenters/AssessmentRulesPresenter';
import { AssessmentModel } from '../../models';
import { getActiveContext } from '../../api/client';
import { colors, typography, spacing } from '../theme';

export default function AssessmentRulesView({ navigation }) {
  const role = getActiveContext().role;
  const [presenter] = useState(() => new AssessmentRulesPresenter(AssessmentModel, role));
  const [state, setState] = useState(presenter.initialState);
  const [opensOn, setOpensOn] = useState('');
  const [opensTime, setOpensTime] = useState('08:00');
  const [closesOn, setClosesOn] = useState('');
  const [closesTime, setClosesTime] = useState('17:00');
  const [reason, setReason] = useState('');

  useEffect(() => {
    presenter.attach(setState, navigation);
    presenter.load();
    return () => presenter.detach();
  }, [presenter, navigation]);

  useActionErrorAlert(state.errorText, 'Assessment cycle');

  const policy = state.policy;
  const selected = state.selectedCycle;
  const bands = policy?.gradeBands ?? {};

  const cycles = state.cycles.map((cycle) => ({
    id: cycle.id,
    title: 'Cycle ' + String(cycle.id).slice(0, 8),
    meta: [
      'Term ' + cycle.termId,
      'Class ' + cycle.classId,
      cycle.opensAt ? 'Opens ' + cycle.opensAt : '',
      cycle.closesAt ? 'Closes ' + cycle.closesAt : '',
    ].filter(Boolean).join(' · '),
    status: cycle.state,
    raw: cycle,
  }));

  return (
    <AdminScaffold
      eyebrow="Academics"
      title="Grading policy and assessment windows"
      subtitle="The adopted school grading policy is fixed. Approvals and mark-entry windows are recorded on each assessment cycle."
    >
      {state.status === 'loading' ? <LoadingView label="Loading grading policy and assessment cycles…" /> : null}
      {state.status === 'error' ? <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} /> : null}
      {state.notice ? <Notice text={state.notice} /> : null}

      {state.status === 'content' && policy ? (
        <>
          <View style={styles.policyCard}>
            <Text style={styles.section}>Adopted scoring policy</Text>
            <View style={styles.weightRow}>
              <View style={styles.weight}>
                <Text style={styles.number}>{policy.ca1Maximum}/20</Text>
                <Text style={styles.label}>CA 1</Text>
              </View>
              <View style={styles.weight}>
                <Text style={styles.number}>{policy.ca2Maximum}/20</Text>
                <Text style={styles.label}>CA 2</Text>
              </View>
              <View style={styles.weight}>
                <Text style={styles.number}>{policy.examMaximum}/60</Text>
                <Text style={styles.label}>Exam</Text>
              </View>
            </View>
            <Text style={styles.body}>One-decimal score precision · maximum 100 marks</Text>
            <Text style={styles.body}>Class ranking: {policy.rankingEnabled ? 'enabled' : 'not produced'}</Text>
            <Text style={styles.hint}>
              Configuration: {state.configuration || 'Adopted school policy'}
            </Text>
            <Text style={styles.hint}>{state.approvalGuidance}</Text>

            <Text style={styles.section}>Grade bands</Text>
            {Object.entries(bands).sort((a, b) => b[1] - a[1]).map(([grade, threshold]) => (
              <View key={grade} style={styles.bandRow}>
                <Text style={styles.bandGrade}>{grade}</Text>
                <Text style={styles.bandThreshold}>From {threshold}%</Text>
              </View>
            ))}
            <Text style={styles.hint}>
              This policy is not editable in the current backend. Its version is frozen and approved on each assessment cycle.
            </Text>
          </View>

          <Text style={styles.section}>Assessment cycles</Text>
          <Text style={styles.body}>
            Select a cycle to review its policy approval and mark-entry window. A Principal is required for approval or opening.
          </Text>
          <RecordList
            items={cycles}
            onPressItem={(row) => {
              presenter.selectCycle(row.raw);
              setOpensOn(row.raw.opensAt?.slice(0, 10) ?? '');
              setOpensTime(row.raw.opensAt?.slice(11, 16) ?? '08:00');
              setClosesOn(row.raw.closesAt?.slice(0, 10) ?? '');
              setClosesTime(row.raw.closesAt?.slice(11, 16) ?? '17:00');
              setReason('');
            }}
            emptyText="No assessment cycles have been created yet."
          />

          {selected ? (
            <View style={styles.cycleCard}>
              <Text style={styles.section}>Selected cycle</Text>
              <Text style={styles.body}>Cycle ID: {selected.id}</Text>
              <Text style={styles.body}>State: {selected.state}</Text>
              <Text style={styles.body}>
                Policy approval: {selected.policyApprovedAt ? 'Approved' : 'Not approved'}
              </Text>
              {selected.opensAt ? <Text style={styles.body}>Opens: {selected.opensAt}</Text> : null}
              {selected.closesAt ? <Text style={styles.body}>Closes: {selected.closesAt}</Text> : null}

              {role === 'PRINCIPAL' && selected.state === 'DRAFT' && !selected.policyApprovedAt ? (
                <>
                  <Text style={styles.fieldLabel}>Approval / opening reason</Text>
                  <TextInput
                    style={styles.input}
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Why is this policy approved for this cycle?"
                    placeholderTextColor={colors.muted}
                    maxLength={500}
                  />
                  <SecondaryButton
                    label={state.saving ? 'Approving…' : 'Approve adopted policy'}
                    disabled={state.saving || reason.trim().length < 5}
                    onPress={async () => {
                      const approved = await presenter.approvePolicy(reason);
                      if (approved) setReason('');
                    }}
                  />
                </>
              ) : null}

              {role === 'PRINCIPAL' && ['DRAFT', 'OPEN'].includes(selected.state) ? (
                <>
                  <Text style={styles.section}>Mark-entry window</Text>
                  <Text style={styles.fieldLabel}>Opens on (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.input}
                    value={opensOn}
                    onChangeText={setOpensOn}
                    placeholder="2026-11-20"
                    placeholderTextColor={colors.muted}
                  />
                  <Text style={styles.fieldLabel}>Opens at (HH:MM, Lagos time)</Text>
                  <TextInput
                    style={styles.input}
                    value={opensTime}
                    onChangeText={setOpensTime}
                    placeholder="08:00"
                    placeholderTextColor={colors.muted}
                  />
                  <Text style={styles.fieldLabel}>Closes on (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.input}
                    value={closesOn}
                    onChangeText={setClosesOn}
                    placeholder="2026-11-27"
                    placeholderTextColor={colors.muted}
                  />
                  <Text style={styles.fieldLabel}>Closes at (HH:MM, Lagos time)</Text>
                  <TextInput
                    style={styles.input}
                    value={closesTime}
                    onChangeText={setClosesTime}
                    placeholder="17:00"
                    placeholderTextColor={colors.muted}
                  />
                  <Text style={styles.fieldLabel}>Audit reason</Text>
                  <TextInput
                    style={styles.input}
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Why is this mark-entry window being opened or changed?"
                    placeholderTextColor={colors.muted}
                    maxLength={500}
                  />
                  <PrimaryButton
                    label={state.saving ? 'Saving window…' : selected.state === 'OPEN' ? 'Update mark-entry window' : 'Open mark entry'}
                    disabled={
                      state.saving ||
                      !opensOn ||
                      !closesOn ||
                      reason.trim().length < 5
                    }
                    onPress={async () => {
                      const opened = await presenter.openCycle({
                        opensOn,
                        opensTime,
                        closesOn,
                        closesTime,
                        reason,
                      });
                      if (opened) setReason('');
                    }}
                  />
                </>
              ) : null}
              {role !== 'PRINCIPAL' ? (
                <Notice text="School Office can review cycle policy and state. Only the Principal can approve the policy or open the mark-entry window." />
              ) : null}
            </View>
          ) : null}
        </>
      ) : null}
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  policyCard: {
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
  },
  section: { ...typography.sectionTitle, marginTop: spacing.md, marginBottom: spacing.sm },
  weightRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  weight: { flex: 1, padding: spacing.sm, borderRadius: 10, backgroundColor: colors.surfaceAlt ?? '#f3f6f7' },
  number: { ...typography.title, fontSize: 22 },
  label: { ...typography.label, color: colors.muted },
  body: { ...typography.body, color: colors.text, marginTop: spacing.xs },
  hint: { ...typography.label, color: colors.muted, marginTop: spacing.sm },
  bandRow: { flexDirection: 'row', paddingVertical: spacing.xs, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  bandGrade: { ...typography.body, width: 50, fontWeight: '700' },
  bandThreshold: { ...typography.body },
  cycleCard: {
    marginTop: spacing.md,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
  },
  fieldLabel: { ...typography.label, marginTop: spacing.sm, marginBottom: spacing.xs },
  input: {
    ...typography.input,
    color: colors.text,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
});
