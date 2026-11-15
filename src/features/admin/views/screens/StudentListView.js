/**
 * AD02 — Student list (View). The other half of the flagship MVP example.
 *
 * What this file does NOT do: fetch, filter, debounce, format — all of that
 * lives in StudentListPresenter. The View only renders `state` and calls
 * `presenter.on*()` when the user does something.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import RecordList from '../components/RecordList';
import SelectSheet from '../components/SelectSheet';
import LabelledField from '../components/LabelledField';
import { LoadingView, EmptyState, ErrorState } from '../components/FeedbackViews';
import { PrimaryButton, SecondaryButton } from './AdminHomeView';
import { StudentListPresenter } from '../../presenters/StudentListPresenter';
import { StudentModel } from '../../models';
import useClassOptions from '../components/useClassOptions';
import { colors, typography, spacing } from '../theme';

// The dropdown choices the handoff shows for AD02. Classes are LIVE — a
// class created in AD12 is filterable here right away.
const SESSIONS = ['2026/2027', '2025/2026'].map((s) => ({ label: s, value: s }));
const DEPARTMENTS = ['Science', 'Humanities / Arts', 'Business / Commercial']
  .map((d) => ({ label: d, value: d }))
  .concat([{ label: 'All departments', value: 'all' }]);
// The student ACCOUNT status is one of Active, Withdrawn or Graduated.
// (A past term the student finished shows as "Completed" on the enrolment
// history — that is a different concept and is not a student-list filter.)
const STATUSES = ['Active', 'Withdrawn', 'Graduated']
  .map((s) => ({ label: s, value: s }))
  .concat([{ label: 'All statuses', value: 'all' }]);
const IMPORT_EXPORT_OPTIONS = [
  { label: 'Export the current list (CSV)', value: 'export' },
  { label: 'Import students (paste CSV)', value: 'import' },
];

export default function StudentListView({ navigation }) {
  const [presenter] = useState(() => new StudentListPresenter(StudentModel));
  const [state, setState] = useState(presenter.initialState);
  const [sheet, setSheet] = useState(null); // which SelectSheet is open
  // Live classes + the "All classes" filter entry at the top of the sheet.
  const CLASSES = [...useClassOptions(), { label: 'All classes', value: 'all' }];
  const loadedOnce = useRef(false);

  useEffect(() => {
    presenter.attach(setState, navigation);
    presenter.load();
    // When the user comes back from enrol (AD03) or import (AD33) the list
    // must show the new students, so re-fetch on every focus after the first.
    const unsubscribe = navigation.addListener('focus', () => {
      if (loadedOnce.current) presenter.load();
      loadedOnce.current = true;
    });
    return () => {
      unsubscribe?.remove?.();
      presenter.detach();
    };
  }, [presenter, navigation]);

  const { filters } = state;
  const rows = state.students.map((s) => ({
    id: s.id,
    title: s.name,
    meta: `${s.admissionNumber}${s.classLabel ? ` · ${s.classLabel}` : ''}${
      s.department ? ` · ${s.department}` : ''
    }`,
    status: s.status,
    student: s,
  }));

  return (
    <AdminScaffold
      eyebrow="Students"
      title="Student list"
      subtitle="Find a student or begin an enrolment."
      insetBottom={false}
      actions={
        <View style={{ gap: spacing.sm }}>
          <PrimaryActions
            onEnrol={() => presenter.onEnrolStudent()}
            onImportExport={() => setSheet('import-export')}
            exporting={state.exporting}
          />
          {state.exportNotice ? <Text style={styles.notice}>{state.exportNotice}</Text> : null}
        </View>
      }
    >
      {/* Control 01 ; search. Typing here calls the Presenter (step 1 of the MVP flow). */}
      <TextInput
        style={styles.search}
        placeholder="Search students"
        placeholderTextColor={colors.muted}
        value={filters.search}
        onChangeText={(text) => presenter.onSearchChange(text)}
      />

      {/* Controls 02–05 ; filters, each opening a bottom sheet. */}
      <LabelledField
        label="Session"
        displayValue={filters.session}
        onPress={() => setSheet('session')}
      />
      <LabelledField
        label="Class"
        displayValue={filters.classId === 'all' ? 'All classes' : filters.classId}
        onPress={() => setSheet('class')}
      />
      <LabelledField
        label="Department"
        displayValue={filters.department === 'all' ? 'All departments' : filters.department}
        onPress={() => setSheet('department')}
      />
      <LabelledField
        label="Student status"
        displayValue={filters.status}
        onPress={() => setSheet('status')}
      />

      {state.status === 'loading' ? <LoadingView label="Finding students…" /> : null}
      {state.status === 'empty' ? (
        <EmptyState
          title="No students match"
          hint="Change the search text or filters, or enrol a new student."
        />
      ) : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onPullToRefresh()} />
      ) : null}
      {state.status === 'content' ? (
        <RecordList
          items={rows}
          onPressItem={(row) => presenter.onOpenStudent(row.student)}
          emptyText="No students match."
        />
      ) : null}

      <SelectSheet
        visible={sheet === 'session'}
        label="Session"
        options={SESSIONS}
        value={filters.session}
        onSelect={(v) => presenter.onFilterChange('session', v)}
        onClose={() => setSheet(null)}
      />
      <SelectSheet
        visible={sheet === 'class'}
        label="Class"
        options={CLASSES}
        value={filters.classId}
        onSelect={(v) => presenter.onFilterChange('classId', v)}
        onClose={() => setSheet(null)}
      />
      <SelectSheet
        visible={sheet === 'department'}
        label="Department"
        options={DEPARTMENTS}
        value={filters.department}
        onSelect={(v) => presenter.onFilterChange('department', v)}
        onClose={() => setSheet(null)}
      />
      <SelectSheet
        visible={sheet === 'status'}
        label="Student status"
        options={STATUSES}
        value={filters.status}
        onSelect={(v) => presenter.onFilterChange('status', v)}
        onClose={() => setSheet(null)}
      />
      <SelectSheet
        visible={sheet === 'import-export'}
        label="Import / export students"
        options={IMPORT_EXPORT_OPTIONS}
        value={null}
        onSelect={(v) => {
          if (v === 'export') presenter.onExport();
          if (v === 'import') navigation.navigate('ImportsExports', { type: 'students' });
        }}
        onClose={() => setSheet(null)}
      />
    </AdminScaffold>
  );
}

function PrimaryActions({ onEnrol, onImportExport, exporting }) {
  return (
    <>
      <PrimaryButton label="Enrol student" onPress={onEnrol} />
      <SecondaryButton
        label={exporting ? 'Preparing export…' : 'Import / export students'}
        onPress={onImportExport}
        disabled={exporting}
      />
    </>
  );
}

const styles = StyleSheet.create({
  search: {
    ...typography.input,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    marginBottom: spacing.md,
  },
  notice: { ...typography.label, color: colors.muted, textAlign: 'center' },
});
