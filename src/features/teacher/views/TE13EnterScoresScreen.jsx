import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, Field, Notice, Select, ui } from '../../../components/Controls';
import { BottomNav } from './BottomNav';
import { useTeacher } from './TeacherNavigator';

export function TE13EnterScoresScreen() {
  const navigation = useNavigation();
  const { context, model } = useTeacher();
  const [data, setData] = useState(null);
  const [entry, setEntry] = useState('recorded');

  useMemo(() => { void model.scores(context.schoolId, 'c1', 'Mathematics', '2026/2027', 'First Term').then(setData); }, [context.schoolId]);

  return (
    <Screen title="Enter assessment scores" subtitle="JSS1 A - Mathematics - First Term." code="TE13">
      <Card title="Locked internal policy">
        <Text style={ui.muted}>CA1 / CA2 / Exam: {data?.policy ? `${data.policy.ca1} / ${data.policy.ca2} / ${data.policy.exam}` : '20 / 20 / 60'}</Text>
        <Text style={ui.muted}>Total / precision: 100 - one decimal place</Text>
        <Text style={ui.muted}>Submission deadline: 11 Dec - school-configured</Text>
        <Text style={ui.muted}>State: {data?.state}</Text>
      </Card>

      <Card title="Class scores">
        <View style={[ui.row, { paddingVertical: 4 }]}>
          <Text style={[ui.muted, { flex: 2, fontWeight: '600' }]}>Student</Text>
          <Text style={[ui.muted, { flex: 1, fontWeight: '600' }]}>CA1</Text>
          <Text style={[ui.muted, { flex: 1, fontWeight: '600' }]}>CA2</Text>
          <Text style={[ui.muted, { flex: 1, fontWeight: '600' }]}>Exam</Text>
        </View>
        {(data?.students ?? []).map((s) => (
          <View key={s.id} style={[ui.row, { paddingVertical: 6 }]}>
            <Text style={[ui.text, { flex: 2 }]}>{s.name}</Text>
            <Text style={[ui.text, { flex: 1 }]}>{s.ca1 ?? '-'}</Text>
            <Text style={[ui.text, { flex: 1 }]}>{s.ca2 ?? '-'}</Text>
            <Text style={[ui.text, { flex: 1 }]}>{s.exam ?? '-'}</Text>
          </View>
        ))}
      </Card>

      <Card title="Apply pupil scores">
        <Select label="Selected pupil *" value="s1" onChange={() => {}} options={(data?.students ?? []).map((s) => ({ value: s.id, label: s.name }))} />
        <Select label="Entry state *" value={entry} onChange={setEntry}
          options={[{ value: 'recorded', label: 'Recorded' }, { value: 'absent', label: 'Absent' }, { value: 'not', label: 'Not recorded' }]} />
        <Field label="CA1 / 20" placeholder="16" keyboardType="numeric" />
        <Field label="CA2 / 20" placeholder="17" keyboardType="numeric" />
        <Field label="Examination / 60" placeholder="45" keyboardType="numeric" />
        <Text style={ui.muted}>Calculated by backend: Total 78.0 / 100 — Grade A</Text>
        <Field label="Absence / correction note" placeholder="Enter absence / correction note" />
        <Button title="Apply pupil scores to draft" variant="secondary" />
      </Card>

      <Notice text="Required unresolved scores block submission/publication. Do not convert missing marks to zero." />

      <Button title="Review and submit subject marks" />
      <Button title="Save score draft" variant="secondary" />

      <BottomNav navigation={navigation} current="TE13" />
    </Screen>
  );
}