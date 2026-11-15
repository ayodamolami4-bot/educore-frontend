/**
 * AD33 — Bring in or download school data (View). Three record kinds share
 * one screen: students, teachers and parents. Each kind exports its records
 * as a CSV (share sheet on phones, clipboard on web) and accepts pasted CSV
 * rows for import. The import shows how many rows are ready and how many have
 * problems, and writes the valid ones through the same endpoint the matching
 * screen uses.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import LabelledField from '../components/LabelledField';
import SelectSheet from '../components/SelectSheet';
import { PrimaryButton, SecondaryButton } from './AdminHomeView';
import { useActionErrorAlert } from '../components/FeedbackViews';
import {
  ImportsExportsPresenter,
  importCsvHeaderFor,
} from '../../presenters/ImportsExportsPresenter';
import { StudentModel, TeacherModel, GuardianModel } from '../../models';
import { colors, typography, spacing } from '../theme';

const KIND_OPTIONS = [
  { label: 'Students', value: 'students' },
  { label: 'Teachers', value: 'teachers' },
  { label: 'Parents / guardians', value: 'parents' },
];

const KIND_COPY = {
  students: {
    exportHelp: 'Send the current student records as a CSV file to email, Drive or WhatsApp.',
    exportBtn: 'Export students (CSV)',
    importHelp:
      'Paste CSV rows below — with or without the header line. Required columns: firstName, lastName, class.',
    importBtn: (n) => (n > 0 ? `Import ${n} students` : 'Import students'),
    noun: 'students',
  },
  teachers: {
    exportHelp: 'Send the current teacher records as a CSV file to email, Drive or WhatsApp.',
    exportBtn: 'Export teachers (CSV)',
    importHelp:
      'Paste CSV rows below — with or without the header line. Required columns: fullName, phone. Optional: email, subjects (pipe-separated), formClass.',
    importBtn: (n) => (n > 0 ? `Import ${n} teachers` : 'Import teachers'),
    noun: 'teachers',
  },
  parents: {
    exportHelp: 'Send the current parent/guardian records as a CSV file to email, Drive or WhatsApp.',
    exportBtn: 'Export parents (CSV)',
    importHelp:
      'Paste CSV rows below — with or without the header line. Required: fullName and at least a phone or an email. Optional: relationship, children (pipe-separated "Name,Class" pairs).',
    importBtn: (n) => (n > 0 ? `Import ${n} parents` : 'Import parents'),
    noun: 'parents',
  },
};

export default function ImportsExportsView() {
  const [kind, setKind] = useState('students');
  // A fresh presenter per kind — each kind has its own model, its own snapshot,
  // and its own validation rules. Switching kind wipes the paste box too.
  const presenter = useMemo(() => {
    if (kind === 'teachers') {
      return new ImportsExportsPresenter(StudentModel, 'teachers', TeacherModel);
    }
    if (kind === 'parents') {
      return new ImportsExportsPresenter(StudentModel, 'parents', GuardianModel);
    }
    return new ImportsExportsPresenter(StudentModel, 'students');
  }, [kind]);
  const [state, setState] = useState(presenter.initialState);
  const [kindSheet, setKindSheet] = useState(false);

  useEffect(() => {
    presenter.attach(setState);
    return () => presenter.detach();
  }, [presenter]);

  // Import/export failures pop up; per-row problems stay listed inline.
  useActionErrorAlert(state.errorText, 'Import failed');

  const copy = KIND_COPY[kind];

  return (
    <AdminScaffold
      eyebrow="More"
      title="Bring in or download school data"
      subtitle="Export or import students, teachers and parents — one record kind at a time."
    >
      <Text style={styles.section}>Record kind</Text>
      <Text style={styles.bodyText}>
        Pick which records to export or import. The CSV columns and the import rules change with
        the kind.
      </Text>
      <SecondaryButton
        label={KIND_OPTIONS.find((o) => o.value === kind).label}
        onPress={() => setKindSheet(true)}
      />

      <Text style={styles.section}>Export</Text>
      <Text style={styles.bodyText}>{copy.exportHelp}</Text>
      <SecondaryButton
        label={state.exporting ? 'Preparing export…' : copy.exportBtn}
        onPress={() => presenter.onExport()}
        disabled={state.exporting}
      />
      {state.exportNotice ? <Text style={styles.notice}>{state.exportNotice}</Text> : null}

      <Text style={styles.section}>Import {copy.noun}</Text>
      <Text style={styles.bodyText}>{copy.importHelp}</Text>
      <LabelledField
        label="Pasted CSV"
        multiline
        numberOfLines={6}
        value={state.pasted}
        onChangeText={(text) => presenter.onPasteChange(text)}
        placeholder={importCsvHeaderFor(kind)}
      />
      <Text style={styles.preview}>
        {state.rows.length} ready · {state.problems.length} with problems
      </Text>
      {state.problems.slice(0, 4).map((p) => (
        <Text key={`${p.rowNumber}-${p.problem.slice(0, 8)}`} style={styles.problem}>
          Row {p.rowNumber}: {p.problem}
        </Text>
      ))}
      <PrimaryButton
        label={state.importing ? 'Importing…' : copy.importBtn(state.rows.length)}
        disabled={state.rows.length === 0 || state.importing}
        onPress={() => presenter.onImport()}
      />
      {state.notice ? <Text style={styles.notice}>{state.notice}</Text> : null}

      <SelectSheet
        visible={kindSheet}
        label="Which records?"
        options={KIND_OPTIONS}
        value={kind}
        onSelect={(value) => setKind(value)}
        onClose={() => setKindSheet(false)}
      />
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  section: { ...typography.sectionTitle, marginTop: spacing.lg, marginBottom: spacing.sm },
  bodyText: { ...typography.body, color: colors.muted, marginBottom: spacing.sm },
  preview: { ...typography.label, marginTop: spacing.xs, marginBottom: spacing.sm },
  problem: { ...typography.label, color: '#a33a2a', marginBottom: spacing.xs },
  notice: { ...typography.label, color: colors.muted, marginTop: spacing.sm, textAlign: 'center' },
});
