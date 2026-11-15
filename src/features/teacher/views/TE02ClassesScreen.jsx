import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, Notice, Select, ui } from '../../../components/Controls';
import { BottomNav } from './BottomNav';
import { useTeacher } from './TeacherNavigator';

export function TE02ClassesScreen() {
  const navigation = useNavigation();
  const { context, model } = useTeacher();
  const [data, setData] = useState(null);
  const [session, setSession] = useState('2026/2027');
  const [view, setView] = useState('all');

  useEffect(() => {
    void model.classes(context.schoolId).then(setData);
  }, [model, context.schoolId]);

  return (
    <Screen title="My classes and subjects" subtitle="Only classes you actually teach or supervise." code="TE02">
      <Select label="Session" value={session} onChange={setSession}
        options={[{ value: '2026/2027', label: '2026/2027' }, { value: '2025/2026', label: '2025/2026' }]} />
      <Select label="Assignment view" value={view} onChange={setView}
        options={[
          { value: 'all', label: 'All my responsibilities' },
          { value: 'subject', label: 'Subject teaching' },
          { value: 'class', label: 'Class teacher' },
          { value: 'attendance', label: 'Attendance duty' },
        ]} />

      <Card title="Accepted assignments">
        {(data?.items ?? []).map((c) => (
          <Pressable key={c.id} style={[ui.row, { paddingVertical: 8 }]} onPress={() => navigation.navigate('TE03', { classId: c.id })}>
            <View style={{ flex: 1 }}>
              <Text style={ui.text}>{c.label}</Text>
              <Text style={ui.muted}>{c.detail}</Text>
            </View>
            <Text style={[ui.muted, { fontWeight: '600' }]}>{c.state}</Text>
          </Pressable>
        ))}
      </Card>

      <Notice text="“Can teach” eligibility is not a current class assignment. Ask Office to correct an incorrect assignment." />

      <Button title="Open JSS1 A workspace" onPress={() => navigation.navigate('TE03', { classId: 'c1' })} />
      <Button title="View my responsibilities" variant="secondary" onPress={() => navigation.navigate('TE19')} />

      <BottomNav navigation={navigation} current="TE02" />
    </Screen>
  );
}