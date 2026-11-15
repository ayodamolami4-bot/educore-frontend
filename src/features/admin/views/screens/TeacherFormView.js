/**
 * AD08 — Register or edit a teacher (View). A form for the profile fields,
 * a multi-select for the subjects they teach, a picker for their form class,
 * and the provisioning status with a Retry button while the account queues.
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
  const [formClass, setFormClass] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [subjectSheet, setSubjectSheet] = useState(false);
  const [classSheet, setClassSheet] = useState(false);
  const prefilled = useRef(false);
  const teacherId = route.params && route.params.teacherId;

  useEffect(() => {
    presenter.attach(setState, navigation);
    presenter.start(teacherId);
    return () => presenter.detach();
  }, [presenter, navigation, teacherId]);

  // Prefill once when the teacher record arrives (edit mode).
  useEffect(() => {
    if (!prefilled.current && state.mode === 'edit' && state.teacher) {
      prefilled.current = true;
      setFullName(state.teacher.fullName || '');
      setStaffNumber(state.teacher.staffNumber || '');
      setPhone(state.teacher.phone || '');
      setEmail(state.teacher.email || '');
      setFormClass(state.teacher.formClass || '');
      setSubjects(state.teacher.subjects || []);
    }
  }, [state.mode, state.teacher]);

  useActionErrorAlert(state.errorText);

  const save = () => {
    presenter.saveTeacher(
      { fullName, staffNumber, phone, email, subjects, formClass: formClass || null },
      state.mode === 'edit' ? state.teacher.subjects || [] : [],
    );
  };

  return (
    <AdminScaffold
      eyebrow="Staff"
      title={state.mode === 'edit' ? 'Edit teacher' : 'Register a teacher'}
      subtitle={
        state.mode === 'edit'
          ? 'Profile, subjects and form class — the timetable follows at once.'
          : 'The staff account is provisioned automatically after you save.'
      }
    >
      {state.status === 'loading' ? <LoadingView label="Loading the form…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} />
      ) : null}

      {state.status === 'editing' ? (
        <View>
          {state.notice ? <Text style={styles.notice}>{state.notice}</Text> : null}
          {state.provisioning && state.provisioning.status === 'Queued' ? (
            <View style={styles.provisioning}>
              <Text style={styles.provisioningText}>
                Staff account provisioning is queued.
              </Text>
              <SecondaryButton
                label="Retry provisioning"
                disabled={state.saving}
                onPress={() => presenter.retryProvisioning()}
              />
            </View>
          ) : null}

          <LabelledField
            label="Full name"
            placeholder="e.g. Mr. Chidi Nwachukwu"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            textContentType="name"
            autoComplete="name"
          />
          <LabelledField
            label="Staff number (automatic — the office never types this)"
            displayValue={
              state.mode === 'edit' ? staffNumber || '—' : state.staffNumberPreview || '…'
            }
          />
          <LabelledField
            label="Phone"
            placeholder="e.g. 0810 123 4567 or +234 810 123 4567"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
          />
          {/* Live check: letters AND a too-short/too-long number both show
              their reason here, not only when Save refuses them. */}
          {phone.trim() && phoneError(phone) ? (
            <Text style={styles.fieldError}>{phoneError(phone)}</Text>
          ) : null}
          <Text style={styles.fieldHint}>
            Saved in one format for everyone: +234 followed by 10 digits.
          </Text>
          <LabelledField
            label="Email"
            placeholder="e.g. chidi.nwachukwu@gmail.com — any domain works"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            textContentType="emailAddress"
            autoComplete="email"
          />
          <LabelledField
            label="Subjects taught"
            placeholder="Tap to tick — the timetable only allows assigned teachers"
            displayValue={
              subjects.length
                ? subjects.length === 1
                  ? subjects[0]
                  : `${subjects.length} subjects`
                : ''
            }
            onPress={() => setSubjectSheet(true)}
          />
          <LabelledField
            label="Form class"
            placeholder="Tap to pick — the class they are the form teacher of"
            displayValue={formClass || ''}
            onPress={() => setClassSheet(true)}
          />

          <View style={styles.actionsWrap}>
            <PrimaryButton
              label={state.saving ? 'Saving…' : state.mode === 'edit' ? 'Save changes' : 'Register teacher'}
              disabled={state.saving}
              onPress={save}
            />
          </View>
        </View>
      ) : null}

      <SelectSheet
        visible={subjectSheet}
        label="Subjects taught — tap to tick, then Done"
        options={state.subjects.map((s) => ({ label: s, value: s }))}
        multiple
        selectedValues={subjects}
        onToggle={(value) =>
          setSubjects((prev) =>
            prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value],
          )
        }
        onClose={() => setSubjectSheet(false)}
      />
      <SelectSheet
        visible={classSheet}
        label="Form class"
        options={[
          { label: '— no form class —', value: '' },
          ...state.classOptions.map((c) => ({ label: c.classLabel, value: c.classLabel })),
        ]}
        onSelect={(value) => {
          setFormClass(value);
          setClassSheet(false);
        }}
        onClose={() => setClassSheet(false)}
      />
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  fieldError: { ...typography.label, color: '#a33a2a', marginTop: -spacing.xs, marginBottom: spacing.sm },
  fieldHint: { ...typography.label, color: colors.muted, marginTop: -spacing.xs, marginBottom: spacing.sm },
  notice: { ...typography.body, color: colors.primary, marginBottom: spacing.sm },
  actionsWrap: { marginTop: spacing.md },
  provisioning: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  provisioningText: { ...typography.label, color: colors.muted, marginBottom: spacing.xs },
});
