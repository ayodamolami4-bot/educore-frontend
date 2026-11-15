/**
 * AD03 — Register or edit a student (View). Renders the form and forwards
 * every change to the Presenter; the Presenter validates and submits.
 * SelectSheet fields (gender, class, department) match the AD02 dropdowns.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import SelectSheet from '../components/SelectSheet';
import LabelledField from '../components/LabelledField';
import { PrimaryButton } from './AdminHomeView';
import { useActionErrorAlert } from '../components/FeedbackViews';
import { StudentFormPresenter } from '../../presenters/StudentFormPresenter';
import { StudentModel } from '../../models';
import useClassOptions from '../components/useClassOptions';
import { colors, typography, spacing } from '../theme';

const GENDERS = ['Female', 'Male'].map((g) => ({ label: g, value: g }));
const DEPARTMENTS = ['Science', 'Humanities / Arts', 'Business / Commercial'].map((d) => ({
  label: d,
  value: d,
}));

export default function StudentFormView({ route, navigation }) {
  const CLASSES = useClassOptions(); // live — a new class is enrol-able right away
  const [presenter] = useState(() => new StudentFormPresenter(StudentModel));
  const [state, setState] = useState(presenter.initialState);
  const [sheet, setSheet] = useState(null); // which SelectSheet is open

  useEffect(() => {
    presenter.attach(setState, navigation);
    presenter.load(route.params?.studentId);
    return () => presenter.detach();
  }, [presenter, navigation, route.params]);

  const v = state.values;
  const isEdit = state.mode === 'edit';
  const isSaving = state.status === 'saving';
  const isAccepted = state.status === 'accepted';

  // Save failures pop up; field-level validation stays inline under fields.
  useActionErrorAlert(state.errorText, 'Student not saved');

  return (
    <AdminScaffold
      eyebrow="Students"
      title={isEdit ? 'Edit student details' : 'Enrol a new student'}
      subtitle={
        isEdit
          ? 'Update the core record. The admission number never changes.'
          : 'The school server creates the admission number and the accounts.'
      }
    >
      <Text style={styles.section}>Student</Text>
      <View style={styles.row}>
        <View style={styles.half}>
          <LabelledField
            label="First name"
            value={v.firstName}
            onChangeText={(t) => presenter.onValueChange('firstName', t)}
            placeholder="e.g. Amara"
            error={state.errors.firstName}
          />
        </View>
        <View style={styles.half}>
          <LabelledField
            label="Last name"
            value={v.lastName}
            onChangeText={(t) => presenter.onValueChange('lastName', t)}
            placeholder="e.g. Okafor"
            error={state.errors.lastName}
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.half}>
          <LabelledField
            label="Gender"
            displayValue={v.gender || ''}
            placeholder="Select…"
            onPress={() => setSheet('gender')}
          />
        </View>
        <View style={styles.half}>
          <LabelledField
            label="Date of birth"
            value={v.dateOfBirth}
            onChangeText={(t) => presenter.onValueChange('dateOfBirth', t)}
            placeholder="YYYY-MM-DD"
            error={state.errors.dateOfBirth}
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.half}>
          <LabelledField
            label="Class"
            displayValue={v.classLabel || ''}
            placeholder="Select…"
            onPress={() => setSheet('class')}
            error={state.errors.classLabel}
          />
        </View>
        {v.classLabel.startsWith('SSS') ? (
          <View style={styles.half}>
            <LabelledField
              label="Department"
              displayValue={v.department || ''}
              placeholder="Select…"
              onPress={() => setSheet('department')}
            />
          </View>
        ) : (
          <View style={styles.half}>
            <Text style={styles.hint}>
              {v.classLabel ? 'JSS classes have no department.' : 'JSS or SSS is set by the class.'}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.section}>Parent / guardian</Text>
      {!isEdit && state.guardianSearchState === 'done' && state.guardianMatches.length > 0 ? (
        <View style={styles.guardianMatches}>
          <Text style={styles.matchHint}>
            {state.guardianMatches.length === 1
              ? 'An existing guardian matches this phone/email — pick it to add this student to their account.'
              : `${state.guardianMatches.length} existing guardians match this phone/email. Pick one to add this student to their account.`}
          </Text>
          <Text style={styles.idHint}>
            Phone and email are account IDs — a second account with the same ID is not created.
          </Text>
          {state.guardianMatches.map((g) => (
            <Pressable
              key={g.id}
              style={[
                styles.matchRow,
                state.linkGuardianId === g.id && styles.matchRowActive,
              ]}
              onPress={() => presenter.onLinkGuardian(g.id)}
            >
              <View style={styles.matchMain}>
                <Text style={styles.matchName}>{g.fullName}</Text>
                <Text style={styles.matchMeta}>
                  {g.phone || '—'} · {g.email || '—'} · {g.childrenCount} child
                  {g.childrenCount === 1 ? '' : 'ren'}
                </Text>
              </View>
              {state.linkGuardianId === g.id ? (
                <Text style={styles.matchCheck}>✓ linked</Text>
              ) : (
                <Text style={styles.matchLink}>Link</Text>
              )}
            </Pressable>
          ))}
        </View>
      ) : null}
      {!isEdit &&
      state.guardianSearchState === 'done' &&
      state.guardianMatches.length === 0 &&
      (v.guardianPhone || v.guardianEmail) ? (
        <Text style={styles.noMatchHint}>
          No existing guardian matches — a new guardian account will be created for this student.
        </Text>
      ) : null}
      <LabelledField
        label="Guardian name"
        value={v.guardianName}
        onChangeText={(t) => presenter.onValueChange('guardianName', t)}
        placeholder="e.g. Mrs. Ngozi Okafor"
        error={state.errors.guardianName}
      />
      <LabelledField
        label="Guardian phone"
        value={v.guardianPhone}
        onChangeText={(t) => presenter.onValueChange('guardianPhone', t)}
        placeholder="e.g. +234 803 111 2233"
        keyboardType="phone-pad"
        error={state.errors.guardianPhone}
      />
      <LabelledField
        label="Guardian email (optional)"
        value={v.guardianEmail}
        onChangeText={(t) => presenter.onValueChange('guardianEmail', t)}
        placeholder="e.g. ngozi.okafor@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        error={state.errors.guardianEmail}
      />

      <PrimaryButton
        label={
          isSaving
            ? 'Saving…'
            : isAccepted
              ? isEdit
                ? 'Saved ✓'
                : 'Enrolled ✓'
              : isEdit
                ? 'Save changes'
                : 'Complete enrolment'
        }
        disabled={isSaving || isAccepted}
        onPress={() => presenter.onSubmit()}
      />
      {state.notice ? <Text style={styles.notice}>{state.notice}</Text> : null}

      <SelectSheet
        visible={sheet === 'gender'}
        label="Gender"
        options={GENDERS}
        value={v.gender}
        onSelect={(val) => presenter.onValueChange('gender', val)}
        onClose={() => setSheet(null)}
      />
      <SelectSheet
        visible={sheet === 'class'}
        label="Class"
        options={CLASSES}
        value={v.classLabel}
        onSelect={(val) => presenter.onValueChange('classLabel', val)}
        onClose={() => setSheet(null)}
      />
      <SelectSheet
        visible={sheet === 'department'}
        label="Department"
        options={DEPARTMENTS}
        value={v.department}
        onSelect={(val) => presenter.onValueChange('department', val)}
        onClose={() => setSheet(null)}
      />
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  section: { ...typography.sectionTitle, marginTop: spacing.md, marginBottom: spacing.sm },
  hint: { ...typography.label, color: colors.muted, marginTop: spacing.md },
  formError: { ...typography.label, color: '#a33a2a', marginBottom: spacing.sm },
  notice: { ...typography.label, color: colors.muted, marginTop: spacing.sm, textAlign: 'center' },
  // Existing-guardian picker (enrol mode).
  guardianMatches: {
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  matchHint: { ...typography.label, color: colors.primary, marginBottom: spacing.xs },
  idHint: { ...typography.label, color: colors.muted, marginBottom: spacing.xs },
  noMatchHint: { ...typography.label, color: colors.muted, marginBottom: spacing.sm },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: 8,
    gap: spacing.sm,
  },
  matchRowActive: { backgroundColor: colors.positive },
  matchMain: { flex: 1 },
  matchName: { ...typography.body, fontWeight: '600' },
  matchMeta: { ...typography.label, color: colors.muted, marginTop: 2 },
  matchLink: { ...typography.label, color: colors.primary },
  matchCheck: { ...typography.label, color: colors.primary, fontWeight: '600' },
});
