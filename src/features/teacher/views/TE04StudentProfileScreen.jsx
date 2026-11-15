import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, Notice, ui } from '../../../components/Controls';
import { BottomNav } from './BottomNav';
import { useTeacher } from './TeacherNavigator';

export function TE04StudentProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const studentId = route.params?.studentId ?? 's1';
  const { context, model } = useTeacher();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('Learning');

  useEffect(() => { void model.studentProfile(context.schoolId, 'c1', studentId).then(setData); }, [model, context.schoolId, studentId]);

  return (
    <Screen title="Student learning profile" subtitle={`${data?.name ?? 'Zainab Bello'} - JSS1 A.`} code="TE04">
      <View style={[ui.row, { justifyContent: 'space-around' }]}>
        {['Learning', 'Assignments', 'Attendance', 'Published results'].map((t) => (
          <Pressable key={t} onPress={() => setTab(t)}>
            <Text style={[ui.text, tab === t && { color: '#087F8C', fontWeight: '700' }]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <Card title={data?.name ?? ''} subtitle={`${data?.code ?? ''} - ${data?.classArm ?? ''}`}>
        <Text style={ui.muted}>Status: {data?.state}</Text>
      </Card>

      <Card title="Assigned learning context">
        <Text style={ui.muted}>Your subject: {data?.yourSubject}</Text>
        <Text style={ui.muted}>Class teacher: {data?.classTeacher}</Text>
        <Text style={ui.muted}>Subject enrolment: {data?.enrolment}</Text>
        <Text style={ui.muted}>Guardian contact: Eligible only under class-teacher duty</Text>
      </Card>

      <Card title="Learning records">
        {(data?.records ?? []).map((r) => (
          <Pressable key={r.id} style={{ paddingVertical: 6 }}>
            <Text style={ui.text}>{r.title}</Text>
            <Text style={ui.muted}>{r.detail}</Text>
            <Text style={ui.muted}>{r.extra}</Text>
          </Pressable>
        ))}
      </Card>

      <Notice text="No unrelated subjects, siblings, other schools or finance records are shown." />

      <Button title="Open assignment review" onPress={() => navigation.navigate('TE11')} />
      <Button title="Message eligible guardian" variant="secondary" onPress={() => navigation.navigate('TE17')} />

      <BottomNav navigation={navigation} current="TE04" />
    </Screen>
  );
}