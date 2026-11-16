import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, EmptyState, Notice, ui } from '../../../components/Controls';
import { BottomNav } from './BottomNav';
import { useTeacher } from './TeacherNavigator';

export function TE03ClassWorkspaceScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const classId = route.params?.classId;
  const { context, model } = useTeacher();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('Students');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setData(null);
    setError('');
    if (!classId) {
      setError('Choose a class from your assigned classes before opening its workspace.');
      return () => { active = false; };
    }
    model.classWorkspace(context.schoolId, classId)
      .then((value) => { if (active) setData(value); })
      .catch((reason) => { if (active) setError(reason?.message ?? 'Could not load this assigned class.'); });
    return () => { active = false; };
  }, [model, context.schoolId, classId]);

  const tabs = ['Students', 'Materials', 'Assignments'];

  return (
    <Screen
      title={data?.classLabel ? data.classLabel + ' workspace' : 'Class workspace'}
      subtitle={data ? [data.subject, data.sessionId ? 'Current assigned session' : ''].filter(Boolean).join(' · ') : 'Assigned class records'}
      code="TE03"
    >
      {error ? <Notice text={error} tone="error" /> : null}
      {!data && !error ? <Notice text="Loading class workspace…" /> : null}

      {data ? (
        <>
          <View style={[ui.row, { justifyContent: 'space-around', flexWrap: 'wrap' }]}>
            {tabs.map((item) => (
              <Pressable key={item} onPress={() => setTab(item)} style={{ padding: 8 }}>
                <Text style={[ui.text, tab === item && { color: '#087F8C', fontWeight: '700' }]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <Card title="Class context">
            {data.primaryTeacher ? <Text style={ui.muted}>Primary subject teacher: {data.primaryTeacher}</Text> : null}
            {data.classTeacher ? <Text style={ui.muted}>Class teacher: {data.classTeacher}</Text> : null}
            <Text style={ui.muted}>Roster: {data.rosterCount} enrolled students</Text>
            {data.subject ? <Text style={ui.muted}>Assigned subjects: {data.subject}</Text> : null}
          </Card>

          {tab === 'Students' ? (
            <Card title="Class roster">
              {(data.roster ?? []).map((student) => (
                <Pressable
                  key={student.id}
                  style={[ui.row, { paddingVertical: 6 }]}
                  onPress={() => navigation.navigate('TE04', { studentId: student.id, classId: data.classId })}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={ui.text}>{student.name}</Text>
                    <Text style={ui.muted}>{student.code || data.classLabel}</Text>
                  </View>
                  <Text style={[ui.muted, { fontWeight: '600' }]}>{student.state}</Text>
                </Pressable>
              ))}
              {data.roster?.length === 0 ? (
                <EmptyState title="No enrolled students" description="The school has not assigned an active roster to this class." />
              ) : null}
            </Card>
          ) : null}

          {tab === 'Materials' ? (
            <Card title="Learning materials">
              {(data.materials ?? []).map((material) => (
                <View key={material.id} style={{ paddingVertical: 6 }}>
                  <Text style={ui.text}>{material.title}</Text>
                  <Text style={ui.muted}>{material.detail}</Text>
                  <Text style={ui.muted}>{material.state}{material.publishedAt ? ' · ' + material.publishedAt : ''}</Text>
                </View>
              ))}
              {data.materials?.length === 0 ? (
                <EmptyState title="No materials" description="Materials published for this class will appear here." />
              ) : null}
            </Card>
          ) : null}

          {tab === 'Assignments' ? (
            <Card title="Class assignments">
              {(data.assignments ?? []).map((assignment) => (
                <Pressable
                  key={assignment.id}
                  style={{ paddingVertical: 7 }}
                  onPress={() => navigation.navigate('TE10', { assignmentId: assignment.id })}
                >
                  <Text style={ui.text}>{assignment.title}</Text>
                  <Text style={ui.muted}>{assignment.detail}</Text>
                  <Text style={ui.muted}>{assignment.state}</Text>
                </Pressable>
              ))}
              {data.assignments?.length === 0 ? (
                <EmptyState title="No assignments" description="Assignments created for this class will appear here." />
              ) : null}
            </Card>
          ) : null}
        </>
      ) : null}

      <Button title="View all assigned assignments" onPress={() => navigation.navigate('TE08')} disabled={!data} />
      <Button title="Open class timetable" variant="secondary" onPress={() => navigation.navigate('TE05')} />
      <BottomNav navigation={navigation} current="TE03" />
    </Screen>
  );
}