import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, Field, Notice, Select, ui } from '../../../components/Controls';
import { BottomNav } from './BottomNav';
import { useTeacher } from './TeacherNavigator';

function summaryOf(students) {
  return {
    marked: students.filter((item) => item.status !== 'UNMARKED').length,
    present: students.filter((item) => item.status === 'PRESENT').length,
    absent: students.filter((item) => item.status === 'ABSENT').length,
    late: students.filter((item) => item.status === 'LATE').length,
  };
}

export function TE07DailyRegisterScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const classId = route.params?.classId;
  const date = route.params?.date;
  const classLabel = route.params?.classLabel;
  const { context, model } = useTeacher();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('PRESENT');
  const [student, setStudent] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!classId || !date) {
      setError('Open this register from an assigned class duty.');
      return () => { active = false; };
    }
    model.register(context.schoolId, classId, date)
      .then((value) => {
        if (!active) return;
        setData(value);
        setStudent(value.students?.[0]?.id ?? '');
        if (value.state !== 'DRAFT') {
          setMessage('This register has already been submitted and is read-only.');
        }
      })
      .catch((reason) => {
        if (active) setError(reason?.message ?? 'Could not open the daily register.');
      });
    return () => { active = false; };
  }, [model, context.schoolId, classId, date]);

  const applyMark = () => {
    if (!data || !student) {
      setError('Select a student from this dated roster.');
      return;
    }
    setError('');
    setMessage('');
    setData((current) => {
      const students = current.students.map((item) => item.id === student
        ? { ...item, status, note: note.trim() }
        : item);
      return { ...current, students, summary: summaryOf(students) };
    });
    setNote('');
  };

  const saveDraft = async () => {
    if (!data || busy) return;
    if (data.state !== 'DRAFT') {
      setError('Submitted registers cannot be edited.');
      return;
    }
    const unmarked = data.students.filter((item) => item.status === 'UNMARKED');
    if (unmarked.length) {
      setError(`Mark all ${unmarked.length} remaining students before saving.`);
      return;
    }
    setBusy('save');
    setError('');
    setMessage('');
    try {
      const saved = await model.saveRegisterMarks(
        context.schoolId,
        data,
        data.students.map((item) => ({
          studentId: item.id,
          status: item.status,
          reason: item.note || null,
        })),
      );
      setData(saved);
      setMessage('Register draft saved.');
    } catch (reason) {
      setError(reason?.message ?? 'Could not save the register draft.');
    } finally {
      setBusy('');
    }
  };

  const submitRegister = async () => {
    if (!data || busy) return;
    if (data.state !== 'DRAFT') {
      setError('This register has already been submitted.');
      return;
    }
    const unmarked = data.students.filter((item) => item.status === 'UNMARKED');
    if (unmarked.length) {
      setError(`Mark all ${unmarked.length} students before submitting.`);
      return;
    }
    setBusy('submit');
    setError('');
    setMessage('');
    try {
      const saved = await model.saveRegisterMarks(
        context.schoolId,
        data,
        data.students.map((item) => ({
          studentId: item.id,
          status: item.status,
          reason: item.note || null,
        })),
      );
      const submitted = await model.submitRegister(context.schoolId, saved);
      setData(submitted);
      setMessage('Attendance register submitted successfully.');
    } catch (reason) {
      setError(reason?.message ?? 'Could not submit the attendance register.');
    } finally {
      setBusy('');
    }
  };

  const selectedStudent = student || data?.students?.[0]?.id || '';

  return (
    <Screen
      title="Daily class register"
      subtitle={data ? `${classLabel || 'Assigned class'} · ${date}` : 'Dated attendance register'}
      code="TE07"
    >
      {error ? <Notice text={error} tone="error" /> : null}
      {message ? <Notice text={message} tone="success" /> : null}

      <Card title="Register context">
        <Text style={ui.muted}>School date: {data?.onDate ?? date ?? '—'}</Text>
        <Text style={ui.muted}>Students on dated roster: {data?.context?.roster ?? 0}</Text>
        <Text style={ui.muted}>Submission deadline: {data?.context?.deadline || '—'}</Text>
        <Text style={ui.muted}>State / version: {data?.context?.state ?? 'Loading…'}</Text>
      </Card>

      <Card title="Mark the dated roster">
        <View style={[ui.row, { paddingVertical: 4 }]}>
          <Text style={[ui.muted, { flex: 2, fontWeight: '600' }]}>Student</Text>
          <Text style={[ui.muted, { flex: 1, fontWeight: '600' }]}>Status</Text>
          <Text style={[ui.muted, { flex: 2, fontWeight: '600' }]}>Note</Text>
        </View>
        {(data?.students ?? []).map((item) => (
          <View key={item.id} style={[ui.row, { paddingVertical: 6 }]}>
            <Text style={[ui.text, { flex: 2 }]}>{item.name}</Text>
            <Text style={[ui.text, { flex: 1 }]}>{item.status}</Text>
            <Text style={[ui.muted, { flex: 2 }]}>{item.note || '—'}</Text>
          </View>
        ))}
      </Card>

      <Card title="Apply a status">
        <Select
          label="Selected student *"
          value={selectedStudent}
          onChange={setStudent}
          options={(data?.students ?? []).map((item) => ({ value: item.id, label: item.name }))}
          disabled={!data?.students?.length || data.state !== 'DRAFT'}
        />
        <Select
          label="Attendance status *"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'PRESENT', label: 'PRESENT' },
            { value: 'ABSENT', label: 'ABSENT' },
            { value: 'LATE', label: 'LATE' },
            { value: 'EXCUSED', label: 'EXCUSED' },
          ]}
          disabled={!data || data.state !== 'DRAFT'}
        />
        <Field
          label="Note / late arrival time"
          placeholder="Optional reason or late arrival time"
          value={note}
          onChangeText={setNote}
          editable={Boolean(data && data.state === 'DRAFT')}
        />
        <Button
          title="Apply this student's status"
          variant="secondary"
          onPress={applyMark}
          disabled={!data || data.state !== 'DRAFT'}
        />
      </Card>

      <Card title="Summary">
        <Text style={ui.text}>Marked: {data?.summary?.marked ?? 0} / {data?.context?.roster ?? 0}</Text>
        <Text style={ui.text}>Present: {data?.summary?.present ?? 0}</Text>
        <Text style={ui.text}>Absent: {data?.summary?.absent ?? 0}</Text>
        <Text style={ui.text}>Late: {data?.summary?.late ?? 0}</Text>
        <Notice text="Every pupil needs an explicit status; do not silently treat an unmarked pupil as present." />
      </Card>

      <Button
        title={busy === 'submit' ? 'Submitting…' : 'Review and submit register'}
        onPress={submitRegister}
        loading={busy === 'submit'}
        disabled={!data || data.state !== 'DRAFT' || Boolean(busy)}
      />
      <Button
        title={busy === 'save' ? 'Saving…' : 'Save register draft'}
        variant="secondary"
        onPress={saveDraft}
        loading={busy === 'save'}
        disabled={!data || data.state !== 'DRAFT' || Boolean(busy)}
      />

      <BottomNav navigation={navigation} current="TE07" />
    </Screen>
  );
}
