/**
 * AD33 — Import and export school academic records.
 * Imports use a server preview and explicit review before any rows are applied.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Text, TextInput, View, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import LabelledField from '../components/LabelledField';
import SelectSheet from '../components/SelectSheet';
import { PrimaryButton, SecondaryButton } from './AdminHomeView';
import { ErrorState, LoadingView, Notice, useActionErrorAlert } from '../components/FeedbackViews';
import { ImportsExportsPresenter } from '../../presenters/ImportsExportsPresenter';
import {
  StudentModel,
  TeacherModel,
  CalendarModel,
  DataTransferModel,
} from '../../models';
import { colors, typography, spacing } from '../theme';

const KIND_OPTIONS = [
  { label: 'Students', value: 'STUDENTS' },
  { label: 'Teachers', value: 'TEACHERS' },
];

function sessionLabel(session) {
  const dates = [session.startsOn, session.endsOn].filter(Boolean).join(' – ');
  return [session.name ?? session.label ?? 'Academic session', dates].filter(Boolean).join(' · ');
}

export default function ImportsExportsView({ navigation }) {
  const [presenter] = useState(() =>
    new ImportsExportsPresenter(DataTransferModel, StudentModel, TeacherModel, CalendarModel)
  );
  const [state, setState] = useState(presenter.initialState);
  const [kindSheet, setKindSheet] = useState(false);
  const [sessionSheet, setSessionSheet] = useState(false);
  const [relationshipsVerified, setRelationshipsVerified] = useState(false);
  const [duplicatesReviewed, setDuplicatesReviewed] = useState(false);
  const [approvalReason, setApprovalReason] = useState('');

  useEffect(() => {
    presenter.attach(setState);
    presenter.load();
    return () => presenter.detach();
  }, [presenter]);

  useActionErrorAlert(state.errorText, 'School import');

  const selectedSession = useMemo(
    () => state.sessions.find((session) => session.id === state.sessionId),
    [state.sessions, state.sessionId],
  );
  const rows = Array.isArray(state.preview?.rows) ? state.preview.rows : [];
  const readyCount = rows.filter((row) => row.state === 'READY').length;
  const invalidCount = rows.filter((row) => row.state !== 'READY').length;
  const importKindLabel = state.kind === 'STUDENTS' ? 'students' : 'teachers';
  const canConfirm = Boolean(
    state.preview &&
    rows.length > 0 &&
    invalidCount === 0 &&
    ['PREVIEW', 'PARTIAL', 'PAUSED'].includes(state.preview.state),
  );

  const chooseKind = (value) => {
    setKindSheet(false);
    setRelationshipsVerified(false);
    setDuplicatesReviewed(false);
    setApprovalReason('');
    presenter.setKind(value);
  };

  const chooseSession = (value) => {
    setSessionSheet(false);
    presenter.setSession(value);
  };

  const createPreview = async () => {
    setRelationshipsVerified(false);
    setDuplicatesReviewed(false);
    setApprovalReason('');
    await presenter.preview();
  };

  const confirmImport = async () => {
    const confirmed = await presenter.confirm({
      relationshipsVerified,
      duplicatesReviewed,
      reason: approvalReason,
    });
    if (confirmed) setApprovalReason('');
  };

  return (
    <AdminScaffold
      eyebrow="More"
      title="Bring in or download school data"
      subtitle="Export current lists or run a reviewed, auditable Student / Teacher CSV import."
    >
      {state.status === 'loading' ? <LoadingView label="Loading import templates and sessions…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} />
      ) : null}
      {state.status === 'content' ? (
        <>
          {state.notice ? <Notice text={state.notice} /> : null}

          <Text style={styles.section}>Record type</Text>
          <SecondaryButton
            label={KIND_OPTIONS.find((item) => item.value === state.kind)?.label ?? state.kind}
            onPress={() => setKindSheet(true)}
          />

          <Text style={styles.section}>Export</Text>
          <Text style={styles.body}>
            Export the current authorised Student or Teacher directory as CSV. The export contains directory fields only; it is not an import template.
          </Text>
          <SecondaryButton
            label={state.exporting ? 'Preparing CSV…' : 'Export ' + importKindLabel + ' CSV'}
            disabled={state.exporting}
            onPress={() => presenter.onExport()}
          />
          {state.exportNotice ? <Notice text={state.exportNotice} /> : null}

          <Text style={styles.section}>Import template</Text>
          <Text style={styles.body}>
            This backend import is available for Students and Teachers. Parent / guardian relationships are verified as part of a Student import; there is no separate guardian CSV import endpoint.
          </Text>
          <Text style={styles.fieldLabel}>Required CSV headers for {importKindLabel}</Text>
          <Text selectable style={styles.columns}>
            {(state.template?.columns ?? []).join(',')}
          </Text>
          {state.template?.classKeyExample ? (
            <Text style={styles.body}>
              Class key format: {state.template.classKeyExample}. Teacher assignments use {state.template.classAssignmentsExample}. List values are separated with semicolons.
            </Text>
          ) : null}
          <Text style={styles.body}>
            Maximum {state.template?.maximumRows ?? 1000} rows. Stable row_reference is required for every row. Student rows also require full_name, date_of_birth, sex, class_key, starts_on and verified guardian relationship details or an existing verified guardian ID.
          </Text>

          <Text style={styles.section}>Prepare import preview</Text>
          <LabelledField
            label="Academic session"
            placeholder="Choose the session for this import"
            displayValue={selectedSession ? sessionLabel(selectedSession) : ''}
            onPress={() => setSessionSheet(true)}
          />

          <TextInput
            style={[styles.input, styles.csvInput]}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            value={state.pasted}
            onChangeText={(value) => presenter.setPasted(value)}
            placeholder={(state.template?.columns ?? []).join(',') + '\nPaste CSV header and rows here'}
            placeholderTextColor={colors.muted}
            editable={!state.previewing && !state.confirming}
          />
          <PrimaryButton
            label={state.previewing ? 'Validating CSV on the server…' : 'Create validation preview'}
            onPress={createPreview}
            loading={state.previewing}
            disabled={state.previewing || state.confirming || !state.pasted.trim() || !state.sessionId}
          />

          {state.preview ? (
            <View style={styles.preview}>
              <Text style={styles.section}>Server validation result</Text>
              <Text style={styles.body}>
                Import {state.preview.id} · {state.preview.state} · version {state.preview.version}
              </Text>
              <Text style={styles.counts}>
                {readyCount} ready · {invalidCount} need correction · {rows.length} total rows
              </Text>
              {rows.map((row) => (
                <View key={row.id} style={styles.row}>
                  <Text style={styles.rowTitle}>
                    Row {row.rowNumber} · {row.state}
                  </Text>
                  {row.errorCode ? <Text style={styles.problem}>{row.errorCode}</Text> : null}
                  {row.errorMessage ? <Text style={styles.problem}>{row.errorMessage}</Text> : null}
                  {(row.warnings ?? []).map((warning, index) => (
                    <Text key={row.id + '-warning-' + index} style={styles.warning}>{warning}</Text>
                  ))}
                  <Text style={styles.rowReference}>Reference: {row.rowReference}</Text>
                </View>
              ))}
              {invalidCount > 0 ? (
                <Notice text="No data has been applied. Correct the CSV rows, then create a new preview. The backend will reject confirmation while any row is invalid." tone="warning" />
              ) : null}

              {['QUEUED', 'PROCESSING', 'PARTIAL'].includes(state.preview.state) ? (
                <Notice text="This import has been accepted for processing. Refresh the preview to view row outcomes." />
              ) : null}
              <SecondaryButton
                label="Refresh import status"
                onPress={() => presenter.refreshPreview()}
                disabled={state.confirming || state.previewing}
              />

              {canConfirm ? (
                <>
                  <Text style={styles.section}>Review before applying rows</Text>
                  <SecondaryButton
                    label={relationshipsVerified ? 'Guardian / account relationships verified ✓' : 'Confirm guardian / account relationships'}
                    onPress={() => setRelationshipsVerified((value) => !value)}
                    disabled={state.confirming}
                  />
                  <SecondaryButton
                    label={duplicatesReviewed ? 'Duplicate review completed ✓' : 'Confirm duplicate review'}
                    onPress={() => setDuplicatesReviewed((value) => !value)}
                    disabled={state.confirming}
                  />
                  <TextInput
                    style={styles.input}
                    value={approvalReason}
                    onChangeText={setApprovalReason}
                    placeholder="Import review reason (at least 10 characters)"
                    placeholderTextColor={colors.muted}
                    maxLength={500}
                    editable={!state.confirming}
                  />
                  <PrimaryButton
                    label={state.confirming ? 'Confirming import…' : 'Confirm and queue import'}
                    onPress={confirmImport}
                    loading={state.confirming}
                    disabled={
                      state.confirming ||
                      !relationshipsVerified ||
                      !duplicatesReviewed ||
                      approvalReason.trim().length < 10
                    }
                  />
                </>
              ) : null}
            </View>
          ) : null}
        </>
      ) : null}

      <SelectSheet
        visible={kindSheet}
        label="Choose record type"
        options={KIND_OPTIONS}
        value={state.kind}
        onSelect={chooseKind}
        onClose={() => setKindSheet(false)}
      />
      <SelectSheet
        visible={sessionSheet}
        label="Choose academic session"
        options={state.sessions.map((session) => ({
          value: session.id,
          label: sessionLabel(session),
        }))}
        value={state.sessionId}
        onSelect={chooseSession}
        onClose={() => setSessionSheet(false)}
      />
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  section: { ...typography.sectionTitle, marginTop: spacing.lg, marginBottom: spacing.sm },
  body: { ...typography.body, color: colors.muted, marginBottom: spacing.sm },
  fieldLabel: { ...typography.label, marginTop: spacing.sm, marginBottom: spacing.xs },
  columns: {
    ...typography.label,
    color: colors.text,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.sm,
  },
  input: {
    ...typography.input,
    color: colors.text,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  csvInput: { minHeight: 150, textAlignVertical: 'top', marginTop: spacing.md },
  preview: {
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  counts: { ...typography.label, color: colors.primary, marginTop: spacing.sm },
  row: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowTitle: { ...typography.body, fontWeight: '700' },
  problem: { ...typography.label, color: '#a33a2a', marginTop: spacing.xs },
  warning: { ...typography.label, color: '#8a6519', marginTop: spacing.xs },
  rowReference: { ...typography.label, color: colors.muted, marginTop: spacing.xs },
});
