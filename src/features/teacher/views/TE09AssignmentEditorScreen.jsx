import React, { useEffect, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, Field, Notice, Select } from '../../../components/Controls';
import { BottomNav } from './BottomNav';
import { useTeacher } from './TeacherNavigator';

function dateTimeInLagos(value) {
  if (!value) return { date: '', time: '18:00' };
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const parts = Object.fromEntries(dateParts.map((item) => [item.type, item.value]));
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time };
}

function watInstant(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    throw new Error('Enter a valid school date and WAT time.');
  }
  const value = new Date(`${date}T${time}:00+01:00`);
  if (!Number.isFinite(value.getTime())) throw new Error('Enter a valid due date and time.');
  return value.toISOString();
}

export function TE09AssignmentEditorScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const assignmentId = route.params?.assignmentId;
  const { context, model } = useTeacher();
  const [options, setOptions] = useState({ teachingAssignments: [], terms: [] });
  const [teachingAssignmentId, setTeachingAssignmentId] = useState('');
  const [termId, setTermId] = useState('');
  const [method, setMethod] = useState('mixed');
  const [window, setWindow] = useState('open');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('18:00');
  const [maximumScore, setMaximumScore] = useState('20');
  const [windowReason, setWindowReason] = useState('');
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      model.assignmentOptions(context.schoolId),
      assignmentId ? model.get(context.schoolId, `/assignments/${encodeURIComponent(assignmentId)}`) : Promise.resolve(null),
    ])
      .then(([loaded, assignment]) => {
        if (!active) return;
        setOptions(loaded);
        if (assignment) {
          setData(assignment);
          setTeachingAssignmentId(assignment.teachingAssignmentId ?? '');
          setTermId(assignment.termId ?? '');
          setTitle(assignment.title ?? '');
          setInstructions(assignment.instructions ?? '');
          setMaximumScore(String(assignment.maximumScore ?? '20'));
          setMethod(assignment.submissionMode === 'PHYSICAL' ? 'physical' : 'mixed');
          const due = dateTimeInLagos(assignment.dueAt);
          setDueDate(due.date);
          setDueTime(due.time);
          setWindow(assignment.state === 'CLOSED' ? 'closed' : 'open');
        } else {
          setTeachingAssignmentId(loaded.teachingAssignments[0]?.id ?? '');
          setTermId(loaded.terms[0]?.id ?? '');
        }
      })
      .catch((reason) => {
        if (active) setError(reason?.message ?? 'Could not load your teaching assignments and terms.');
      });
    return () => { active = false; };
  }, [model, context.schoolId, assignmentId]);

  const save = async (publish) => {
    if (busy) return;
    setError('');
    setMessage('');
    if (!teachingAssignmentId || !termId) {
      setError('Choose one of your actual teaching assignments and a term.');
      return;
    }
    if (title.trim().length < 3 || instructions.trim().length < 5) {
      setError('Enter an assignment title and instructions.');
      return;
    }
    if (window === 'closed' && publish && windowReason.trim().length < 5) {
      setError('Give a reason of at least five characters before closing the submission window.');
      return;
    }

    let dueAt;
    let score;
    try {
      dueAt = watInstant(dueDate, dueTime);
      score = Number(maximumScore);
      if (!Number.isFinite(score) || score <= 0 || score > 1000 || Math.round(score * 10) !== score * 10) {
        throw new Error('Maximum score must be between 0.1 and 1,000, with at most one decimal place.');
      }
    } catch (reason) {
      setError(reason.message);
      return;
    }

    const body = {
      teachingAssignmentId,
      termId,
      title: title.trim(),
      instructions: instructions.trim(),
      dueAt,
      maximumScore: score,
      fileIds: [],
      submissionMode: method === 'physical' ? 'PHYSICAL' : 'APP',
    };

    setBusy(publish ? 'publish' : 'save');
    try {
      let saved = assignmentId
        ? await model.updateAssignment(context.schoolId, assignmentId, body, data?.version)
        : await model.createAssignment(context.schoolId, body);

      if (publish) {
        saved = await model.publishAssignment(context.schoolId, saved.id ?? assignmentId, saved.version);
        if (window === 'closed') {
          saved = await model.changeAssignment(
            context.schoolId,
            saved.id ?? assignmentId,
            { action: 'CLOSE', reason: windowReason.trim() },
            saved.version,
          );
        }
        setData(saved);
        setMessage('Assignment published. Its submission state is now ' + saved.state + '.');
        navigation.navigate('TE10', { assignmentId: saved.id ?? assignmentId });
      } else {
        setData(saved);
        setMessage('Assignment draft saved. It is not visible to students until published.');
      }
    } catch (reason) {
      setError(reason?.message ?? 'The assignment could not be saved.');
    } finally {
      setBusy('');
    }
  };

  return (
    <Screen title="Create or edit assignment" subtitle="Set exactly what pupils must submit." code="TE09">
      {error ? <Notice text={error} tone="error" /> : null}
      {message ? <Notice text={message} tone="success" /> : null}

      <Card title="Basics">
        <Select
          label="Class and subject assignment *"
          value={teachingAssignmentId}
          onChange={setTeachingAssignmentId}
          options={options.teachingAssignments.map((item) => ({ value: item.id, label: item.label }))}
          placeholder="Choose an actual teaching assignment"
          disabled={Boolean(assignmentId)}
        />
        <Select
          label="Academic term *"
          value={termId}
          onChange={setTermId}
          options={options.terms.map((item) => ({ value: item.id, label: item.label }))}
          placeholder="Choose the assignment term"
          disabled={Boolean(assignmentId)}
        />
        <Field label="Title *" value={title} onChangeText={setTitle} placeholder="Fractions practice" />
        <Field label="Instructions *" value={instructions} onChangeText={setInstructions} placeholder="Answer questions 1-5. Show your working." multiline />
      </Card>

      <Card title="Submission">
        <Select
          label="Submission method *"
          value={method}
          onChange={setMethod}
          options={[
            { value: 'typed', label: 'Typed answer' },
            { value: 'file', label: 'File upload' },
            { value: 'mixed', label: 'Typed answer + file' },
            { value: 'physical', label: 'Physical work - teacher records receipt' },
          ]}
        />
        <Field label="Due date *" value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" />
        <Field label="Due time (WAT) *" value={dueTime} onChangeText={setDueTime} placeholder="18:00" />
        <Select
          label="Submission window after publishing"
          value={window}
          onChange={setWindow}
          options={[
            { value: 'open', label: 'Keep open' },
            { value: 'closed', label: 'Publish and then close submissions' },
          ]}
        />
        {window === 'closed' ? (
          <Field label="Reason for closing *" value={windowReason} onChangeText={setWindowReason} placeholder="Explain why submissions are being closed" multiline />
        ) : null}
        <Field label="Maximum score" value={maximumScore} onChangeText={setMaximumScore} placeholder="20" keyboardType="decimal-pad" />
      </Card>

      <Notice text="App submissions accept written responses and ready file attachments. Physical work uses the separate teacher receipt workflow. Files are attached after secure upload; this screen does not publish unuploaded files." />

      <Button title={busy === 'publish' ? 'Publishing…' : 'Preview and publish assignment'} onPress={() => save(true)} loading={busy === 'publish'} disabled={Boolean(busy) || !options.teachingAssignments.length || !options.terms.length} />
      <Button title={busy === 'save' ? 'Saving…' : 'Save assignment draft'} variant="secondary" onPress={() => save(false)} loading={busy === 'save'} disabled={Boolean(busy) || !options.teachingAssignments.length || !options.terms.length} />

      <BottomNav navigation={navigation} current="TE08" />
    </Screen>
  );
}
