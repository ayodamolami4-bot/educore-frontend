/**
 * AD14 — Build a term timetable from the class's active teaching assignments.
 * Each lesson is an individual server-backed record in the term-wide plan.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Alert, StyleSheet } from 'react-native';
import AdminScaffold from '../components/AdminScaffold';
import RecordList from '../components/RecordList';
import SelectSheet from '../components/SelectSheet';
import { LoadingView, ErrorState, Notice } from '../components/FeedbackViews';
import { PrimaryButton, SecondaryButton } from './AdminHomeView';
import { TimetableBuilderPresenter } from '../../presenters/TimetableBuilderPresenter';
import { TimetableModel, AcademicStructureModel, CalendarModel } from '../../models';
import { colors, typography, spacing } from '../theme';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DURATIONS = [
  { label: '30 minutes', value: 30 },
  { label: '60 minutes', value: 60 },
];

export default function TimetableBuilderView({ navigation, route }) {
  const [presenter] = useState(() =>
    new TimetableBuilderPresenter(TimetableModel, AcademicStructureModel, CalendarModel)
  );
  const [state, setState] = useState(presenter.initialState);
  const loadedOnce = useRef(false);
  const [classSheet, setClassSheet] = useState(!route.params?.classId);
  const [assignmentSheet, setAssignmentSheet] = useState(false);
  const [daySheet, setDaySheet] = useState(false);
  const [durationSheet, setDurationSheet] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState('');
  const [assignmentId, setAssignmentId] = useState('');
  const [day, setDay] = useState('Monday');
  const [start, setStart] = useState('08:00');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [room, setRoom] = useState('');

  const draft = state.draft;
  const isDraft = draft?.status === 'DRAFT';
  const filledCount = draft?.slots?.length ?? 0;

  useEffect(() => {
    presenter.attach(setState, navigation);
    if (route.params?.classId) presenter.openForClass(route.params.classId);
    else presenter.pickClass();
    const unsubscribe = navigation.addListener('focus', () => {
      if (loadedOnce.current && state.selectedClass) {
        presenter.openForClass(state.selectedClass.id);
      }
      loadedOnce.current = true;
    });
    return () => {
      unsubscribe?.remove?.();
      presenter.detach();
    };
  }, [presenter, navigation, route.params?.classId]);

  const openNewLesson = (selectedDay = 'Monday') => {
    setEditingLessonId('');
    setAssignmentId(state.assignments[0]?.id ?? '');
    setDay(selectedDay);
    setStart('08:00');
    setDurationMinutes(30);
    setRoom('');
    setFormOpen(true);
  };

  const openEditLesson = (lesson) => {
    setEditingLessonId(lesson.id);
    setAssignmentId(lesson.assignmentId);
    setDay(lesson.day);
    setStart(lesson.start);
    setDurationMinutes(lesson.durationMinutes);
    setRoom(lesson.room ?? '');
    setFormOpen(true);
  };

  const onLessonPress = (lesson) => {
    if (!isDraft) return;
    Alert.alert(
      lesson.subject + ' · ' + lesson.day,
      lesson.time + ' · ' + (lesson.teacherName ?? '') + (lesson.room ? ' · ' + lesson.room : ''),
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit lesson', onPress: () => openEditLesson(lesson) },
        {
          text: 'Remove lesson',
          style: 'destructive',
          onPress: () => Alert.alert(
            'Remove this lesson?',
            'This removes the lesson from the draft term plan. The currently published timetable remains unchanged.',
            [
              { text: 'Keep lesson', style: 'cancel' },
              { text: 'Remove', style: 'destructive', onPress: () => presenter.removeSlot(lesson.id) },
            ],
          ),
        },
      ],
    );
  };

  const saveLesson = async () => {
    const saved = await presenter.saveLesson({
      lessonId: editingLessonId || undefined,
      assignmentId,
      day,
      start: start.trim(),
      durationMinutes,
      room,
    });
    if (saved) {
      setFormOpen(false);
      setEditingLessonId('');
    }
  };

  const classOptions = state.classOptions.map((item) => ({
    value: item.id,
    label: item.classLabel,
  }));

  return (
    <AdminScaffold
      eyebrow="Academics"
      title={draft ? 'Timetable — ' + draft.classLabel : 'Build the weekly timetable'}
      subtitle={draft
        ? (draft.termLabel + ' · effective ' + draft.effectiveFrom + ' · ' + draft.status)
        : 'Choose a class to edit its term timetable'}
    >
      {state.status === 'loading' ? <LoadingView label="Opening the term timetable…" /> : null}
      {state.status === 'error' ? (
        <ErrorState
          message={state.errorText}
          onRetry={() => {
            if (state.selectedClass) presenter.openForClass(state.selectedClass.id);
            else {
              presenter.pickClass();
              setClassSheet(true);
            }
          }}
        />
      ) : null}
      {state.notice ? <Notice text={state.notice} /> : null}

      {state.status === 'picking' && !classSheet ? (
        <SecondaryButton label="Choose a class" onPress={() => setClassSheet(true)} />
      ) : null}

      {state.status === 'content' && draft ? (
        <View>
          <View style={styles.summary}>
            <Text style={styles.summaryText}>
              {filledCount} scheduled lessons in this class view · plan version {draft.version}
            </Text>
            <Text style={styles.hint}>
              This is one term-wide timetable plan. Lessons are stored using the active teacher-subject assignments; editing this class does not create a separate class plan.
            </Text>
          </View>

          {draft.weeklyTargets?.length ? (
            <View style={styles.targets}>
              <Text style={styles.section}>Required weekly periods</Text>
              {draft.weeklyTargets.map((target) => {
                const assignment = state.assignments.find((item) => item.id === target.assignmentId);
                return (
                  <View key={target.assignmentId} style={styles.targetRow}>
                    <Text style={styles.targetName}>{assignment?.label ?? 'Assigned subject'}</Text>
                    <Text style={styles.targetValue}>
                      {target.scheduledPeriods} / {target.requiredPeriods}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}

          {DAYS.map((weekday) => {
            const lessons = draft.slots
              .filter((lesson) => lesson.day === weekday)
              .sort((a, b) => a.startMinute - b.startMinute);
            return (
              <View key={weekday}>
                <Text style={styles.section}>{weekday}</Text>
                <RecordList
                  items={lessons.map((lesson) => ({
                    id: lesson.id,
                    title: lesson.time + ' · ' + lesson.subject,
                    meta: [
                      lesson.teacherName,
                      lesson.room ? 'Room ' + lesson.room : '',
                      lesson.department ?? '',
                    ].filter(Boolean).join(' · '),
                    status: 'Lesson',
                    raw: lesson,
                  }))}
                  onPressItem={(row) => onLessonPress(row.raw)}
                  emptyText="No lessons scheduled for this day."
                />
                {isDraft ? (
                  <View style={styles.addWrap}>
                    <SecondaryButton
                      label={'Add lesson on ' + weekday}
                      disabled={state.saving}
                      onPress={() => openNewLesson(weekday)}
                    />
                  </View>
                ) : null}
              </View>
            );
          })}

          {draft.conflicts?.length ? (
            <View style={styles.conflictCard}>
              <Text style={styles.section}>Review findings</Text>
              {draft.conflicts.map((item, index) => (
                <Text key={'conflict-' + index} style={styles.problem}>
                  {item.issue ?? item.code ?? 'Conflict'} · {item.detail ?? item.lessonId ?? ''}
                </Text>
              ))}
            </View>
          ) : null}

          {isDraft ? (
            <View style={styles.actions}>
              <SecondaryButton
                label="Refresh this term plan"
                disabled={state.saving}
                onPress={() => presenter.refresh()}
              />
              <Text style={styles.hint}>
                The draft is reviewed and published from Academics → Review and publish the timetable.
              </Text>
            </View>
          ) : (
            <Notice text="This is a published plan. Create a new revision from the current published plan to make changes." />
          )}
        </View>
      ) : null}

      <SelectSheet
        visible={classSheet && state.status === 'picking'}
        label="Which class timetable?"
        options={classOptions}
        value={state.selectedClass?.id}
        onSelect={(value) => {
          setClassSheet(false);
          presenter.openForClass(value);
        }}
        onClose={() => setClassSheet(false)}
      />

      <SelectSheet
        visible={assignmentSheet}
        label="Choose the active subject-teacher assignment"
        options={state.assignments.map((item) => ({
          value: item.id,
          label: item.label,
        }))}
        value={assignmentId}
        onSelect={(value) => {
          setAssignmentId(value);
          setAssignmentSheet(false);
        }}
        onClose={() => setAssignmentSheet(false)}
      />
      <SelectSheet
        visible={daySheet}
        label="Choose weekday"
        options={DAYS.map((value) => ({ value, label: value }))}
        value={day}
        onSelect={(value) => {
          setDay(value);
          setDaySheet(false);
        }}
        onClose={() => setDaySheet(false)}
      />
      <SelectSheet
        visible={durationSheet}
        label="Lesson duration"
        options={DURATIONS}
        value={durationMinutes}
        onSelect={(value) => {
          setDurationMinutes(value);
          setDurationSheet(false);
        }}
        onClose={() => setDurationSheet(false)}
      />

      {formOpen ? (
        <View style={styles.form}>
          <Text style={styles.section}>{editingLessonId ? 'Edit lesson' : 'Add lesson'}</Text>
          <Text style={styles.fieldLabel}>Teaching assignment</Text>
          <SecondaryButton
            label={state.assignments.find((item) => item.id === assignmentId)?.label ?? 'Choose subject and teacher'}
            onPress={() => setAssignmentSheet(true)}
            disabled={state.saving || state.assignments.length === 0}
          />
          <Text style={styles.fieldLabel}>Weekday</Text>
          <SecondaryButton label={day} onPress={() => setDaySheet(true)} disabled={state.saving} />
          <Text style={styles.fieldLabel}>Start time (Lagos time, HH:MM)</Text>
          <TextInput
            style={styles.input}
            value={start}
            onChangeText={setStart}
            placeholder="08:30"
            placeholderTextColor={colors.muted}
            maxLength={5}
            keyboardType="numbers-and-punctuation"
            editable={!state.saving}
          />
          <Text style={styles.fieldLabel}>Duration</Text>
          <SecondaryButton
            label={durationMinutes + ' minutes'}
            onPress={() => setDurationSheet(true)}
            disabled={state.saving}
          />
          <Text style={styles.fieldLabel}>Room (optional)</Text>
          <TextInput
            style={styles.input}
            value={room}
            onChangeText={setRoom}
            placeholder="e.g. LAB-1"
            placeholderTextColor={colors.muted}
            editable={!state.saving}
          />
          <Text style={styles.hint}>
            Lessons are 30 or 60 minutes, Monday–Friday, between 08:00 and 13:00. The 11:30 break and Friday sports hour are reserved. The backend validates teacher and room conflicts.
          </Text>
          <PrimaryButton
            label={state.saving ? 'Saving lesson…' : editingLessonId ? 'Save lesson changes' : 'Add lesson'}
            onPress={saveLesson}
            loading={state.saving}
            disabled={state.saving || !assignmentId || !start.trim()}
          />
          <SecondaryButton
            label="Cancel"
            onPress={() => setFormOpen(false)}
            disabled={state.saving}
          />
        </View>
      ) : null}
    </AdminScaffold>
  );
}

const styles = StyleSheet.create({
  summary: {
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  summaryText: { ...typography.body, fontWeight: '700' },
  section: { ...typography.sectionTitle, marginTop: spacing.md, marginBottom: spacing.sm },
  hint: { ...typography.label, color: colors.muted, marginTop: spacing.xs, marginBottom: spacing.sm },
  targets: {
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  targetRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  targetName: { ...typography.label, color: colors.text, flex: 1 },
  targetValue: { ...typography.label, fontWeight: '700' },
  addWrap: { marginTop: spacing.xs, marginBottom: spacing.md },
  conflictCard: { backgroundColor: colors.white, borderRadius: 12, padding: spacing.md, marginTop: spacing.md },
  problem: { ...typography.label, color: '#A33A2A', marginTop: spacing.xs },
  actions: { marginTop: spacing.md, gap: spacing.sm },
  form: {
    marginTop: spacing.lg,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
  },
  fieldLabel: { ...typography.label, marginTop: spacing.sm, marginBottom: spacing.xs },
  input: {
    ...typography.input,
    color: colors.text,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
});
