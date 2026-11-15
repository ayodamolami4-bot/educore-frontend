import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, Field, Notice, Select, ui } from '../../../components/Controls';
import { BottomNav } from './BottomNav';
import { useTeacher } from './TeacherNavigator';

export function TE07DailyRegisterScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { classId, date } = route.params ?? { classId: 'c1', date: '2026-11-09' };
  const { context, model } = useTeacher();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('ABSENT');
  const [student, setStudent] = useState('s1');

  useEffect(() => { void model.register(context.schoolId, classId, date).then(setData); }, [model, context.schoolId, classId, date]);

  return (
    <Screen title="Daily class register" subtitle={`JSS1 A - Monday, 9 November.`} code="TE07">
      <Card title="Register context">
        <Text style={ui.muted}>Students on dated roster: {data?.context?.roster}</Text>
        <Text style={ui.muted}>Submission deadline: {data?.context?.deadline}</Text>
        <Text style={ui.muted}>State / version: {data?.context?.state}</Text>
        <Field label="Find student" placeholder="Enter find student" />
      </Card>

      <Card title="Mark the dated roster">
        <View style={[ui.row, { paddingVertical: 4 }]}>
          <Text style={[ui.muted, { flex: 2, fontWeight: '600' }]}>Student</Text>
          <Text style={[ui.muted, { flex: 1, fontWeight: '600' }]}>Status</Text>
          <Text style={[ui.muted, { flex: 2, fontWeight: '600' }]}>Note</Text>
        </View>
        {(data?.students ?? []).map((s) => (
          <View key={s.id} style={[ui.row, { paddingVertical: 6 }]}>
            <Text style={[ui.text, { flex: 2 }]}>{s.name}</Text>
            <Text style={[ui.text, { flex: 1 }]}>{s.status}</Text>
            <Text style={[ui.muted, { flex: 2 }]}>{s.note}</Text>
          </View>
        ))}
      </Card>

      <Card title="Apply a status">
        <Select label="Selected student *" value={student} onChange={setStudent}
          options={(data?.students ?? []).map((s) => ({ value: s.id, label: s.name }))} />
        <Select label="Attendance status *" value={status} onChange={setStatus}
          options={[{ value: 'PRESENT', label: 'PRESENT' }, { value: 'ABSENT', label: 'ABSENT' }, { value: 'LATE', label: 'LATE' }, { value: 'EXCUSED', label: 'EXCUSED' }]} />
        <Field label="Note / late arrival time" placeholder="Enter note / late arrival time" />
        <Button title="Apply this student's status" variant="secondary" />
      </Card>

      <Card title="Summary">
        <Text style={ui.text}>Marked: {data?.summary?.marked} / 32</Text>
        <Text style={ui.text}>Present: {data?.summary?.present}</Text>
        <Text style={ui.text}>Absent: {data?.summary?.absent}</Text>
        <Text style={ui.text}>Late: {data?.summary?.late}</Text>
        <Notice text="Every pupil needs an explicit status; do not silently treat an unmarked pupil as present." />
      </Card>

      <Button title="Review and submit register" />
      <Button title="Save register draft" variant="secondary" />

      <BottomNav navigation={navigation} current="TE07" />
    </Screen>
  );
}