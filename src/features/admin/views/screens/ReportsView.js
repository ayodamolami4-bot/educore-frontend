/**
 * AD20 — Run a permitted school report with its catalogue-defined filters.
 * JSON is previewed in-app; CSV/PDF are generated server-side from the same
 * query and saved/shared from the device.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AdminScaffold from '../components/AdminScaffold';
import RecordList from '../components/RecordList';
import SelectSheet from '../components/SelectSheet';
import {
  LoadingView,
  ErrorState,
  EmptyState,
  Notice,
} from '../components/FeedbackViews';
import { PrimaryButton, SecondaryButton } from './AdminHomeView';
import { ReportsPresenter } from '../../presenters/ReportsPresenter';
import { ReportsModel } from '../../models';
import { colors, typography, spacing } from '../theme';

const FILTER_LABELS = {
  sessionId: 'Academic session',
  termId: 'Academic term',
  classId: 'Class',
  studentId: 'Student',
  department: 'Department',
  from: 'From date',
  to: 'To date',
  cycleId: 'Assessment cycle',
  assignmentId: 'Assigned subject sheet',
};

const DEPARTMENTS = [
  { value: 'SCIENCE', label: 'Science' },
  { value: 'ARTS', label: 'Arts' },
  { value: 'COMMERCIAL', label: 'Commercial' },
];

const SELECT_FILTERS = new Set([
  'sessionId',
  'termId',
  'classId',
  'studentId',
  'department',
  'cycleId',
  'assignmentId',
]);

export default function ReportsView({ navigation }) {
  const [presenter] = useState(() => new ReportsPresenter(ReportsModel));
  const [state, setState] = useState(presenter.initialState);
  const statusRef = useRef(state.status);
  statusRef.current = state.status;
  const [kindSheet, setKindSheet] = useState(false);
  const [filterSheet, setFilterSheet] = useState(false);
  const [filterTarget, setFilterTarget] = useState('');

  useEffect(() => {
    presenter.attach(setState, navigation);
    presenter.load();
    const unsubscribe = navigation.addListener('focus', () => {
      if (statusRef.current === 'content') presenter.load();
    });
    return () => {
      unsubscribe?.remove?.();
      presenter.detach();
    };
  }, [presenter, navigation]);

  const entry = state.catalogue.find((item) => item.kind === state.kind);
  const filterNames = entry?.filters ?? [];
  const requiredNames = entry?.requiredFilters ?? [];
  const optionsFor = (name) => ({
    sessionId: state.options.sessions,
    termId: state.options.terms,
    classId: state.options.classes,
    studentId: state.options.students,
    department: DEPARTMENTS,
    cycleId: state.options.cycles,
    assignmentId: state.options.assignments,
  })[name] ?? [];

  const selectedLabel = (name) => {
    if (name === 'from' || name === 'to') return state.filters[name] ?? '';
    return optionsFor(name).find((item) => item.value === state.filters[name])?.label ?? '';
  };

  const openFilter = (name) => {
    setFilterTarget(name);
    setFilterSheet(true);
  };

  const exportFile = async (format) => {
    const blob = await presenter.export(format);
    if (!blob) return;
    try {
      const file = new File(
        Paths.document,
        state.kind.toLowerCase() + '-' + Date.now() + '.' + format.toLowerCase(),
      );
      file.create();
      await file.write(new Uint8Array(await blob.arrayBuffer()));
      if (format === 'PDF' && await File.canPreview(file)) {
        await file.preview({ title: entry?.label ?? 'EduCore report' });
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          dialogTitle: 'Share EduCore report',
          mimeType: format === 'PDF' ? 'application/pdf' : 'text/csv',
        });
      } else {
        setState((current) => ({
          ...current,
          notice: 'Report saved to ' + file.uri,
        }));
      }
    } catch (error) {
      setState((current) => ({
        ...current,
        errorText: error?.message ?? 'The report was generated but could not be saved or shared.',
      }));
    }
  };

  const reportRows = useMemo(() => {
    if (!state.report) return [];
    const columns = state.report.columns ?? [];
    return (state.report.rows ?? []).map((row, index) => ({
      id: String(row.id ?? row.studentId ?? row.assignmentId ?? index),
      title: String(
        row.studentName ??
        row.teacherName ??
        row.subject ??
        row.assignmentId ??
        row.admissionNumber ??
        'Record ' + (index + 1)
      ),
      meta: columns
        .filter((column) => !['studentName', 'teacherName', 'subject', 'assignmentId', 'admissionNumber'].includes(column))
        .map((column) => column + ': ' + (row[column] == null ? '—' : String(row[column])))
        .join(' · '),
    }));
  }, [state.report]);

  return (
    <AdminScaffold
      eyebrow="Academics"
      title="School reports"
      subtitle="Choose a report from the live catalogue, apply its permitted filters and generate an official output."
    >
      {state.status === 'loading' ? <LoadingView label="Loading report catalogue and filter options…" /> : null}
      {state.status === 'error' ? <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} /> : null}
      {state.errorText && state.status !== 'error' ? <Notice text={state.errorText} tone="error" /> : null}
      {state.notice ? <Notice text={state.notice} /> : null}

      {state.status === 'content' ? (
        <>
          <Text style={styles.section}>Report type</Text>
          <SecondaryButton
            label={entry?.label ?? 'Choose report type'}
            onPress={() => setKindSheet(true)}
          />
          {entry ? (
            <>
              <Text style={styles.section}>Filters</Text>
              <Text style={styles.hint}>
                {requiredNames.length
                  ? 'Required: ' + requiredNames.map((name) => FILTER_LABELS[name] ?? name).join(', ')
                  : 'No mandatory filters for this report type. Narrow the output to the records you need.'}
              </Text>
              {filterNames.map((name) => (
                <View key={name} style={styles.filterRow}>
                  <Text style={styles.fieldLabel}>
                    {FILTER_LABELS[name] ?? name}{requiredNames.includes(name) ? ' *' : ''}
                  </Text>
                  {SELECT_FILTERS.has(name) ? (
                    <SecondaryButton
                      label={selectedLabel(name) || 'Any / choose ' + (FILTER_LABELS[name] ?? name).toLowerCase()}
                      onPress={() => openFilter(name)}
                    />
                  ) : (
                    <TextInput
                      style={styles.input}
                      value={state.filters[name] ?? ''}
                      onChangeText={(value) => presenter.setFilter(name, value)}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.muted}
                      autoCapitalize="none"
                    />
                  )}
                </View>
              ))}

              <Text style={styles.hint}>
                The report service limits each result to {state.maximumRows.toLocaleString()} rows and rechecks school permissions when it generates a file.
              </Text>
              <PrimaryButton
                label={state.working ? 'Generating…' : 'Generate JSON preview'}
                onPress={() => presenter.run()}
                loading={state.working}
                disabled={state.working}
              />
              <View style={styles.exportActions}>
                <SecondaryButton
                  label={state.working ? 'Preparing…' : 'Download CSV'}
                  onPress={() => exportFile('CSV')}
                  disabled={state.working}
                />
                <SecondaryButton
                  label={state.working ? 'Preparing…' : 'Download PDF'}
                  onPress={() => exportFile('PDF')}
                  disabled={state.working}
                />
              </View>
            </>
          ) : (
            <EmptyState title="No report selected" description="Choose a report type to see its permitted filters." />
          )}

          {state.report ? (
            <View style={styles.preview}>
              <Text style={styles.section}>{state.report.title ?? entry?.label ?? 'Report preview'}</Text>
              <Text style={styles.meta}>
                {state.report.rowCount ?? state.report.rows?.length ?? 0} rows · generated {state.report.generatedAt ?? ''}
              </Text>
              {(state.report.notes ?? []).map((note, index) => (
                <Text key={'note-' + index} style={styles.hint}>{note}</Text>
              ))}
              <RecordList
                items={reportRows}
                emptyText="The report was generated successfully but contains no matching rows."
              />
            </View>
          ) : null}
        </>
      ) : null}

      <SelectSheet
        visible={kindSheet}
        label="Choose a report type"
        options={state.catalogue.map((item) => ({
          value: item.kind,
          label: item.label,
        }))}
        value={state.kind}
        onSelect={(value) => {
          setKindSheet(false);
          presenter.selectKind(value);
        }}
        onClose={() => setKindSheet(false)}
      />
      <SelectSheet
        visible={filterSheet}
        label={'Choose ' + (FILTER_LABELS[filterTarget] ?? 'filter')}
        options={optionsFor(filterTarget)}
        value={state.filters[filterTarget]}
        onSelect={(value) => {
          presenter.setFilter(filterTarget, value);
          setFilterSheet(false);
        }}
        onClose={() => setFilterSheet(false)}
      />
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  section: { ...typography.sectionTitle, marginTop: spacing.lg, marginBottom: spacing.sm },
  hint: { ...typography.label, color: colors.muted, marginTop: spacing.xs, marginBottom: spacing.sm },
  fieldLabel: { ...typography.label, color: colors.text, marginBottom: spacing.xs },
  filterRow: { marginBottom: spacing.sm },
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
  exportActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  preview: {
    marginTop: spacing.lg,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
  },
  meta: { ...typography.label, color: colors.muted, marginBottom: spacing.sm },
});
