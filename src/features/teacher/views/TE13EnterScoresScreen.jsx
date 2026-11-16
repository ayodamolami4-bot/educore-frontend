import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, Field, Notice, Select, ui } from '../../../components/Controls';
import { BottomNav } from './BottomNav';
import { useTeacher } from './TeacherNavigator';

const numericValue = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formFrom = (student) => ({
  ca1: student?.ca1 == null ? '' : String(student.ca1),
  ca2: student?.ca2 == null ? '' : String(student.ca2),
  exam: student?.exam == null ? '' : String(student.exam),
  examState: student?.examState ?? 'COMPLETE',
  note: student?.note ?? '',
});

export function TE13EnterScoresScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { cycleId, assignmentId } = route.params ?? {};
  const { context, model } = useTeacher();
  const [data, setData] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [form, setForm] = useState(formFrom(null));
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const readOnly = data?.state === 'SUBMITTED';

  const load = async () => {
    if (!cycleId || !assignmentId) {
      setError('Open a subject mark package from TE12 before entering scores.');
      return;
    }
    setError('');
    try {
      const sheet = await model.scores(context.schoolId, cycleId, assignmentId);
      setData(sheet);
      const first = sheet.students?.[0] ?? null;
      setSelectedStudent(first?.id ?? '');
      setForm(formFrom(first));
    } catch (reason) {
      setError(reason?.message ?? 'Could not load this assessment sheet.');
    }
  };

  useEffect(() => { void load(); }, [model, context.schoolId, cycleId, assignmentId]);

  const selectStudent = (id) => {
    setSelectedStudent(id);
    setForm(formFrom(data?.students?.find((item) => item.id === id)));
    setMessage('');
    setError('');
  };

  const applyStudentScores = () => {
    if (!data || !selectedStudent) {
      setError('Select a pupil from this assessment roster.');
      return;
    }
    const updated = data.students.map((student) => student.id === selectedStudent
      ? {
          ...student,
          ca1: numericValue(form.ca1),
          ca2: numericValue(form.ca2),
          exam: numericValue(form.exam),
          examState: form.examState,
          note: form.note.trim() || null,
        }
      : student);
    setData({ ...data, students: updated });
    setMessage('Pupil scores applied to the local draft. Save the draft to send them to the school.');
    setError('');
  };

  const buildRows = () => data.students.map((student) => ({
    studentId: student.id,
    ca1: student.ca1 == null ? null : Number(student.ca1),
    ca2: student.ca2 == null ? null : Number(student.ca2),
    exam: student.exam == null ? null : Number(student.exam),
    examState: student.examState ?? 'COMPLETE',
    note: student.note || null,
  }));

  const saveDraft = async () => {
    if (!data || busy || readOnly) return;
    setBusy('save');
    setMessage('');
    setError('');
    try {
      await model.saveScores(context.schoolId, data, buildRows());
      const fresh = await model.scores(context.schoolId, cycleId, assignmentId);
      setData(fresh);
      const selected = fresh.students?.find((item) => item.id === selectedStudent);
      setForm(formFrom(selected));
      setMessage('Score draft saved successfully.');
    } catch (reason) {
      setError(reason?.message ?? 'Could not save the score draft.');
    } finally {
      setBusy('');
    }
  };

  const submit = async () => {
    if (!data || busy || readOnly) return;
    setBusy('submit');
    setMessage('');
    setError('');
    try {
      await model.saveScores(context.schoolId, data, buildRows());
      const fresh = await model.scores(context.schoolId, cycleId, assignmentId);
      await model.submitScores(context.schoolId, fresh);
      const submitted = await model.scores(context.schoolId, cycleId, assignmentId);
      setData(submitted);
      setMessage('Subject marks submitted. The sheet is now locked for review.');
    } catch (reason) {
      setError(reason?.message ?? 'Could not submit subject marks.');
    } finally {
      setBusy('');
    }
  };

  return (
    <Screen
      title="Enter assessment scores"
      subtitle={data ? `${data.cycleId} · ${data.assignmentId}` : 'Select a subject mark package.'}
      code="TE13"
    >
      {error ? <Notice text={error} tone="error" /> : null}
      {message ? <Notice text={message} tone="success" /> : null}

      <Card title="Locked internal policy">
        <Text style={ui.muted}>CA1 / CA2 / Exam: {data?.policy ? `${data.policy.ca1} / ${data.policy.ca2} / ${data.policy.exam}` : 'Loading policy…'}</Text>
        <Text style={ui.muted}>Total / precision: {data?.policy?.total || 100} · {data?.policy?.precision || 'One decimal place'}</Text>
        <Text style={ui.muted}>Assessment state: {data?.state ?? '—'}</Text>
        {data?.returnReason ? <Notice text={data.returnReason} tone="warning" /> : null}
      </Card>

      <Card title="Class scores">
        {(data?.students ?? []).map((student) => (
          <Pressable
            key={student.id}
            onPress={() => selectStudent(student.id)}
            disabled={readOnly}
            style={[ui.row, { paddingVertical: 8, opacity: selectedStudent === student.id ? 1 : 0.85 }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={ui.text}>{student.name}</Text>
              <Text style={ui.muted}>CA1 {student.ca1 ?? '—'} · CA2 {student.ca2 ?? '—'} · Exam {student.exam ?? '—'}</Text>
            </View>
            <Text style={ui.muted}>{selectedStudent === student.id ? 'Selected' : 'Edit'}</Text>
          </Pressable>
        ))}
      </Card>

      <Card title="Apply pupil scores">
        <Select
          label="Selected pupil *"
          value={selectedStudent}
          onChange={selectStudent}
          options={(data?.students ?? []).map((student) => ({ value: student.id, label: student.name }))}
          disabled={!data?.students?.length || readOnly}
        />
        <Select
          label="Examination state *"
          value={form.examState}
          onChange={(value) => setForm((current) => ({ ...current, examState: value }))}
          options={[
            { value: 'COMPLETE', label: 'Complete' },
            { value: 'MAKEUP_PENDING', label: 'Make-up pending' },
            { value: 'ABSENT_ZERO', label: 'Approved absent zero' },
          ]}
          disabled={!data || readOnly}
        />
        <Field label="CA1 / 20" value={form.ca1} onChangeText={(value) => setForm((current) => ({ ...current, ca1: value }))} placeholder="0–20" keyboardType="decimal-pad" editable={!readOnly} />
        <Field label="CA2 / 20" value={form.ca2} onChangeText={(value) => setForm((current) => ({ ...current, ca2: value }))} placeholder="0–20" keyboardType="decimal-pad" editable={!readOnly} />
        <Field label="Examination / 60" value={form.exam} onChangeText={(value) => setForm((current) => ({ ...current, exam: value }))} placeholder="0–60" keyboardType="decimal-pad" editable={!readOnly} />
        <Field label="Absence / correction note" value={form.note} onChangeText={(value) => setForm((current) => ({ ...current, note: value }))} placeholder="Required evidence note for an approved absent zero" multiline editable={!readOnly} />
        <Button title="Apply pupil scores to draft" variant="secondary" onPress={applyStudentScores} disabled={!data || readOnly} />
      </Card>

      <Notice text="The backend validates marks, component limits, exam state and absence evidence. Missing marks remain unresolved; do not convert them to zero." />

      <Button title={busy === 'submit' ? 'Submitting…' : 'Review and submit subject marks'} onPress={submit} loading={busy === 'submit'} disabled={!data || readOnly || Boolean(busy)} />
      <Button title={busy === 'save' ? 'Saving…' : 'Save score draft'} variant="secondary" onPress={saveDraft} loading={busy === 'save'} disabled={!data || readOnly || Boolean(busy)} />

      <BottomNav navigation={navigation} current="TE13" />
    </Screen>
  );
}
