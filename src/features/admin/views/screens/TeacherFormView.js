/**
 * AD08 — Teacher registration and staff profile editing.
 * New teaching assignments use actual class/subject IDs and a weekly-period
 * target. Editing changes staff contact facts only; assignments are separate
 * versioned handover records.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import SelectSheet from '../components/SelectSheet';
import { LoadingView, ErrorState, useActionErrorAlert } from '../components/FeedbackViews';
import LabelledField from '../components/LabelledField';
import { PrimaryButton, SecondaryButton } from './AdminHomeView';
import { TeacherFormPresenter } from '../../presenters/TeacherFormPresenter';
import { TeacherModel, AcademicStructureModel } from '../../models';
import { phoneError } from '../../api/validation';
import { colors, typography, spacing } from '../theme';

export default function TeacherFormView({ navigation, route }) {
  const [presenter] = useState(() => new TeacherFormPresenter(TeacherModel, AcademicStructureModel));
  const [state, setState] = useState(presenter.initialState);
  const [fullName, setFullName] = useState('');
  const [staffNumber, setStaffNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [assignmentIds, setAssignmentIds] = useState([]);
  const [weeklyPeriods, setWeeklyPeriods] = useState('');
  const [reason, setReason] = useState('');
  const [retryReason, setRetryReason] = useState('');
  const [assignmentSheet, setAssignmentSheet] = useState(false);
  const prefilled = useRef(false);
  const teacherId = route.params?.teacherId;

  useEffect(() => {
    presenter.attach(setState, navigation);
    presenter.start(teacherId);
    return () => presenter.detach();
  }, [presenter, navigation, teacherId]);

  useEffect(() => {
    if (!prefilled.current && state.mode === 'edit' && state.teacher) {
      prefilled.current = true;
      setFullName(state.teacher.fullName || '');
      setStaffNumber(state.teacher.staffNumber || '');
      setPhone(state.teacher.phone || '');
      setEmail(state.teacher.email || '');
    }
  }, [state.mode, state.teacher]);

  useActionErrorAlert(state.errorText, 'Teacher record not saved');

  const selectedAssignments = state.assignmentOptions.filter((item) => assignmentIds.includes(item.id));
  const selectedSubjectNames = [...new Set(selectedAssignments.map((item) =>
    state.subjects.find((subject) => subject.id === item.subjectId)?.name,
  ).filter(Boolean))];
  const latestProvisioning = state.provisioning?.items?.[0] ?? null;
  const canRetry = state.provisioning?.items?.some((item) => ['FAILED', 'RETRYING'].includes(item.state));

  const save = () => presenter.saveTeacher({
    fullName,
    staffNumber,
    phone,
    email,
    assignmentIds,
    weeklyPeriods,
    reason,
  });

  return (
    <AdminScaffold
      eyebrow="Staff"
      title={state.mode === 'edit' ? 'Edit teacher' : 'Register a teacher'}
      subtitle={state.mode === 'edit'
        ? 'Update staff contact information without changing existing teaching duties.'
        : 'Assign subjects to actual classes before the staff record is created.'}
    >
      {state.status === 'loading' ? <LoadingView label="Loading teachers, subjects and classes…" /> : null}
      {state.status === 'error' ? <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} /> : null}

      {state.status === 'editing' ? (
        <View>
          {state.notice ? <Text style={styles.notice}>{state.notice}</Text> : null}

          {state.mode === 'edit' && state.provisioning ? (
            <View style={styles.provisioning}>
              <Text style={styles.provisioningText}>Staff account provisioning: {latestProvisioning?.state ?? 'No event status returned'}</Text>
              {latestProvisioning?.errorCode ? <Text style={styles.fieldError}>Last delivery error: {latestProvisioning.errorCode}</Text> : null}
              {canRetry ? (
                <>
                  <LabelledField
                    label="Provisioning retry reason *"
                    value={retryReason}
                    onChangeText={setRetryReason}
                    placeholder="Explain why this failed event is being retried"
                  />
                  <SecondaryButton
                    label="Retry provisioning"
                    disabled={state.saving || retryReason.trim().length < 5}
                    onPress={() => presenter.retryProvisioning(retryReason)}
                  />
                </>
              ) : null}
            </View>
          ) : null}

          <LabelledField
            label="Full name *"
            placeholder="e.g. Mr. Chidi Nwachukwu"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            textContentType="name"
            autoComplete="name"
          />
          <LabelledField
            label="Staff number"
            displayValue={state.mode === 'edit' ? staffNumber || '—' : 'Assigned by the school after registration'}
          />
          <LabelledField
            label="Phone *"
            placeholder="e.g. 0810 123 4567 or +234 810 123 4567"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
          />
          {phone.trim() && phoneError(phone) ? <Text style={styles.fieldError}>{phoneError(phone)}</Text> : null}
          <Text style={styles.fieldHint}>Saved in one format for everyone: +234 followed by 10 digits.</Text>
          <LabelledField
            label="Email (optional)"
            placeholder="e.g. chidi.nwachukwu@gmail.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            textContentType="emailAddress"
            autoComplete="email"
          />

          {state.mode === 'create' ? (
            <>
              <LabelledField
                label="Class and subject assignments *"
                displayValue={selectedAssignments.length ? `${selectedAssignments.length} assignments selected` : ''}
                placeholder="Choose one or more class / subject pairs"
                onPress={() => setAssignmentSheet(true)}
              />
              {selectedSubjectNames.length ? (
                <Text style={styles.fieldHint}>Subjects: {selectedSubjectNames.join(', ')}</Text>
              ) : null}
              <Text style={styles.fieldHint}>
                The selected subjects are assigned to every selected class. Eligible levels are derived from those classes.
              </Text>
              <LabelledField
                label="Weekly periods for each selected assignment *"
                value={weeklyPeriods}
                onChangeText={setWeeklyPeriods}
                placeholder="1–10"
                keyboardType="number-pad"
              />
            </>
          ) : (
            <>
              <Text style={styles.section}>Current teaching assignments</Text>
              {(state.teacher?.assignments ?? []).map((assignment) => (
                <Text key={assignment.id} style={styles.assignmentLine}>
                  {assignment.classLabel} · {assignment.subjectName} · {assignment.weeklyPeriods} periods / week
                </Text>
              ))}
              <Text style={styles.fieldHint}>To change a teaching duty, use the versioned assignment handover workflow. This profile form does not silently replace existing assignments.</Text>
              <LabelledField
                label="Reason for staff record change *"
                value={reason}
                onChangeText={setReason}
                placeholder="Explain this contact or staff-record correction"
              />
            </>
          )}

          <View style={styles.actionsWrap}>
            <PrimaryButton
              label={state.saving ? 'Saving…' : state.mode === 'edit' ? 'Save staff details' : 'Register teacher'}
              disabled={state.saving || (state.mode === 'create' && (!assignmentIds.length || !weeklyPeriods))}
              onPress={save}
            />
          </View>
        </View>
      ) : null}

      <SelectSheet
        visible={assignmentSheet}
        label="Class and subject assignments — tap to select"
        options={state.assignmentOptions.map((item) => ({ label: item.label, value: item.id }))}
        multiple
        selectedValues={assignmentIds}
        onToggle={(value) => setAssignmentIds((current) =>
          current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
        )}
        onClose={() => setAssignmentSheet(false)}
      />
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  fieldError: { ...typography.label, color: '#a33a2a', marginTop: -spacing.xs, marginBottom: spacing.sm },
  fieldHint: { ...typography.label, color: colors.muted, marginTop: -spacing.xs, marginBottom: spacing.sm },
  notice: { ...typography.body, color: colors.primary, marginBottom: spacing.sm },
  section: { ...typography.sectionTitle, marginTop: spacing.md, marginBottom: spacing.sm },
  assignmentLine: { ...typography.body, marginBottom: spacing.xs },
  actionsWrap: { marginTop: spacing.md },
  provisioning: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: spacing.sm, marginBottom: spacing.sm },
  provisioningText: { ...typography.label, color: colors.muted, marginBottom: spacing.xs },
});
