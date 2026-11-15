/**
 * AD17 — View or correct a class register (View). Class picker → today's
 * registers → a submitted register's per-student rows. Tapping a student
 * opens the status sheet; corrections save at once and counts update.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import RecordList from '../components/RecordList';
import SelectSheet from '../components/SelectSheet';
import { LoadingView, ErrorState, EmptyState, useActionErrorAlert } from '../components/FeedbackViews';
import { SecondaryButton } from './AdminHomeView';
import { RegisterReviewPresenter } from '../../presenters/RegisterReviewPresenter';
import { AttendanceModel, AcademicStructureModel } from '../../models';
import { colors, typography, spacing } from '../theme';

const STATUSES = ['Present', 'Absent', 'Late', 'Excused'].map((s) => ({ label: s, value: s }));

export default function RegisterReviewView({ navigation, route }) {
  const [presenter] = useState(() => new RegisterReviewPresenter(AttendanceModel, AcademicStructureModel));
  const [state, setState] = useState(presenter.initialState);
  const loadedOnce = useRef(false);
  const [pickerOpen, setPickerOpen] = useState(!route.params?.classId); // no class in the route → open the picker straight away
  const [pendingStudent, setPendingStudent] = useState(null);
  const [statusSheet, setStatusSheet] = useState(false);
  const initialClassId = route.params && route.params.classId;

  useEffect(() => {
    presenter.attach(setState, navigation);
    if (initialClassId) presenter.openClass(initialClassId);
    else {
      presenter.pickClass();
    }
    const unsubscribe = navigation.addListener('focus', () => {
      if (loadedOnce.current && state.register) presenter.openRegister(state.register.id);
      loadedOnce.current = true;
    });
    return () => {
      unsubscribe?.remove?.();
      presenter.detach();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presenter, navigation, initialClassId]);

  // Refusals (never-submitted register, unknown student) pop up.
  useActionErrorAlert(state.errorText, 'Register');

  const register = state.register;

  const onEntryPress = (entry) => {
    setPendingStudent(entry);
    setStatusSheet(true);
  };

  const rows = register
    ? state.entries.map((e) => ({
        id: e.id,
        title: e.studentName,
        meta: `Marked ${e.status.toLowerCase()}`,
        status: e.status,
        raw: e,
      }))
    : state.registers.map((r) => ({
        id: r.id,
        title: `${r.subject} · ${r.time}`,
        meta: r.status === 'Submitted'
          ? `Taken by ${r.teacher} · ${r.absentCount} absent · ${r.lateCount} late`
          : 'Never submitted',
        status: r.status,
        raw: r,
      }));

  return (
    <AdminScaffold
      eyebrow="Academics"
      title={register ? `Register — ${register.classLabel}` : 'View or correct a register'}
      subtitle={
        register
          ? `${register.subject} · ${register.time} · ${register.absentCount} absent, ${register.lateCount} late`
          : 'Pick a class to see its registers for today'
      }
    >
      {state.status === 'loading' ? <LoadingView label="Opening the register…" /> : null}
      {state.status === 'error' ? (
        <ErrorState message={state.errorText} onRetry={() => presenter.onRetry()} />
      ) : null}

      {state.status === 'content' && !register ? (
        <View>
          {state.registers.length === 0 ? (
            <EmptyState
              title="No registers for this class today"
              hint="Registers appear as teachers submit them."
            />
          ) : (
            <>
              {state.notice ? <Text style={styles.notice}>{state.notice}</Text> : null}
              <Text style={styles.hint}>
                Tap a submitted register to check it. Missing registers wait on the teacher.
              </Text>
              <RecordList
                items={rows}
                onPressItem={(row) =>
                  row.raw.status === 'Submitted'
                    ? presenter.openRegister(row.raw.id)
                    : presenter.refuseMissing()
                }
                emptyText="No registers yet."
              />
            </>
          )}
        </View>
      ) : null}

      {state.status === 'content' && register ? (
        <View>
          {state.notice ? <Text style={styles.notice}>{state.notice}</Text> : null}
          <Text style={styles.hint}>Tap a student to correct their status.</Text>
          <RecordList
            items={rows}
            onPressItem={(row) => onEntryPress(row.raw)}
            emptyText="Nobody is on this register — the class has no active students."
          />
          <SecondaryButton
            style={styles.backBtn}
            label="Back to registers"
            onPress={() => presenter.backToRegisters()}
          />
        </View>
      ) : null}

      <SelectSheet
        visible={pickerOpen && state.status === 'picking'}
        label="Which class register?"
        options={state.classOptions.map((c) => ({ label: c.classLabel, value: c.classLabel }))}
        onSelect={(value) => {
          setPickerOpen(false);
          presenter.openClass(value);
        }}
        onClose={() => setPickerOpen(false)}
      />
      <SelectSheet
        visible={statusSheet}
        label={`${pendingStudent ? pendingStudent.studentName : 'Student'} — correct to what?`}
        options={STATUSES}
        value={pendingStudent ? pendingStudent.status : null}
        onSelect={(value) => {
          setStatusSheet(false);
          if (pendingStudent) presenter.correct(pendingStudent.studentId, value);
          setPendingStudent(null);
        }}
        onClose={() => setStatusSheet(false)}
      />
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  notice: { ...typography.body, color: colors.primary, marginBottom: spacing.sm },
  hint: { ...typography.label, color: colors.muted, marginBottom: spacing.sm },
  // Breathing room so "Back to registers" never touches the bottom of the
  // student list above it (the office reported the button had no space on top).
  backBtn: { marginTop: spacing.lg },
});
