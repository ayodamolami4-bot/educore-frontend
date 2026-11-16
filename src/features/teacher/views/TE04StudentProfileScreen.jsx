import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, EmptyState, Notice, ui } from '../../../components/Controls';
import { BottomNav } from './BottomNav';
import { useTeacher } from './TeacherNavigator';

export function TE04StudentProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const studentId = route.params?.studentId;
  const classId = route.params?.classId;
  const { context, model } = useTeacher();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      await Promise.resolve();
      if (!active) return;
      setData(null);
      setError('');
      if (!studentId || !classId) {
        setError('Open a student from the roster of one of your assigned classes.');
        return;
      }
      try {
        const value = await model.studentProfile(context.schoolId, classId, studentId);
        if (active) setData(value);
      } catch (reason) {
        if (active) setError(reason?.message ?? 'Could not load this student record.');
      }
    };
    void load();
    return () => { active = false; };
  }, [model, context.schoolId, classId, studentId]);

  return (
    <Screen
      title="Student learning profile"
      subtitle={data ? [data.name, data.classArm].filter(Boolean).join(' · ') : 'Assigned student record'}
      code="TE04"
    >
      {error ? <Notice text={error} tone="error" /> : null}
      {!data && !error ? <Notice text="Loading this student's authorised learning record…" /> : null}

      {data ? (
        <>
          <Card title={data.name} subtitle={[data.code, data.classArm].filter(Boolean).join(' · ')}>
            <Text style={ui.muted}>Status: {data.state || 'Not provided'}</Text>
            {data.enrolment ? <Text style={ui.muted}>Enrolment: {data.enrolment}</Text> : null}
          </Card>

          {(data.yourSubject || data.classTeacherDuty) ? (
            <Card title="Your teaching context">
              {data.yourSubject ? <Text style={ui.muted}>Assigned subjects: {data.yourSubject}</Text> : null}
              {data.classTeacherDuty ? <Text style={ui.muted}>You are the assigned class teacher for this student.</Text> : null}
            </Card>
          ) : null}

          <Card title="Recent attendance and published results">
            {(data.records ?? []).map((record) => (
              <View key={record.id} style={{ paddingVertical: 6 }}>
                <Text style={ui.text}>{record.title}</Text>
                <Text style={ui.muted}>{record.detail}</Text>
                {record.extra ? <Text style={ui.muted}>{record.extra}</Text> : null}
              </View>
            ))}
            {data.records?.length === 0 ? (
              <EmptyState title="No recent records" description="Submitted attendance and published reports will appear here when available." />
            ) : null}
          </Card>

          <Button title="View assigned assignments" onPress={() => navigation.navigate('TE08')} />
          {data.classTeacherDuty ? (
            <Button
              title="Message an eligible linked guardian"
              variant="secondary"
              onPress={() => navigation.navigate('TE17', { studentId: data.id, classId: data.classId })}
            />
          ) : (
            <Notice text="Only the student's current class teacher can start a family conversation." />
          )}
        </>
      ) : null}
      <BottomNav navigation={navigation} current="TE04" />
    </Screen>
  );
}