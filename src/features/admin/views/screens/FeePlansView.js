/**
 * AD21 — Fee-plan setup and immutable invoice issue preview.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import RecordList from '../components/RecordList';
import { LoadingView, ErrorState, Notice, useActionErrorAlert } from '../components/FeedbackViews';
import { digitsOnly } from '../../utils/validators';
import LabelledField from '../components/LabelledField';
import SelectSheet from '../components/SelectSheet';
import { PrimaryButton, SecondaryButton } from './AdminHomeView';
import { FeePlansPresenter } from '../../presenters/FeePlansPresenter';
import { FeePlanModel, CalendarModel } from '../../models';
import useFeeClassOptions from '../components/useFeeClassOptions';
import { api, getActiveContext } from '../../api/client';
import { colors, typography, spacing } from '../theme';

export default function FeePlansView({ navigation }) {
  const role = getActiveContext().role;
  const [presenter] = useState(() => new FeePlansPresenter(FeePlanModel, role));
  const [state, setState] = useState(presenter.initialState);
  const loadedOnce = useRef(false);
  const { options: classOptions, error: classError } = useFeeClassOptions();
  const [terms, setTerms] = useState([]);
  const [termsError, setTermsError] = useState('');
  const [pickedClasses, setPickedClasses] = useState([]);
  const [classSheet, setClassSheet] = useState(false);
  const [termSheet, setTermSheet] = useState(false);
  const [pickedTermId, setPickedTermId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDueOn, setFormDueOn] = useState('');
  const [partialAllowed, setPartialAllowed] = useState(false);

  const loadTerms = useCallback(async () => {
    try {
      const [metadata, sessionsPayload] = await Promise.all([
        api.get('metadata'),
        CalendarModel.sessions(),
      ]);
      const sessions = Array.isArray(sessionsPayload?.items)
        ? sessionsPayload.items
        : Array.isArray(sessionsPayload) ? sessionsPayload : [];
      const pages = await Promise.all(
        sessions.map((session) => CalendarModel.terms(session.id))
      );
      const sessionById = new Map(sessions.map((session) => [session.id, session.name]));
      const available = pages.flatMap((page, index) => {
        const items = Array.isArray(page?.items) ? page.items : Array.isArray(page) ? page : [];
        return items.map((term) => ({
          ...term,
          optionLabel: (sessionById.get(sessions[index].id) ?? 'School session') + ' · Term ' + term.number,
        }));
      });
      setTerms(available);
      setTermsError('');
      const active = available.find((term) => term.sessionId === metadata.activeSessionId) ?? available[0];
      setPickedTermId((current) => current || active?.id || '');
    } catch (reason) {
      setTermsError(reason?.message ?? 'Could not load academic terms.');
    }
  }, []);

  const toggleClass = (value) => {
    setPickedClasses((prev) =>
      prev.includes(value) ? prev.filter((id) => id !== value) : [...prev, value],
    );
  };

  const classLabels = classOptions
    .filter((option) => pickedClasses.includes(option.value))
    .map((option) => option.label);
  const pickedTerm = terms.find((term) => term.id === pickedTermId);

  const prepareIssue = (plan) => {
    if (plan.state === 'DRAFT' && role !== 'PRINCIPAL') {
      Alert.alert(
        'Principal publication required',
        'This plan is still a draft. Accounts can prepare the plan, but only a Principal can publish it before invoices are issued.',
      );
      return;
    }
    Alert.alert(
      plan.state === 'DRAFT' ? 'Publish and prepare invoice preview?' : 'Prepare invoice preview?',
      'The next step shows the exact eligible student roster. No invoices are created until the preview is confirmed.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Prepare preview', onPress: () => presenter.issuePlan(plan) },
      ],
    );
  };

  const rows = state.plans.map((plan) => ({
    id: plan.id,
    title: plan.classLabel + ' · ' + plan.title,
    meta: plan.amountLabel + ' · due ' + plan.dueDate + ' · ' +
      (plan.state === 'PUBLISHED' ? 'published and ready to preview' : 'draft — Principal publication required'),
    status: plan.status,
    raw: plan,
  }));

  useActionErrorAlert(state.errorText, 'Fee plan');

  return (
    <AdminScaffold
      eyebrow="Fees"
      title="Set fees and issue bills"
      subtitle="Publish a fee plan, review its eligible student roster, then confirm the invoice batch."
    >
      {state.status === 'loading' ? <LoadingView label="Loading the fee plans…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} />
      ) : null}

      {state.status === 'content' ? (
        <View>
          {state.notice ? <Text style={styles.notice}>{state.notice}</Text> : null}

          <Text style={styles.section}>Fee plans</Text>
          <RecordList
            items={rows}
            onPressItem={(row) => prepareIssue(row.raw)}
            emptyText="No fee plans yet — create the first one below."
          />

          {state.previewBatch ? (
            <View style={styles.preview}>
              <Text style={styles.section}>Review invoice batch</Text>
              <Text style={styles.hint}>
                {state.previewBatch.planName} · {state.previewBatch.issuedCount} new invoices · {state.previewBatch.alreadyIssuedCount} already issued
              </Text>
              {(state.previewBatch.rows ?? []).map((student) => (
                <View key={student.studentId} style={styles.previewRow}>
                  <Text style={styles.studentName}>{student.studentName}</Text>
                  <Text style={styles.hint}>
                    {student.admissionNumber} · {student.action === 'ISSUE' ? 'New invoice' : 'Already billed — skipped'}
                  </Text>
                </View>
              ))}
              <PrimaryButton
                label={state.confirmingBatch ? 'Creating invoices…' : 'Confirm invoice batch'}
                disabled={state.confirmingBatch || state.previewBatch.issuedCount === 0}
                onPress={() => presenter.confirmPreview()}
              />
              <SecondaryButton
                label="Cancel preview"
                disabled={state.confirmingBatch}
                onPress={() => presenter.clearPreview()}
              />
            </View>
          ) : null}

          <Text style={styles.section}>New fee plan</Text>
          {classError ? <Notice text={classError} tone="warning" /> : null}
          {termsError ? <Notice text={termsError} tone="warning" /> : null}

          <LabelledField
            label="Academic term"
            placeholder="Choose the term"
            displayValue={pickedTerm?.optionLabel ?? ''}
            onPress={() => setTermSheet(true)}
          />
          <LabelledField
            label="Classes"
            placeholder="Pick one or more current classes"
            displayValue={classLabels.length
              ? classLabels.length === 1
                ? classLabels[0]
                : classLabels.length + ' classes selected'
              : ''}
            onPress={() => setClassSheet(true)}
          />
          <LabelledField
            label="Fee-plan name and charge description"
            placeholder="e.g. First Term tuition"
            value={formTitle}
            onChangeText={setFormTitle}
          />
          <LabelledField
            label="Amount per student (₦)"
            placeholder="e.g. 20000"
            value={formAmount}
            onChangeText={(value) => setFormAmount(digitsOnly(value))}
            keyboardType="number-pad"
          />
          <LabelledField
            label="Invoice due date"
            placeholder="YYYY-MM-DD"
            value={formDueOn}
            onChangeText={setFormDueOn}
          />
          <SecondaryButton
            label={partialAllowed ? 'Part payments allowed ✓' : 'Part payments not allowed'}
            onPress={() => setPartialAllowed((value) => !value)}
          />
          <SecondaryButton
            label={state.savingPlan ? 'Saving…' : 'Create draft fee plan'}
            disabled={state.savingPlan || !pickedTermId || pickedClasses.length === 0}
            onPress={async () => {
              const created = await presenter.createPlan({
                termId: pickedTermId,
                classIds: pickedClasses,
                title: formTitle,
                amountMinor: Math.round(Number(formAmount) * 100),
                dueOn: formDueOn,
                partialAllowed,
              });
              if (created) {
                setPickedClasses([]);
                setFormTitle('');
                setFormAmount('');
                setFormDueOn('');
                setPartialAllowed(false);
              }
            }}
          />
          <Text style={styles.hint}>
            The backend creates a draft first. A Principal publishes it. The preview then snapshots the eligible active roster; confirming the preview is the only step that creates invoices.
          </Text>

          <SelectSheet
            visible={termSheet}
            label="Select academic term"
            options={terms.map((term) => ({ value: term.id, label: term.optionLabel }))}
            value={pickedTermId}
            onSelect={setPickedTermId}
            onClose={() => setTermSheet(false)}
          />
          <SelectSheet
            visible={classSheet}
            label="Classes covered by this fee plan"
            options={classOptions}
            multiple
            selectedValues={pickedClasses}
            onToggle={toggleClass}
            onDone={() => setClassSheet(false)}
            onClose={() => setClassSheet(false)}
          />
        </View>
      ) : null}
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  notice: { ...typography.body, color: colors.primary, marginBottom: spacing.sm },
  section: { ...typography.sectionTitle, marginTop: spacing.md, marginBottom: spacing.sm },
  hint: { ...typography.label, color: colors.muted, marginTop: spacing.xs },
  preview: {
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  previewRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  studentName: { ...typography.body, fontWeight: '700' },
});
