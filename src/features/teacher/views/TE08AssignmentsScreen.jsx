import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, Field, Notice, Select, ui } from '../../../components/Controls';
import { BottomNav } from './BottomNav';
import { useTeacher } from './TeacherNavigator';

export function TE08AssignmentsScreen() {
  const navigation = useNavigation();
  const { context, model } = useTeacher();
  const [data, setData] = useState(null);

  useMemo(() => { void model.assignments(context.schoolId).then(setData); }, [context.schoolId]);

  return (
    <Screen title="Assignments" subtitle="Published work, drafts and review queues." code="TE08">
      <Select label="Class" value="JSS1 A" onChange={() => {}} options={[{ value: 'JSS1 A', label: 'JSS1 A' }, { value: 'JSS1 B', label: 'JSS1 B' }]} />
      <Select label="Subject" value="Mathematics" onChange={() => {}} options={[{ value: 'Mathematics', label: 'Mathematics' }]} />
      <Select label="Status" value="all" onChange={() => {}}
        options={[{ value: 'all', label: 'All assignments' }, { value: 'draft', label: 'Draft' }, { value: 'open', label: 'Published - open' }, { value: 'past', label: 'Past due - open' }, { value: 'closed', label: 'Closed' }]} />
      <Field label="Search assignment" placeholder="Enter search assignment" />

      <Card title="Assignments">
        {(data?.items ?? []).map((a) => (
          <Pressable key={a.id} style={[ui.row, { paddingVertical: 8 }]} onPress={() => navigation.navigate('TE10', { assignmentId: a.id })}>
            <View style={{ flex: 1 }}>
              <Text style={ui.text}>{a.title}</Text>
              <Text style={ui.muted}>{a.detail}</Text>
            </View>
            <Text style={[ui.muted, { fontWeight: '600' }]}>{a.state}</Text>
          </Pressable>
        ))}
      </Card>

      <Notice text="Teacher assignment feedback and internal term assessment are separate records. An assignment score is not automatically a CA mark." />

      <Button title="Create assignment" onPress={() => navigation.navigate('TE09')} />
      <Button title="Review submissions" variant="secondary" onPress={() => navigation.navigate('TE10', { assignmentId: 'as1' })} />

      <BottomNav navigation={navigation} current="TE08" />
    </Screen>
  );
}