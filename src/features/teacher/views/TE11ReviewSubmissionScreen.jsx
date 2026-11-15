import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, Field, Notice, Select, ui } from '../../../components/Controls';
import { BottomNav } from './BottomNav';
import { useTeacher } from './TeacherNavigator';

function watInstant(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    throw new Error('Enter a valid resubmission date and WAT time.');
  }
  const value = new Date(`${date}T${time}:00+01:00`);
  if (!Number.isFinite(value.getTime())) throw new Error('Enter a valid resubmission deadline.');
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

export function TE11ReviewSubmissionScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { assignmentId, studentId } = route.params ?? {};
  const { context, model } = useTeacher();
  const [data, setData] = useState(null);
  const [action, setAction] = useState('GRADE');
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [reason, setReason] = useState('');
  const [resubmitDate, setResubmitDate] = useState('');
  const [resubmitTime, setResubmitTime] = useState('18:00');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    if (!assignmentId || !studentId) {
      setError('Open a real student submission from TE10.');
      return;
    }
    setError('');
    try {
      const [submission, draft, assignment] = await Promise.all([
        model.submission(context.schoolId, assignmentId, studentId),
        model.reviewDraft(context.schoolId, assignmentId, studentId),
        model.get(context.schoolId, `/assignments/${encodeURIComponent(assignmentId)}`),
      ]);
      setData({ ...submission, reviewDraft: draft, maximumScore: assignment.maximumScore, assignment });
      const saved = draft.review ?? {};
      const existingFeedback = saved.feedback ?? submission.feedback ?? '';
      setAction(saved.action ?? 'GRADE');
      setScore(saved.score == null ? (submission.score == null ? '' : String(submission.score)) : String(saved.score));
      setFeedback(existingFeedback);
      setReason(saved.reason ?? '');
      const deadline = dateTimeInLagos(saved.extraDeadline);
      setResubmitDate(deadline.date);
      setResubmitTime(deadline.time);
    } catch (reasonValue) {
      setError(reasonValue?.message ?? 'Could not load the accepted submission and review draft.');
    }
  };

  useEffect(() => { void load(); }, [model, context.schoolId, assignmentId, studentId]);

  const bodyForSave = () => {
    const value = feedback.trim();
    if (value.length < 2 || value.length > 3000) throw new Error('Feedback must contain 2–3,000 characters.');
    if (action === 'GRADE') {
      const numericScore = Number(score);
      if (!score.trim() || !Number.isFinite(numericScore) || numericScore < 0 || numericScore > Number(data?.maximumScore)) {
        throw new Error(`Enter a score from 0 to ${data?.maximumScore ?? 'the assignment maximum'}.`);
      }
      if (data?.status === 'GRADED' && reason.trim().length < 5) {
        throw new Error('A grade correction needs a reason of at least five characters.');
      }
      return {
        action,
        score: numericScore,
        feedback: value,
        reason: reason.trim() || null,
        extraDeadline: null,
      };
    }
    if (reason.trim().length < 5) throw new Error('Returning work requires a reason of at least five characters.');
    const extraDeadline = watInstant(resubmitDate, resubmitTime);
    if (new Date(extraDeadline) <= new Date()) throw new Error('Choose a future resubmission deadline.');
    return {
      action,
      score: null,
      feedback: value,
      reason: reason.trim(),
      extraDeadline,
    };
  };

  const saveDraft = async () => {
    if (!data || busy) return;
    let body;
    try { body = bodyForSave(); }
    catch (reasonValue) { setError(reasonValue.message); return; }
    setBusy('save');
    setError('');
    setMessage('');
    try {
      const saved = await model.saveReviewDraft(
        context.schoolId,
        assignmentId,
        studentId,
        body,
        data.reviewDraft?.version ?? 1,
      );
      setData((current) => ({ ...current, reviewDraft: saved }));
      setMessage('Private review draft saved. It has not been released to the pupil.');
    } catch (reasonValue) {
      setError(reasonValue?.message ?? 'Could not save the private review draft.');
    } finally {
      setBusy('');
    }
  };

  const release = async () => {
    if (!data || busy) return;
    let body;
    try { body = bodyForSave(); }
    catch (reasonValue) { setError(reasonValue.message); return; }
    setBusy('release');
    setError('');
    setMessage('');
    try {
      const saved = await model.saveReviewDraft(
        context.schoolId,
        assignmentId,
        studentId,
        body,
        data.reviewDraft?.version ?? 1,
      );
      await model.releaseReviewDraft(
        context.schoolId,
        assignmentId,
        studentId,
        saved.version,
      );
      await load();
      setMessage(action === 'RETURN'
        ? 'Feedback and resubmission request released to the pupil.'
        : 'Grade and feedback released to the pupil and authorised guardian.');
    } catch (reasonValue) {
      setError(reasonValue?.message ?? 'Could not release this feedback.');
    } finally {
      setBusy('');
    }
  };

  const canReview = ['SUBMITTED', 'GRADED'].includes(String(data?.status ?? '').toUpperCase());

  return (
    <Screen title="Review student submission" subtitle={data ? `${data.assignment?.title ?? 'Assignment'} · ${data.status} · version ${data.version}` : 'Accepted student work'} code="TE11">
      {error ? <Notice text={error} tone="error" /> : null}
      {message ? <Notice text={message} tone="success" /> : null}

      <Card title="Accepted submission">
        <Text style={ui.muted}>Submitted: {data?.submitted ?? '—'}</Text>
        <Text style={ui.muted}>Status: {data?.status ?? '—'}</Text>
        <Text style={ui.muted}>Submission version: {data?.version ?? '—'}</Text>
        <Text style={ui.muted}>Physical receipt: {data?.receipt ?? '—'}</Text>
        <Text style={ui.muted}>Maximum score: {data?.maximumScore ?? '—'}</Text>
        <Text style={ui.muted}>Private review draft: {data?.reviewDraft?.state ?? 'Loading…'}</Text>
      </Card>

      <Card title="Submitted content">
        {(data?.content ?? []).map((item, index) => (
          <View key={`${item.type}-${index}`} style={{ paddingVertical: 4 }}>
            <Text style={ui.muted}>{item.type}</Text>
            <Text style={ui.text}>{item.detail}</Text>
          </View>
        ))}
        {!data?.content?.length ? <Text style={ui.muted}>No text or attachments were included in this submission.</Text> : null}
      </Card>

      {canReview ? (
        <Card title="Review and apply outcome">
          <Select
            label="Review outcome *"
            value={action}
            onChange={setAction}
            options={[
              { value: 'GRADE', label: 'Grade and release feedback' },
              { value: 'RETURN', label: 'Return for resubmission' },
            ]}
          />
          {action === 'GRADE' ? (
            <Field label={`Score / ${data?.maximumScore ?? '—'}`} value={score} onChangeText={setScore} placeholder="Enter score" keyboardType="decimal-pad" />
          ) : null}
          <Field label="Feedback *" value={feedback} onChangeText={setFeedback} placeholder="Give clear feedback on the submitted work." multiline />
          <Field label={action === 'RETURN' ? 'Return reason *' : 'Correction reason (required when changing a released grade)'} value={reason} onChangeText={setReason} placeholder="Explain the review decision" multiline />
          {action === 'RETURN' ? (
            <>
              <Field label="Resubmission deadline (WAT) *" value={resubmitDate} onChangeText={setResubmitDate} placeholder="YYYY-MM-DD" />
              <Field label="Resubmission time (WAT) *" value={resubmitTime} onChangeText={setResubmitTime} placeholder="18:00" />
            </>
          ) : null}
          <Notice text="Save keeps this review private. Release makes accepted feedback visible to the pupil and authorised guardian." />
          <Button title={busy === 'save' ? 'Saving private draft…' : 'Save private review draft'} variant="secondary" onPress={saveDraft} loading={busy === 'save'} disabled={Boolean(busy)} />
          <Button title={busy === 'release' ? 'Releasing…' : 'Release feedback'} onPress={release} loading={busy === 'release'} disabled={Boolean(busy)} />
        </Card>
      ) : (
        <Notice text="This response is not currently in a state that can be graded or returned. A pupil must submit work before review." tone="warning" />
      )}

      <Notice text="Review drafts are teacher-only. The server checks that the submission version has not changed before release." />

      <Button title="Back to class submissions" variant="secondary" onPress={() => navigation.navigate('TE10', { assignmentId })} />

      <BottomNav navigation={navigation} current="TE08" />
    </Screen>
  );
}
