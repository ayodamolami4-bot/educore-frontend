/**
 * AD03 — Student enrolment and core-record edit.
 * Uses backend-issued class IDs and school metadata; no fallback demo classes.
 */
import React, { useEffect, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import SelectSheet from '../components/SelectSheet';
import LabelledField from '../components/LabelledField';
import { PrimaryButton, SecondaryButton } from './AdminHomeView';
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
  const [copyNotice, setCopyNotice] = useState('');

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

  const copyAccessDetails = async (label, credential) => {
    if (!credential?.loginId || !credential?.activationCode) return;
    const content = [
      `EduCore ${label} access`,
      `Login ID: ${credential.loginId}`,
      `One-time activation code: ${credential.activationCode}`,
      'Activate the account and create a personal password before signing in.',
    ].join('\\n');
    try {
      await Clipboard.setStringAsync(content);
      setCopyNotice(`${label} access details copied.`);
    } catch {
      setCopyNotice('Copy was unavailable. Select the login ID and activation code to copy them manually.');
    }
  };

  const registeredStudentName = state.createdRecord?.fullName ||
    [v.firstName, v.lastName].filter(Boolean).join(' ');
  const registeredParentName = state.createdRecord?.guardian?.fullName ||
    state.createdRecord?.guardians?.[0]?.fullName || v.guardianName;

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

      {['ready', 'saving', 'failed'].includes(state.status) ? (
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
              {state.subjectChoiceGroups.map((group) => {
                const selectedId = v.subjectIds?.[group.key] ?? '';
                const selectedName = group.options.find((item) => item.id === selectedId)?.name ?? '';
                return (
                  <View key={group.key} style={styles.choiceGroup}>
                    <LabelledField
                      label={`Subject choice · ${group.label} *`}
                      displayValue={selectedName}
                      placeholder="Choose one curriculum option…"
                      onPress={() => setSheet(`subjectChoice:${group.key}`)}
                      error={state.errors[`subjectChoice:${group.key}`]}
                    />
                    <SelectSheet
                      visible={sheet === `subjectChoice:${group.key}`}
                      label={`Choose one · ${group.label}`}
                      options={group.options.map((item) => ({ label: item.name, value: item.id }))}
                      value={selectedId}
                      onSelect={(value) => presenter.onValueChange(`subjectChoice:${group.key}`, value)}
                      onClose={() => setSheet(null)}
                    />
                  </View>
                );
              })}
              {state.subjectChoiceGroups.length ? (
                <Text style={styles.hint}>Choose exactly one subject in every published curriculum choice group.</Text>
              ) : null}
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

      {isAccepted ? (
        <View style={styles.credentialsPanel}>
          <Text style={styles.section}>Registration complete</Text>
          <Text style={styles.notice}>
            {state.notice || 'The student record has been saved.'}
          </Text>
          {state.credentialStatus === 'issuing' ? (
            <Text style={styles.hint}>Creating the student and parent access slips…</Text>
          ) : null}
          {state.credentialError ? (
            <Text style={styles.credentialError}>{state.credentialError}</Text>
          ) : null}

          {state.credentials?.student ? (
            <AccessCredentialCard
              title="Student account"
              personName={registeredStudentName}
              credential={state.credentials.student}
              onCopy={() => copyAccessDetails('Student', state.credentials.student)}
            />
          ) : null}
          {state.credentials?.parent ? (
            <AccessCredentialCard
              title="Parent / guardian account"
              personName={registeredParentName}
              credential={state.credentials.parent}
              onCopy={() => copyAccessDetails('Parent', state.credentials.parent)}
            />
          ) : null}

          {state.credentialStatus === 'ready' ? (
            <Text style={styles.hint}>
              Both access slips are ready. Activate each account with its login ID and one-time code, then create a separate password.
            </Text>
          ) : null}
          {state.credentialStatus === 'failed' ? (
            <PrimaryButton
              label="Retry missing access slip"
              onPress={() => presenter.onRetryCredentials()}
            />
          ) : null}
          {copyNotice ? <Text style={styles.notice}>{copyNotice}</Text> : null}
        </View>
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

function AccessCredentialCard({ title, personName, credential, onCopy }) {
  return (
    <View style={styles.credentialCard}>
      <Text style={styles.credentialTitle}>{title}</Text>
      {personName ? <Text style={styles.credentialPerson}>{personName}</Text> : null}
      <Text style={styles.credentialLabel}>Login ID</Text>
      <Text selectable style={styles.credentialValue}>{credential.loginId}</Text>
      <Text style={styles.credentialLabel}>One-time activation code</Text>
      <Text selectable style={styles.credentialValue}>{credential.activationCode}</Text>
      <Text style={styles.credentialHint}>
        This code activates the account; it is not the account password.
      </Text>
      <SecondaryButton label="Copy access details" onPress={onCopy} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  section: { ...typography.sectionTitle, marginTop: spacing.md, marginBottom: spacing.sm },
  hint: { ...typography.label, color: colors.muted, marginTop: spacing.md, marginBottom: spacing.sm },
  notice: { ...typography.label, color: colors.muted, marginTop: spacing.sm, textAlign: 'center' },
  credentialsPanel: { marginTop: spacing.md, gap: spacing.sm },
  credentialCard: {
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  credentialTitle: { ...typography.sectionTitle, color: colors.primary },
  credentialPerson: { ...typography.body, fontWeight: '600' },
  credentialLabel: { ...typography.label, color: colors.muted, marginTop: spacing.xs },
  credentialValue: {
    ...typography.body,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingVertical: spacing.xs,
  },
  credentialHint: { ...typography.label, color: colors.muted, marginBottom: spacing.xs },
  credentialError: { ...typography.label, color: '#a33a2a', marginVertical: spacing.sm },
  choiceGroup: { marginTop: spacing.xs },
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
