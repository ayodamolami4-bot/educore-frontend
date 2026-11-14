import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, Field, Notice, Select, ui } from '../../../components/Controls';
import { BottomNav } from './BottomNav';
import { useTeacher } from './TeacherNavigator';

export function TE10AssignmentSubmissionsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const assignmentId = route.params?.assignmentId ?? 'as1';
  const { context, model } = useTeacher();
  const [data, setData] = useState(null);

  useMemo(() => { void model.assignment(context.schoolId, assignmentId).then(setData); }, [context.schoolId, assignmentId]);

  return (
    <Screen title="Assignment and submissions" subtitle={`Fractions practice - JSS1 A Mathematics.`} code="TE10">
      <Card title="Assignment">
        <Text style={ui.muted}>Due: {data?.due}</Text>
        <Text style={ui.muted}>Method: {data?.method}</Text>
        <Text style={ui.muted}>Maximum score: {data?.maxScore}</Text>
        <Text style={ui.muted}>Window: {data?.window}</Text>
      </Card>

      <Select label="Submission filter" value="all" onChange={() => {}}
        options={[{ value: 'all', label: 'All students' }, { value: 'not', label: 'Not submitted' }, { value: 'submitted', label: 'Submitted' }, { value: 'late', label: 'Late' }, { value: 'returned', label: 'Returned' }, { value: 'reviewed', label: 'Reviewed' }]} />

      <Card title="Class submissions">
        {(data?.submissions ?? []).map((s) => (
          <Pressable key={s.id} style={[ui.row, { paddingVertical: 8 }]} onPress={() => navigation.navigate('TE11', { assignmentId, studentId: s.id })}>
            <View style={{ flex: 1 }}>
              <Text style={ui.text}>{s.student}</Text>
              <Text style={ui.muted}>{s.detail}</Text>
            </View>
            <Text style={[ui.muted, { fontWeight: '600' }]}>{s.state}</Text>
          </Pressable>
        ))}
      </Card>

      <Card title="Window management">
        <Select label="Window action" value="keep" onChange={() => {}}
          options={[{ value: 'keep', label: 'Keep open' }, { value: 'close', label: 'Close submissions' }, { value: 'reopen', label: 'Reopen with reason' }]} />
        <Field label="Window-change reason" placeholder="Enter window-change reason" />
        <Button title="Review window change" variant="secondary" />
      </Card>

      <Notice text="For physical work, record Received / Not received and the received date. A parent cannot submit on behalf of the pupil in this scope." />

      <Button title="Review selected submission" onPress={() => navigation.navigate('TE11', { assignmentId, studentId: 'su1' })} />
      <Button title="Edit assignment" variant="secondary" onPress={() => navigation.navigate('TE09')} />

      <BottomNav navigation={navigation} current="TE10" />
    </Screen>
  );
}