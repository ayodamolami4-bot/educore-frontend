/**
 * AD03 — Student enrolment and core-record edit.
 * Uses backend-issued class IDs and school metadata; no fallback demo classes.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import SelectSheet from '../components/SelectSheet';
import LabelledField from '../components/LabelledField';
import { PrimaryButton } from './AdminHomeView';
import { ErrorState, LoadingView, useActionErrorAlert } from '../components/FeedbackViews';
import { StudentFormPresenter } from '../../presenters/StudentFormPresenter';
import { StudentModel } from '../../models';
import { colors, typography, spacing } from '../theme';

const GENDERS = [
  { label: 'Female', value: 'FEMALE' },
  { label: 'Male', value: 'MALE' },
];
const DEPARTMENTS = [
  { label: 'Science', value: 'SCIENCE' },
  { label: 'Arts', value: 'ARTS' },
  { label: 'Commercial', value: 'COMMERCIAL' },
];
const RELATIONSHIPS = [
  { label: 'Mother', value: 'MOTHER' },
  { label: 'Father', value: 'FATHER' },
  { label: 'Guardian', value: 'GUARDIAN' },
];

export default function StudentFormView({ route, navigation }) {
  const [presenter] = useState(() => new StudentFormPresenter(StudentModel));
  const [state, setState] = useState(presenter.initialState);
  const [sheet, setSheet] = useState(null);

  useEffect(() => {
    presenter.attach(setState, navigation);
    presenter.load(route.params?.studentId);
    return () => presenter.detach();
  }, [presenter, navigation, route.params?.studentId]);

  const v = state.values;
  const isEdit = state.mode === 'edit';
  const isSaving = state.status === 'saving';
  const isAccepted = state.status === 'accepted';
  const selectedClass = state.classOptions.find((item) => item.id === v.classId);
  const selectedClassLabel = selectedClass?.label ?? v.classLabel;
  const genderLabel = GENDERS.find((item) => item.value === v.gender)?.label ?? v.gender;
  const departmentLabel = DEPARTMENTS.find((item) => item.value === v.department)?.label ?? v.department;
  const relationshipLabel = RELATIONSHIPS.find((item) => item.value === v.guardianRelationship)?.label ?? v.guardianRelationship;

  useActionErrorAlert(state.errorText, 'Student record not saved');

  return (
    <AdminScaffold
      eyebrow="Students"
      title={isEdit ? 'Edit student details' : 'Enrol a new student'}
      subtitle={isEdit
        ? 'Update the core record. The admission number and dated placement stay server-managed.'
        : 'The school server creates the admission number and links the verified guardian.'}
    >
      {state.status === 'loading' ? <LoadingView label="Loading school metadata and classes…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.load(route.params?.studentId)} />
      ) : null}

      {['ready', 'saving', 'accepted', 'failed'].includes(state.status) ? (
        <>
          <Text style={styles.section}>Student</Text>
          <View style={styles.row}>
            <View style={styles.half}>
              <LabelledField
                label="First name"
                value={v.firstName}
                onChangeText={(value) => presenter.onValueChange('firstName', value)}
                placeholder="e.g. Amara"
                error={state.errors.firstName}
              />
            </View>
            <View style={styles.half}>
              <LabelledField
                label="Last name"
                value={v.lastName}
                onChangeText={(value) => presenter.onValueChange('lastName', value)}
                placeholder="e.g. Okafor"
                error={state.errors.lastName}
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.half}>
              <LabelledField
                label="Recorded sex"
                displayValue={genderLabel || ''}
                placeholder="Select…"
                onPress={() => setSheet('gender')}
                error={state.errors.gender}
              />
            </View>
            <View style={styles.half}>
              <LabelledField
                label="Date of birth *"
                value={v.dateOfBirth}
                onChangeText={(value) => presenter.onValueChange('dateOfBirth', value)}
                placeholder="YYYY-MM-DD"
                error={state.errors.dateOfBirth}
              />
            </View>
          </View>

          {isEdit ? (
            <>
              <Text style={styles.hint}>Current class: {selectedClassLabel || 'See the student profile'}. Class changes use the reviewed transfer workflow.</Text>
            </>
          ) : (
            <>
              <View style={styles.row}>
                <View style={styles.half}>
                  <LabelledField
                    label="Class *"
                    displayValue={selectedClassLabel || ''}
                    placeholder="Select an active class…"
                    onPress={() => setSheet('class')}
                    error={state.errors.classId}
                  />
                </View>
                {selectedClass?.level?.startsWith('SSS') ? (
                  <View style={styles.half}>
                    <LabelledField
                      label="Department"
                      displayValue={departmentLabel || ''}
                      placeholder="Select…"
                      onPress={() => setSheet('department')}
                    />
                  </View>
                ) : (
                  <View style={styles.half}>
                    <Text style={styles.hint}>JSS classes have no department.</Text>
                  </View>
                )}
              </View>
              <LabelledField
                label="Enrolment start date *"
                value={v.startsOn}
                onChangeText={(value) => presenter.onValueChange('startsOn', value)}
                placeholder="YYYY-MM-DD"
                error={state.errors.startsOn}
              />
            </>
          )}

          {state.metadataFields.map((field) => (
            <LabelledField
              key={field.key}
              label={`${field.label ?? field.key}${field.required ? ' *' : ''}`}
              value={String(v.fields?.[field.key] ?? '')}
              onChangeText={(value) => presenter.onValueChange(`field:${field.key}`, value)}
              placeholder={field.placeholder ?? ''}
              error={state.errors[field.key]}
            />
          ))}

          {!isEdit ? (
            <>
              <Text style={styles.section}>Parent / guardian</Text>
              {state.guardianSearchState === 'done' && state.guardianMatches.length > 0 ? (
                <View style={styles.guardianMatches}>
                  <Text style={styles.matchHint}>
                    Existing school guardian records matched this contact. Link the correct record rather than creating a duplicate.
                  </Text>
                  {state.guardianMatches.map((guardian) => (
                    <Pressable
                      key={guardian.id}
                      style={[styles.matchRow, state.linkGuardianId === guardian.id && styles.matchRowActive]}
                      onPress={() => presenter.onLinkGuardian(guardian.id)}
                    >
                      <View style={styles.matchMain}>
                        <Text style={styles.matchName}>{guardian.fullName}</Text>
                        <Text style={styles.matchMeta}>{guardian.phone || '—'} · {guardian.email || '—'}</Text>
                      </View>
                      <Text style={styles.matchLink}>{state.linkGuardianId === guardian.id ? '✓ linked' : 'Link'}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {state.guardianSearchState === 'done' && state.guardianMatches.length === 0 && (v.guardianPhone || v.guardianEmail) ? (
                <Text style={styles.noMatchHint}>
                  No matching school guardian was found. A new guardian record requires an in-person relationship check and its verification reference.
                </Text>
              ) : null}
              <LabelledField
                label="Guardian name *"
                value={v.guardianName}
                onChangeText={(value) => presenter.onValueChange('guardianName', value)}
                placeholder="e.g. Mrs. Ngozi Okafor"
                error={state.errors.guardianName}
              />
              <LabelledField
                label="Guardian phone *"
                value={v.guardianPhone}
                onChangeText={(value) => presenter.onValueChange('guardianPhone', value)}
                placeholder="e.g. +234 803 111 2233"
                keyboardType="phone-pad"
                error={state.errors.guardianPhone}
              />
              <LabelledField
                label="Guardian email (optional)"
                value={v.guardianEmail}
                onChangeText={(value) => presenter.onValueChange('guardianEmail', value)}
                placeholder="e.g. ngozi.okafor@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                error={state.errors.guardianEmail}
              />
              <LabelledField
                label="Relationship *"
                displayValue={relationshipLabel}
                onPress={() => setSheet('relationship')}
                error={state.errors.guardianRelationship}
              />
              {!state.linkGuardianId ? (
                <LabelledField
                  label="In-person verification reference *"
                  value={v.guardianVerificationReference}
                  onChangeText={(value) => presenter.onValueChange('guardianVerificationReference', value)}
                  placeholder="Reference recorded by the school office"
                  error={state.errors.guardianVerificationReference}
                />
              ) : null}
            </>
          ) : (
            <>
              <Text style={styles.section}>Change reason</Text>
              <LabelledField
                label="Reason for updating this student record *"
                value={v.reason}
                onChangeText={(value) => presenter.onValueChange('reason', value)}
                placeholder="Explain the record correction or update"
                error={state.errors.reason}
              />
            </>
          )}

          <PrimaryButton
            label={isSaving ? 'Saving…' : isAccepted ? 'Saved ✓' : isEdit ? 'Save student changes' : 'Complete enrolment'}
            disabled={isSaving || isAccepted || state.status === 'loading'}
            onPress={() => presenter.onSubmit()}
          />
          {state.notice ? <Text style={styles.notice}>{state.notice}</Text> : null}
        </>
      ) : null}

      <SelectSheet
        visible={sheet === 'gender'}
        label="Recorded sex"
        options={GENDERS}
        value={v.gender}
        onSelect={(value) => presenter.onValueChange('gender', value)}
        onClose={() => setSheet(null)}
      />
      <SelectSheet
        visible={sheet === 'class'}
        label="Current-session classes"
        options={state.classOptions.map((item) => ({ label: item.label, value: item.id }))}
        value={v.classId}
        onSelect={(value) => presenter.onValueChange('classId', value)}
        onClose={() => setSheet(null)}
      />
      <SelectSheet
        visible={sheet === 'department'}
        label="Department"
        options={DEPARTMENTS}
        value={v.department}
        onSelect={(value) => presenter.onValueChange('department', value)}
        onClose={() => setSheet(null)}
      />
      <SelectSheet
        visible={sheet === 'relationship'}
        label="Guardian relationship"
        options={RELATIONSHIPS}
        value={v.guardianRelationship}
        onSelect={(value) => presenter.onValueChange('guardianRelationship', value)}
        onClose={() => setSheet(null)}
      />
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  section: { ...typography.sectionTitle, marginTop: spacing.md, marginBottom: spacing.sm },
  hint: { ...typography.label, color: colors.muted, marginTop: spacing.md, marginBottom: spacing.sm },
  notice: { ...typography.label, color: colors.muted, marginTop: spacing.sm, textAlign: 'center' },
  guardianMatches: {
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  matchHint: { ...typography.label, color: colors.primary, marginBottom: spacing.xs },
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
});
