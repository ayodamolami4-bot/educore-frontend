import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, Notice, ui } from '../../../components/Controls';
import { BottomNav } from './BottomNav';
import { useTeacher } from './TeacherNavigator';

export function TE19ProfileScreen() {
  const navigation = useNavigation();
  const { context, openShared, model } = useTeacher();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    model.profile(context.schoolId)
      .then((value) => { if (active) setData(value); })
      .catch((reason) => { if (active) setError(reason?.message ?? 'Could not load the official teacher profile.'); });
    return () => { active = false; };
  }, [model, context.schoolId]);

  return (
    <Screen title="Profile and responsibilities" subtitle="Read your official school duties." code="TE19">
      {error ? <Notice text={error} tone="error" /> : null}
      {!data && !error ? <Notice text="Loading official staff details…" /> : null}

      {data ? (
        <>
          <Card title={data.displayName || 'Teacher profile'} subtitle={[data.code, data.role].filter(Boolean).join(' · ')}>
            <Text style={ui.muted}>Status: {data.state || 'Not provided'}</Text>
          </Card>

          <Card title="Official profile">
            {data.official?.school ? <Text style={ui.muted}>School: {data.official.school}</Text> : null}
            {data.official?.canTeach ? <Text style={ui.muted}>Can teach: {data.official.canTeach}</Text> : null}
            {data.official?.assigned ? <Text style={ui.muted}>Actually assigned: {data.official.assigned}</Text> : null}
            {data.official?.classTeacher ? <Text style={ui.muted}>Class-teacher duty: {data.official.classTeacher}</Text> : null}
            {data.official?.attendance ? <Text style={ui.muted}>Attendance duty: {data.official.attendance}</Text> : null}
            {data.official?.session ? <Text style={ui.muted}>Assigned session IDs: {data.official.session}</Text> : null}
            {!data.official?.canTeach && !data.official?.assigned && !data.official?.classTeacher ? (
              <Text style={ui.muted}>No current teaching or class-teacher assignments are recorded.</Text>
            ) : null}
          </Card>

          <Card title="Read-only responsibilities">
            <Text style={ui.muted}>Subject teaching — No self-assignment or payroll controls</Text>
            <Text style={ui.muted}>Published timetable — Combined actual duties</Text>
          </Card>
        </>
      ) : null}

      <Notice text="Ask School Office to correct official staff data or assignments. Personal password, email and recovery settings are shared account features." />
      <Button title="Open account settings" onPress={() => openShared('Settings')} />
      <Button title="Ask Office for a correction" variant="secondary" onPress={() => navigation.navigate('TE17')} />
      <Button title="Switch school or role" variant="secondary" onPress={() => openShared('ChooseContext')} />
      <BottomNav navigation={navigation} current="TE19" />
    </Screen>
  );
}