import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, Field, Notice, ui } from '../../../components/Controls';
import { BottomNav } from './BottomNav';
import { useTeacher } from './TeacherNavigator';

export function TE03ClassWorkspaceScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const classId = route.params?.classId ?? 'c1';
  const { context, model } = useTeacher();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('Students');

  useEffect(() => { void model.classWorkspace(context.schoolId, classId).then(setData); }, [model, context.schoolId, classId]);

  return (
    <Screen title="Class workspace" subtitle={`JSS1 A - ${data?.subject ?? 'Mathematics'} - First Term.`} code="TE03">
      <View style={[ui.row, { justifyContent: 'space-around' }]}>
        {['Students', 'Materials', 'Assignments', 'Class work'].map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={{ padding: 6 }}>
            <Text style={[ui.text, tab === t && { color: '#087F8C', fontWeight: '700' }]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <Card title="Class context">
        <Text style={ui.muted}>Primary teacher: {data?.primaryTeacher}</Text>
        <Text style={ui.muted}>Class teacher: {data?.classTeacher}</Text>
        <Text style={ui.muted}>Roster: {data?.rosterCount} accepted enrolments</Text>
        <Text style={ui.muted}>Subject: {data?.subject}</Text>
        <Field label="Find a student" placeholder="Enter find a student" />
      </Card>

      {tab === 'Students' && (
        <Card title="Class roster">
          {(data?.roster ?? []).map((s) => (
            <Pressable key={s.id} style={[ui.row, { paddingVertical: 6 }]} onPress={() => navigation.navigate('TE04', { studentId: s.id })}>
              <View style={{ flex: 1 }}>
                <Text style={ui.text}>{s.name}</Text>
                <Text style={ui.muted}>{s.code} — JSS1 A</Text>
              </View>
              <Text style={[ui.muted, { fontWeight: '600' }]}>{s.state}</Text>
            </Pressable>
          ))}
        </Card>
      )}

      {tab === 'Materials' && (
        <Card title="Learning materials">
          {(data?.materials ?? []).map((m) => (
            <View key={m.id} style={{ paddingVertical: 6 }}>
              <Text style={ui.text}>{m.title}</Text>
              <Text style={ui.muted}>{m.detail}</Text>
            </View>
          ))}
          <Field label="Material title *" placeholder="Fractions - worked examples" />
          <Field label="Note / instructions" placeholder="Read the examples before Friday's practice." />
          <Notice text="Attachment — PDF / JPG / PNG — up to 10 MB. Preview and publish only to the assigned class." />
        </Card>
      )}

      <Button title="View subject assignments" onPress={() => navigation.navigate('TE08')} />
      <Button title="Open class timetable" variant="secondary" onPress={() => navigation.navigate('TE05')} />

      <BottomNav navigation={navigation} current="TE03" />
    </Screen>
  );
}