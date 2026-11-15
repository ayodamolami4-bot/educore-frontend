/**
 * AD12 — Classes, subjects and departments (View). Classes open the AD13
 * workspace; subjects are listed under it (tap one to edit it); a small form
 * adds a subject with its departments, classes and assigned teachers.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import RecordList from '../components/RecordList';
import SelectSheet from '../components/SelectSheet';
import { LoadingView, ErrorState, useActionErrorAlert } from '../components/FeedbackViews';
import LabelledField from '../components/LabelledField';
import { PrimaryButton, SecondaryButton } from './AdminHomeView';
import { AcademicStructurePresenter } from '../../presenters/AcademicStructurePresenter';
import { AcademicStructureModel, TeacherModel } from '../../models';
import { colors, typography, spacing } from '../theme';

const DEPARTMENTS = ['Core', 'JSS', 'Science', 'Humanities / Arts', 'Business / Commercial'].map(
  (d) => ({ label: d, value: d }),
);
export default function AcademicStructureView({ navigation }) {
  const [presenter] = useState(() => new AcademicStructurePresenter(AcademicStructureModel, TeacherModel));
  const [state, setState] = useState(presenter.initialState);
  const loadedOnce = useRef(false);
  const [subjectName, setSubjectName] = useState('');
  const [subjectDepts, setSubjectDepts] = useState([]);
  const [subjectClasses, setSubjectClasses] = useState([]);
  const [subjectTeachers, setSubjectTeachers] = useState([]);
  const [editingSubject, setEditingSubject] = useState(null);
  const [deptSheet, setDeptSheet] = useState(false);
  const [classSheet, setClassSheet] = useState(false);
  const [teacherSheet, setTeacherSheet] = useState(false);
  const [newClassLevel, setNewClassLevel] = useState(null); // 'JSS1' … 'SSS3'
  const [newClassSuffix, setNewClassSuffix] = useState('');
  const [classLevelSheet, setClassLevelSheet] = useState(false);
  const [renamingClass, setRenamingClass] = useState(null); // the class row being renamed

  // Class rules, both directions: Core spans JSS + SSS; JSS-only subjects are
  // junior; the named departments are senior-only. With nothing ticked the
  // whole list shows.
  const allowJss =
    subjectDepts.length === 0 ||
    subjectDepts.includes('Core') ||
    subjectDepts.includes('JSS');
  const allowSss =
    subjectDepts.length === 0 ||
    subjectDepts.includes('Core') ||
    subjectDepts.some((d) => ['Science', 'Humanities / Arts', 'Business / Commercial'].includes(d));

  const toggleDept = (value) => {
    const next = subjectDepts.includes(value)
      ? subjectDepts.filter((d) => d !== value)
      : [...subjectDepts, value];
    setSubjectDepts(next);
    const nextAllowsJss = next.length === 0 || next.includes('Core') || next.includes('JSS');
    const nextAllowsSss =
      next.length === 0 ||
      next.includes('Core') ||
      next.some((d) => ['Science', 'Humanities / Arts', 'Business / Commercial'].includes(d));
    if (!nextAllowsJss) setSubjectClasses((prev) => prev.filter((c) => c.startsWith('JSS')));
    if (!nextAllowsSss) setSubjectClasses((prev) => prev.filter((c) => !c.startsWith('JSS')));
  };
  const toggleClass = (value) => {
    setSubjectClasses((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value],
    );
  };

  useEffect(() => {
    presenter.attach(setState, navigation);
    presenter.load();
    const unsubscribe = navigation.addListener('focus', () => {
      if (loadedOnce.current) presenter.load({ showLoading: false });
      loadedOnce.current = true;
    });
    return () => {
      unsubscribe?.remove?.();
      presenter.detach();
    };
  }, [presenter, navigation]);

  // The LIVE class list drives the subject's class picker, so new or
  // renamed classes appear at once.
  const liveClasses = state.classes.map((c) => ({ label: c.classLabel, value: c.classLabel }));
  const shownClasses = liveClasses.filter(
    (c) => (allowJss || !c.value.startsWith('JSS')) && (allowSss || c.value.startsWith('JSS')),
  );

  const classRows = state.classes.map((c) => ({
    id: c.id,
    title: c.classLabel,
    meta: `Form: ${c.formTeacherName} · ${c.studentCount} students · ${c.subjectCount} subjects`,
    status: c.department || 'JSS',
    raw: c,
  }));

  const subjectRows = state.subjects.map((s) => ({
    id: s.id,
    title: s.name,
    meta: `${(s.departments || [s.department]).join(' · ')} · ${s.classes.length} classes · ${
      (s.teachers || []).length
    } teacher${(s.teachers || []).length === 1 ? '' : 's'}`,
    status: (s.departments || [s.department])[0],
    raw: s,
  }));

  /** Tap a subject to edit it — the form below switches to edit mode. */
  const openSubjectEditor = (subject) => {
    setEditingSubject(subject);
    setSubjectName(subject.name);
    setSubjectDepts(subject.departments || [subject.department].filter(Boolean));
    setSubjectClasses(subject.classes || []);
    setSubjectTeachers(subject.teachers || []);
  };

  const clearSubjectForm = () => {
    setEditingSubject(null);
    setSubjectName('');
    setSubjectDepts([]);
    setSubjectClasses([]);
    setSubjectTeachers([]);
  };

  const saveSubjectForm = async () => {
    const fields = {
      name: subjectName,
      departments: subjectDepts,
      classes: subjectClasses,
      teachers: subjectTeachers,
    };
    const ok = editingSubject
      ? await presenter.updateSubject(editingSubject.id, fields)
      : await presenter.addSubject(fields);
    if (ok) clearSubjectForm();
  };

  // Action errors (duplicate subject refused, empty fields) pop up.
  useActionErrorAlert(state.errorText);

  return (
    <AdminScaffold
      eyebrow="Academics"
      title="Classes, subjects and departments"
      subtitle="Tap a class to open its workspace"
    >
      {state.status === 'loading' ? <LoadingView label="Loading the structure…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} />
      ) : null}

      {state.status === 'content' ? (
        <View>
          {state.notice ? <Text style={styles.notice}>{state.notice}</Text> : null}

          <Text style={styles.section}>Classes</Text>
          <RecordList
            items={classRows}
            onPressItem={(row) =>
              Alert.alert(row.raw.classLabel, 'What do you want to do?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Rename class',
                  onPress: () => {
                    setRenamingClass(row.raw);
                    setNewClassSuffix(row.raw.classLabel.split(' ').slice(1).join(' '));
                  },
                },
                {
                  text: 'Open workspace',
                  onPress: () => navigation.navigate('ClassWorkspace', { classId: row.raw.classLabel }),
                },
              ])
            }
            emptyText="No classes yet."
          />

          {renamingClass ? (
            <View>
              <Text style={styles.section}>Rename class — {renamingClass.classLabel}</Text>
              <LabelledField
                label="Level (fixed)"
                displayValue={renamingClass.classLabel.split(' ')[0]}
              />
              <LabelledField
                label="Suffix — letters only, e.g. A, B, Diamond, Gold"
                placeholder="e.g. B"
                value={newClassSuffix}
                onChangeText={setNewClassSuffix}
                autoCapitalize="words"
              />
              <PrimaryButton
                label={state.savingClass ? 'Saving…' : 'Save the new name'}
                disabled={state.savingClass || !newClassSuffix.trim()}
                onPress={async () => {
                  const suffix = newClassSuffix.trim();
                  const level = renamingClass.classLabel.split(' ')[0];
                  const ok = await presenter.renameClass(
                    renamingClass.id,
                    `${level} ${suffix}`,
                  );
                  if (ok) setRenamingClass(null);
                }}
              />
              <View style={styles.secondaryWrap}>
                <SecondaryButton label="Cancel" onPress={() => setRenamingClass(null)} />
              </View>
            </View>
          ) : (
            <View>
              <Text style={styles.section}>Add a class</Text>
              <LabelledField
                label="Level"
                placeholder="Tap to pick — JSS1 to SSS3"
                displayValue={newClassLevel || ''}
                onPress={() => setClassLevelSheet(true)}
              />
              <LabelledField
                label="Suffix — letters only, e.g. A, B, Diamond, Gold"
                placeholder="e.g. C"
                value={newClassSuffix}
                onChangeText={setNewClassSuffix}
                autoCapitalize="words"
              />
              <PrimaryButton
                label={state.savingClass ? 'Creating…' : 'Create the class'}
                disabled={state.savingClass || !newClassLevel || !newClassSuffix.trim()}
                onPress={async () => {
                  const ok = await presenter.addClass({
                    level: newClassLevel,
                    suffix: newClassSuffix,
                  });
                  if (ok) {
                    setNewClassLevel(null);
                    setNewClassSuffix('');
                  }
                }}
              />
            </View>
          )}

          <Text style={styles.section}>Subjects</Text>
          <RecordList
            items={subjectRows}
            onPressItem={(row) => openSubjectEditor(row.raw)}
            emptyText="No subjects yet — add the first one below."
          />

          <Text style={styles.section}>
            {editingSubject ? `Edit subject — ${editingSubject.name}` : 'Add a subject'}
          </Text>
          <LabelledField
            label="Subject name"
            placeholder="e.g. Computer Studies"
            value={subjectName}
            onChangeText={setSubjectName}
          />
          <LabelledField
            label="Departments"
            placeholder="Tap to tick — Core or JSS covers the junior classes"
            displayValue={
              subjectDepts.length
                ? subjectDepts.length === 1
                  ? subjectDepts[0]
                  : `${subjectDepts.length} departments selected`
                : ''
            }
            onPress={() => setDeptSheet(true)}
          />
          <LabelledField
            label={
              !allowJss
                ? 'Taught in (classes) — JSS hidden: SSS department only'
                : !allowSss
                  ? 'Taught in (classes) — SSS hidden: JSS subject only'
                  : 'Taught in (classes)'
            }
            placeholder="e.g. only the JSS classes — tap to tick"
            displayValue={
              subjectClasses.length
                ? subjectClasses.length === shownClasses.length
                  ? 'All shown classes'
                  : `${subjectClasses.length} classes selected`
                : ''
            }
            onPress={() => setClassSheet(true)}
          />
          <LabelledField
            label="Assigned teachers"
            placeholder="Tap to tick — the timetable only allows assigned teachers"
            displayValue={
              subjectTeachers.length
                ? subjectTeachers.length === 1
                  ? subjectTeachers[0]
                  : `${subjectTeachers.length} teachers assigned`
                : ''
            }
            onPress={() => setTeacherSheet(true)}
          />
          <SecondaryButton
            label={state.savingSubject ? 'Saving…' : editingSubject ? 'Save changes' : 'Add subject'}
            disabled={state.savingSubject}
            onPress={saveSubjectForm}
          />
          {editingSubject ? (
            <View style={styles.cancelWrap}>
              <SecondaryButton label="Cancel editing" disabled={state.savingSubject} onPress={clearSubjectForm} />
            </View>
          ) : null}

          <SelectSheet
            visible={deptSheet}
            label="Departments — tap to tick, then Done"
            options={DEPARTMENTS}
            multiple
            selectedValues={subjectDepts}
            onToggle={toggleDept}
            onClose={() => setDeptSheet(false)}
          />
          <SelectSheet
            visible={classSheet}
            label={
              !allowJss
                ? 'Classes this subject is taught in — SSS only'
                : !allowSss
                  ? 'Classes this subject is taught in — JSS only'
                  : 'Classes this subject is taught in'
            }
            options={shownClasses}
            multiple
            selectedValues={subjectClasses}
            onToggle={toggleClass}
            onClose={() => setClassSheet(false)}
          />
          <SelectSheet
            visible={classLevelSheet}
            label="Which level is the new class?"
            options={['JSS1', 'JSS2', 'JSS3', 'SSS1', 'SSS2', 'SSS3'].map((l) => ({
              label: l,
              value: l,
            }))}
            onSelect={(value) => {
              setNewClassLevel(value);
              setClassLevelSheet(false);
            }}
            onClose={() => setClassLevelSheet(false)}
          />
          <SelectSheet
            visible={teacherSheet}
            label="Assigned teachers — tap to tick, then Done"
            options={state.teachers.map((t) => ({ label: t.name, value: t.name }))}
            multiple
            selectedValues={subjectTeachers}
            onToggle={(value) =>
              setSubjectTeachers((prev) =>
                prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value],
              )
            }
            onClose={() => setTeacherSheet(false)}
          />
        </View>
      ) : null}
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  notice: { ...typography.body, color: colors.primary, marginBottom: spacing.sm },
  error: { ...typography.label, color: '#a33a2a', marginBottom: spacing.sm },
  section: { ...typography.sectionTitle, marginTop: spacing.md, marginBottom: spacing.sm },
  cancelWrap: { marginTop: spacing.xs },
  secondaryWrap: { marginTop: spacing.xs },
});
