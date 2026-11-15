import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, Field, Notice, Select, ui } from '../../../components/Controls';
import { BottomNav } from './BottomNav';
import { useTeacher } from './TeacherNavigator';

function watInstant(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    throw new Error('Enter a valid new school date and WAT time.');
  }
  const value = new Date(`${date}T${time}:00+01:00`);
  if (!Number.isFinite(value.getTime())) throw new Error('Enter a valid new deadline.');
  return value.toISOString();
}

function dateTimeInLagos(value) {
  if (!value) return { date: '', time: '18:00' };
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(value)).map((item) => [item.type, item.value]));
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(value));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time };
}

export function TE10AssignmentSubmissionsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const assignmentId = route.params?.assignmentId;
  const { context, model } = useTeacher();
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('all');
  const [changeAction, setChangeAction] = useState('keep');
  const [reason, setReason] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newDueTime, setNewDueTime] = useState('18:00');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    if (!assignmentId) {
      setError('Open an actual assignment from the TE08 list.');
      return;
    }
    setError('');
    try {
      const value = await model.assignment(context.schoolId, assignmentId);
      setData(value);
      const due = dateTimeInLagos(value.dueAt);
      setNewDueDate(due.date);
      setNewDueTime(due.time);
    } catch (reasonValue) {
      setError(reasonValue?.message ?? 'Could not load this assignment and its submissions.');
    }
  };

  useEffect(() => { void load(); }, [model, context.schoolId, assignmentId]);

  const submissions = useMemo(() => (data?.submissions ?? []).filter((item) => {
    const state = String(item.state ?? '').toUpperCase();
    return filter === 'all'
      || (filter === 'submitted' && ['SUBMITTED', 'GRADED'].includes(state))
      || (filter === 'draft' && state === 'DRAFT')
      || (filter === 'returned' && state === 'RETURNED');
  }), [data, filter]);

  const applyWindowChange = async () => {
    if (!data || busy || changeAction === 'keep') return;
    if (reason.trim().length < 5) {
      setError('Enter a reason of at least five characters.');
      return;
    }
    let dueAt;
    if (changeAction === 'extend') {
      try { dueAt = watInstant(newDueDate, newDueTime); }
      catch (reasonValue) { setError(reasonValue.message); return; }
      if (new Date(dueAt) <= new Date(data.dueAt)) {
        setError('The new deadline must be later than the current deadline.');
        return;
      }
    }
    setBusy('change');
    setError('');
    setMessage('');
    try {
      const updated = await model.changeAssignment(
        context.schoolId,
        assignmentId,
        { action: changeAction === 'close' ? 'CLOSE' : 'EXTEND', dueAt, reason: reason.trim() },
        data.version,
      );
      const fresh = await model.assignment(context.schoolId, assignmentId);
      setData(fresh);
      setReason('');
      setChangeAction('keep');
      setMessage(`Submission window updated. Assignment state: ${updated.state}.`);
    } catch (reasonValue) {
      setError(reasonValue?.message ?? 'Could not change the submission window.');
    } finally {
      setBusy('');
    }
  };

  const state = String(data?.state ?? '').toUpperCase();
  const windowOptions = state === 'PUBLISHED'
    ? [{ value: 'keep', label: 'Keep open' }, { value: 'close', label: 'Close submissions' }]
    : state === 'CLOSED'
      ? [{ value: 'keep', label: 'Keep closed' }, { value: 'extend', label: 'Extend deadline and reopen' }]
      : [{ value: 'keep', label: 'No window action available for this state' }];

  return (
    <Screen title="Assignment and submissions" subtitle={data ? data.title : 'Assignment details'} code="TE10">
      {error ? <Notice text={error} tone="error" /> : null}
      {message ? <Notice text={message} tone="success" /> : null}

      <Card title="Assignment">
        <Text style={ui.muted}>Class / subject: {data?.classId} · {data?.subjectId}</Text>
        <Text style={ui.muted}>Due: {data?.due}</Text>
        <Text style={ui.muted}>Method: {data?.method}</Text>
        <Text style={ui.muted}>Instructions: {data?.instructions}</Text>
        <Text style={ui.muted}>Maximum score: {data?.maxScore}</Text>
        <Text style={ui.muted}>Window: {data?.window}</Text>
      </Card>

      <Select
        label="Submission filter"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'All recorded submissions' },
          { value: 'submitted', label: 'Submitted / graded' },
          { value: 'draft', label: 'Draft' },
          { value: 'returned', label: 'Returned' },
        ]}
      />

      <Card title="Class submissions">
        {submissions.map((item) => (
          <Pressable key={item.id} style={[ui.row, { paddingVertical: 8 }]} onPress={() => navigation.navigate('TE11', { assignmentId, studentId: item.id })}>
            <View style={{ flex: 1 }}>
              <Text style={ui.text}>{item.student}</Text>
              <Text style={ui.muted}>{item.detail || item.state}</Text>
            </View>
            <Text style={[ui.muted, { fontWeight: '600' }]}>{item.state}</Text>
          </Pressable>
        ))}
        {!submissions.length ? <Text style={ui.muted}>No submissions match this filter.</Text> : null}
      </Card>

      <Card title="Window management">
        <Select label="Window action" value={changeAction} onChange={setChangeAction} options={windowOptions} />
        {changeAction === 'extend' ? (
          <>
            <Field label="New due date (WAT)" value={newDueDate} onChangeText={setNewDueDate} placeholder="YYYY-MM-DD" />
            <Field label="New due time (WAT)" value={newDueTime} onChangeText={setNewDueTime} placeholder="18:00" />
          </>
        ) : null}
        {changeAction !== 'keep' ? (
          <Field label="Reason *" value={reason} onChangeText={setReason} placeholder="Explain this submission-window change" multiline />
        ) : null}
        <Button title={busy === 'change' ? 'Updating…' : 'Apply window change'} variant="secondary" onPress={applyWindowChange} loading={busy === 'change'} disabled={!data || changeAction === 'keep' || Boolean(busy)} />
      </Card>

      <Notice text="Physical assignments are recorded through the teacher receipt workflow. Parents cannot submit work on behalf of a pupil." />

      <Button title="Edit assignment" onPress={() => navigation.navigate('TE09', { assignmentId })} disabled={!data || state !== 'DRAFT'} />
      <Button title="Back to assignments" variant="secondary" onPress={() => navigation.navigate('TE08')} />

      <BottomNav navigation={navigation} current="TE08" />
    </Screen>
  );
}
