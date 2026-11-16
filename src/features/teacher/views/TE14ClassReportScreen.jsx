import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, Field, Notice, Select, ui } from '../../../components/Controls';
import { BottomNav } from './BottomNav';
import { useTeacher } from './TeacherNavigator';

const ratingOptions = [
  { value: '', label: 'Choose a rating' },
  ...[1, 2, 3, 4, 5].map((value) => ({
    value: String(value),
    label: `${value} - ${['Needs improvement', 'Developing', 'Satisfactory', 'Good', 'Excellent'][value - 1]}`,
  })),
];

const formFrom = (student) => ({
  remark: student?.remark ?? '',
  conduct: student?.conduct == null ? '' : String(student.conduct),
  punctuality: student?.punctuality == null ? '' : String(student.punctuality),
  cooperation: student?.cooperation == null ? '' : String(student.cooperation),
  handwriting: student?.handwriting == null ? '' : String(student.handwriting),
  practicalSkills: student?.practicalSkills == null ? '' : String(student.practicalSkills),
});

export function TE14ClassReportScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { classId, cycleId } = route.params ?? {};
  const { context, model } = useTeacher();
  const [data, setData] = useState(null);
  const [pupil, setPupil] = useState('');
  const [form, setForm] = useState(formFrom(null));
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selected = useMemo(
    () => data?.readiness?.find((item) => item.id === pupil) ?? null,
    [data, pupil],
  );

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      if (!classId || !cycleId) {
        setError('Open the class-teacher report package from TE12 first.');
        return;
      }
      setError('');
      try {
        const result = await model.classReport(context.schoolId, classId, '', '', cycleId);
        if (!active) return;
        setData(result);
        const first = result.readiness?.[0] ?? null;
        setPupil(first?.id ?? '');
        setForm(formFrom(first));
      } catch (reason) {
        if (active) setError(reason?.message ?? 'Could not load the class report package.');
      }
    });
    return () => { active = false; };
  }, [model, context.schoolId, classId, cycleId]);
  const choosePupil = (id) => {
    setPupil(id);
    setForm(formFrom(data?.readiness?.find((item) => item.id === id)));
    setError('');
    setMessage('');
  };

  const saveRemark = async () => {
    if (!data || !selected || busy) return;
    if (form.remark.trim().length < 5) {
      setError('Enter a class-teacher remark of at least five characters.');
      return;
    }
    const ratings = ['conduct', 'punctuality', 'cooperation', 'handwriting', 'practicalSkills'];
    if (ratings.some((key) => !form[key] || Number(form[key]) < 1 || Number(form[key]) > 5)) {
      setError('Choose all five report ratings from 1 to 5.');
      return;
    }
    setBusy('save');
    setError('');
    setMessage('');
    try {
      await model.saveClassRemark(
        context.schoolId,
        data.cycleId,
        selected.id,
        {
          remark: form.remark.trim(),
          conduct: Number(form.conduct),
          punctuality: Number(form.punctuality),
          cooperation: Number(form.cooperation),
          handwriting: Number(form.handwriting),
          practicalSkills: Number(form.practicalSkills),
        },
        selected.remarkVersion,
      );
      const fresh = await model.classReport(context.schoolId, classId, '', '', cycleId);
      setData(fresh);
      const updated = fresh.readiness?.find((item) => item.id === pupil);
      setForm(formFrom(updated));
      setMessage('Class-teacher remark and ratings saved.');
    } catch (reason) {
      setError(reason?.message ?? 'Could not save this pupil remark.');
    } finally {
      setBusy('');
    }
  };

  const submitPackage = async () => {
    if (!data || busy) return;
    setBusy('submit');
    setError('');
    setMessage('');
    try {
      const fresh = await model.classReport(context.schoolId, classId, '', '', cycleId);
      await model.submitClassReport(context.schoolId, fresh.cycleId, fresh.version);
      setData({ ...fresh, state: 'REVIEW' });
      setMessage('Class report package submitted for principal review.');
    } catch (reason) {
      setError(reason?.message ?? 'The class package is not ready for submission.');
    } finally {
      setBusy('');
    }
  };

  return (
    <Screen
      title="Class report preparation"
      subtitle={data ? `Class duty · ${data.classId} · ${data.state ?? 'Draft'}` : 'Class-teacher duty'}
      code="TE14"
    >
      {error ? <Notice text={error} tone="error" /> : null}
      {message ? <Notice text={message} tone="success" /> : null}

      <Card title="Subject submission completeness">
        <Text style={ui.muted}>Submitted subject sheets: {data?.completeness?.mine ?? 0} / {data?.completeness?.others ?? 0}</Text>
        <Text style={ui.muted}>Missing required marks: {data?.completeness?.missing ?? 0}</Text>
        <Text style={ui.muted}>Class-teacher remarks saved: {data?.completeness?.remarks ?? 0}</Text>
      </Card>

      <Card title="Class report readiness">
        <View style={[ui.row, { paddingVertical: 4 }]}>
          <Text style={[ui.muted, { flex: 2, fontWeight: '600' }]}>Student</Text>
          <Text style={[ui.muted, { flex: 1, fontWeight: '600' }]}>Average</Text>
          <Text style={[ui.muted, { flex: 2, fontWeight: '600' }]}>Remarks</Text>
        </View>
        {(data?.readiness ?? []).map((row) => (
          <View key={row.id} style={[ui.row, { paddingVertical: 6 }]}>
            <Text style={[ui.text, { flex: 2 }]}>{row.name}</Text>
            <Text style={[ui.text, { flex: 1 }]}>{row.average}</Text>
            <Text style={[ui.text, { flex: 2 }]}>{row.state}</Text>
          </View>
        ))}
      </Card>

      <Card title="Pupil remarks and ratings">
        <Select label="Selected pupil *" value={pupil} onChange={choosePupil}
          options={(data?.readiness ?? []).map((row) => ({ value: row.id, label: row.name }))} />
        <Field label="Class-teacher remark *" value={form.remark}
          onChangeText={(value) => setForm((current) => ({ ...current, remark: value }))}
          placeholder="Enter the pupil's report remark" multiline editable={data?.state !== 'REVIEW'} />
        {['conduct', 'punctuality', 'cooperation', 'handwriting', 'practicalSkills'].map((key) => (
          <Select
            key={key}
            label={`${key === 'practicalSkills' ? 'Practical skills' : key[0].toUpperCase() + key.slice(1)} *`}
            value={form[key]}
            onChange={(value) => setForm((current) => ({ ...current, [key]: value }))}
            options={ratingOptions}
            disabled={data?.state === 'REVIEW'}
          />
        ))}
        <Button title={busy === 'save' ? 'Saving…' : "Save this pupil's remarks and ratings"}
          variant="secondary" onPress={saveRemark} loading={busy === 'save'} disabled={!data || data.state === 'REVIEW' || Boolean(busy)} />
      </Card>

      <Notice text="The server checks that subject sheets and all class-teacher remarks are complete before this package can be submitted." />

      <Button title={busy === 'submit' ? 'Submitting…' : 'Review and submit class package'}
        onPress={submitPackage} loading={busy === 'submit'} disabled={!data || data.state === 'REVIEW' || Boolean(busy)} />
      <Button title="Open my subject marks" variant="secondary" onPress={() => navigation.navigate('TE12')} />

      <BottomNav navigation={navigation} current="TE14" />
    </Screen>
  );
}
