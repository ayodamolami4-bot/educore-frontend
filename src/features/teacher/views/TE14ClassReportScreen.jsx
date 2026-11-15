import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, Field, Notice, Select, ui } from '../../../components/Controls';
import { BottomNav } from './BottomNav';
import { useTeacher } from './TeacherNavigator';

export function TE14ClassReportScreen() {
  const navigation = useNavigation();
  const { context, model } = useTeacher();
  const [data, setData] = useState(null);
  const [pupil, setPupil] = useState('s1');
  const rating = (label) => (
    <Select label={`${label} *`} value="4" onChange={() => {}} options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} - ${['Needs improvement', 'Developing', 'Satisfactory', 'Good', 'Excellent'][n - 1]}` }))} />
  );

  useEffect(() => { void model.classReport(context.schoolId, 'c1', '2026/2027', 'First Term').then(setData); }, [model, context.schoolId]);

  return (
    <Screen title="Class report preparation" subtitle="Class-teacher duty - JSS1 A." code="TE14">
      <Select label="Session" value="2026/2027" onChange={() => {}} options={[{ value: '2026/2027', label: '2026/2027' }, { value: '2025/2026', label: '2025/2026' }]} />
      <Select label="Term" value="First Term" onChange={() => {}} options={[{ value: 'First Term', label: 'First Term' }, { value: 'Second Term', label: 'Second Term' }, { value: 'Third Term', label: 'Third Term' }]} />

      <Card title="Subject submission completeness">
        <Text style={ui.muted}>Mathematics — your subject: {data?.completeness?.mine}</Text>
        <Text style={ui.muted}>Other subjects: {data?.completeness?.others}</Text>
        <Text style={ui.muted}>Missing required marks: {data?.completeness?.missing}</Text>
        <Text style={ui.muted}>Class-teacher remarks / ratings: {data?.completeness?.remarks}</Text>
      </Card>

      <Card title="Class report readiness">
        <View style={[ui.row, { paddingVertical: 4 }]}>
          <Text style={[ui.muted, { flex: 2, fontWeight: '600' }]}>Student</Text>
          <Text style={[ui.muted, { flex: 1, fontWeight: '600' }]}>Average</Text>
          <Text style={[ui.muted, { flex: 2, fontWeight: '600' }]}>Remarks</Text>
        </View>
        {(data?.readiness ?? []).map((r) => (
          <View key={r.id} style={[ui.row, { paddingVertical: 6 }]}>
            <Text style={[ui.text, { flex: 2 }]}>{r.name}</Text>
            <Text style={[ui.text, { flex: 1 }]}>{r.average}</Text>
            <Text style={[ui.text, { flex: 2 }]}>{r.state}</Text>
          </View>
        ))}
      </Card>

      <Card title="Pupil remarks and ratings">
        <Select label="Selected pupil *" value={pupil} onChange={setPupil} options={(data?.readiness ?? []).map((r) => ({ value: r.id, label: r.name }))} />
        <Field label="Class-teacher remark *" placeholder="Consistent effort; keep practising." multiline />
        {rating('Conduct')}
        {rating('Punctuality')}
        {rating('Cooperation')}
        {rating('Handwriting')}
        {rating('Practical skills')}
        <Field label="Flag subject issue / note to Office" placeholder="Enter flag subject issue / note to office" multiline />
        <Button title="Save this pupil's remarks and ratings" variant="secondary" />
      </Card>

      <Notice text="If you also teach Mathematics in this class, use your already-submitted TE13 marks. Do not re-enter them or send them to yourself." />

      <Button title="Review and submit class package" />
      <Button title="Open my subject marks" variant="secondary" onPress={() => navigation.navigate('TE13')} />

      <BottomNav navigation={navigation} current="TE14" />
    </Screen>
  );
}