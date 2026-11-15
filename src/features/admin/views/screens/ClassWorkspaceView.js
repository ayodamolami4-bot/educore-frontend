/**
 * AD13 — One class and its student list (View). Form teacher and department
 * on top, the roster (taps open student profiles), and the subjects taught.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import RecordList from '../components/RecordList';
import SelectSheet from '../components/SelectSheet';
import { LoadingView, ErrorState } from '../components/FeedbackViews';
import { ClassWorkspacePresenter } from '../../presenters/ClassWorkspacePresenter';
import { AcademicStructureModel } from '../../models';
import { colors, typography, spacing } from '../theme';

export default function ClassWorkspaceView({ navigation, route }) {
  const [presenter] = useState(() => new ClassWorkspacePresenter(AcademicStructureModel));
  const [state, setState] = useState(presenter.initialState);
  const loadedOnce = useRef(false);
  const [pickerOpen, setPickerOpen] = useState(!route.params?.classId); // no class in the route → open the picker straight away
  const initialClassId = route.params && route.params.classId;

  useEffect(() => {
    presenter.attach(setState, navigation);
    if (initialClassId) {
      presenter.load(initialClassId);
    } else {
      presenter.pickClass();
    }
    const unsubscribe = navigation.addListener('focus', () => {
      if (loadedOnce.current && state.cls) presenter.load(state.cls.classLabel, { showLoading: false });
      loadedOnce.current = true;
    });
    return () => {
      unsubscribe?.remove?.();
      presenter.detach();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presenter, navigation, initialClassId]);

  const studentRows = state.students.map((s) => ({
    id: String(s.id),
    title: s.fullName,
    meta: `${s.admissionNumber}${s.status === 'Active' ? '' : ` · ${s.status}`}`,
    status: s.status,
    raw: s,
  }));

  const subjectRows = state.subjects.map((s) => ({
    id: s.id,
    title: s.name,
    meta: (s.departments || [s.department]).join(' · '),
    status: (s.departments || [s.department])[0],
  }));

  return (
    <AdminScaffold
      eyebrow="Academics"
      title={state.cls ? state.cls.classLabel : 'Class workspace'}
      subtitle={
        state.cls
          ? `Form: ${state.cls.formTeacherName} · ${state.cls.department || 'Junior secondary'}`
          : 'Choose a class'
      }
    >
      {state.status === 'loading' ? <LoadingView label="Loading the class…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} />
      ) : null}

      {state.status === 'content' ? (
        <View>
          <Text style={styles.summary}>
            {state.cls.studentCount} students · {state.cls.subjectCount} subjects taught here
          </Text>

          <Text style={styles.section}>Students in this class</Text>
          <RecordList
            items={studentRows}
            onPressItem={(row) =>
              navigation.navigate('StudentProfile', { studentId: row.raw.id })
            }
            emptyText="No students in this class yet."
          />

          <Text style={styles.section}>Subjects taught here</Text>
          <RecordList items={subjectRows} emptyText="No subjects assigned to this class." />
        </View>
      ) : null}

      <SelectSheet
        visible={pickerOpen && state.status === 'picking'}
        label="Which class?"
        options={state.classOptions.map((c) => ({ label: c.classLabel, value: c.classLabel }))}
        onSelect={(value) => {
          setPickerOpen(false);
          presenter.load(value);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  summary: { ...typography.body, color: colors.muted, marginBottom: spacing.sm },
  section: { ...typography.sectionTitle, marginTop: spacing.md, marginBottom: spacing.sm },
});
