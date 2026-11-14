import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, Notice, Select, ui } from '../../../components/Controls';
import { BottomNav } from './BottomNav';
import { useTeacher } from './TeacherNavigator';

export function TE05TimetableScreen() {
  const navigation = useNavigation();
  const { context, model } = useTeacher();
  const [data, setData] = useState(null);
  const [display, setDisplay] = useState('week');

  useMemo(() => { void model.timetable(context.schoolId).then(setData); }, [context.schoolId]);

  return (
    <Screen title="Timetable and calendar" subtitle="Your published lessons, exams and assigned school duties." code="TE05">
      <Select label="Session" value="2026/2027" onChange={() => {}} options={[{ value: '2026/2027', label: '2026/2027' }, { value: '2025/2026', label: '2025/2026' }]} />
      <Select label="Week" value="9-13 November 2026" onChange={() => {}} options={[{ value: 'w1', label: '9-13 November 2026' }, { value: 'w2', label: '16-20 November 2026' }]} />
      <Select label="Display" value={display} onChange={setDisplay}
        options={[{ value: 'week', label: 'My combined week' }, { value: 'class', label: 'Selected class' }, { value: 'calendar', label: 'Calendar events' }]} />
      <Select label="Class filter" value="all" onChange={() => {}}
        options={[{ value: 'all', label: 'All my classes' }, { value: 'JSS1A', label: 'JSS1 A' }, { value: 'JSS1B', label: 'JSS1 B' }]} />

      {display === 'week' && (
        <Card title="Combined teacher week">
          <View style={[ui.row, { paddingVertical: 4 }]}>
            <Text style={[ui.muted, { width: 50 }]}>WAT</Text>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((d) => (
              <Text key={d} style={[ui.muted, { flex: 1, textAlign: 'center', fontWeight: '600' }]}>{d}</Text>
            ))}
          </View>
          {(data?.grid ?? []).map((row) => (
            <View key={row.time} style={[ui.row, { paddingVertical: 4 }]}>
              <Text style={[ui.muted, { width: 50 }]}>{row.time}</Text>
              {['mon', 'tue', 'wed', 'thu', 'fri'].map((d) => (
                <Text key={d} style={[ui.text, { flex: 1, textAlign: 'center' }]}>{row[d]}</Text>
              ))}
            </View>
          ))}
          <Notice text="Math A = JSS1 A; Math B = JSS1 B. Only actual assigned lessons and supervision duties appear." />
        </Card>
      )}

      {display === 'calendar' && (
        <Card title="November 2026">
          <Text style={ui.muted}>Calendar mode placeholder — render a real month grid here.</Text>
        </Card>
      )}

      <Card title="Duties and exceptions">
        {(data?.duties ?? []).map((d) => (
          <View key={d.id} style={{ paddingVertical: 6 }}>
            <Text style={ui.text}>{d.title}</Text>
            <Text style={ui.muted}>{d.detail}</Text>
          </View>
        ))}
      </Card>

      <Button title="Open today's class" onPress={() => navigation.navigate('TE03', { classId: 'c1' })} />
      <Button title="View calendar notices" variant="secondary" onPress={() => navigation.navigate('TE16')} />

      <BottomNav navigation={navigation} current="TE05" />
    </Screen>
  );
}