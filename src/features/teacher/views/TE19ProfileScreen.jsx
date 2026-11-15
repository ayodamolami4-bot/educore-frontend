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

  useEffect(() => { void model.profile(context.schoolId).then(setData); }, [model, context.schoolId]);

  return (
    <Screen title="Profile and responsibilities" subtitle="Read your official school duties." code="TE19">
      <Card title={data?.displayName ?? 'Mr Chinedu Okafor'} subtitle={`${data?.code ?? 'ST-001'} - ${data?.role ?? 'Teacher'}`}>
        <Text style={ui.muted}>Status: {data?.state}</Text>
      </Card>

      <Card title="Official profile">
        <Text style={ui.muted}>School: {data?.official?.school}</Text>
        <Text style={ui.muted}>Can teach: {data?.official?.canTeach}</Text>
        <Text style={ui.muted}>Actually assigned: {data?.official?.assigned}</Text>
        <Text style={ui.muted}>Class-teacher duty: {data?.official?.classTeacher}</Text>
        <Text style={ui.muted}>Attendance duty: {data?.official?.attendance}</Text>
        <Text style={ui.muted}>Effective session: {data?.official?.session}</Text>
      </Card>

      <Card title="Read-only responsibilities">
        <Text style={ui.muted}>Subject teaching — No self-assignment or payroll controls</Text>
        <Text style={ui.muted}>Published timetable — Combined actual duties</Text>
      </Card>

      <Notice text="Ask School Office to correct official staff data or assignments. Personal password / email / recovery settings are shared account features." />

      <Button title="Open account settings" onPress={() => openShared('Settings')} />
      <Button title="Ask Office for a correction" variant="secondary" onPress={() => navigation.navigate('TE17')} />
      <Button title="Switch school or role" variant="secondary" onPress={() => openShared('ChooseContext')} />

      <BottomNav navigation={navigation} current="TE19" />
    </Screen>
  );
}