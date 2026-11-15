import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, Notice, Select, ui } from '../../../components/Controls';
import { BottomNav } from './BottomNav';
import { useTeacher } from './TeacherNavigator';

export function TE06AttendanceCentreScreen() {
  const navigation = useNavigation();
  const { context, model } = useTeacher();
  const [data, setData] = useState(null);

  useEffect(() => { void model.attendanceCentre(context.schoolId).then(setData); }, [model, context.schoolId]);

  return (
    <Screen title="Attendance centre" subtitle="Only your assigned daily-register duties." code="TE06">
      <Select label="School date" value={data?.date ?? '2026-11-09'} onChange={() => {}} options={[{ value: '2026-11-09', label: '2026-11-09' }]} />
      <Select label="Class duty" value={data?.classDuty ?? 'JSS1 A'} onChange={() => {}} options={[{ value: 'JSS1 A', label: 'JSS1 A' }, { value: 'JSS1 B', label: 'JSS1 B' }]} />
      <Select label="Register state" value={data?.registerState ?? 'All states'} onChange={() => {}}
        options={[{ value: 'all', label: 'All states' }, { value: 'not', label: 'Not started' }, { value: 'draft', label: 'Draft' }, { value: 'submitted', label: 'Submitted' }, { value: 'returned', label: 'Returned for review' }]} />

      <Card title="Registers">
        {(data?.registers ?? []).map((r) => (
          <Pressable key={r.id} style={[ui.row, { paddingVertical: 8 }]} onPress={() => navigation.navigate('TE07', { classId: 'c1', date: data.date })}>
            <View style={{ flex: 1 }}>
              <Text style={ui.text}>{r.label}</Text>
              <Text style={ui.muted}>{r.detail}</Text>
            </View>
            <Text style={[ui.muted, { fontWeight: '600' }]}>{r.state}</Text>
          </Pressable>
        ))}
      </Card>

      <Card title="School-day context">
        <Text style={ui.muted}>Date: {data?.context?.date}</Text>
        <Text style={ui.muted}>Expected deadline: {data?.context?.deadline}</Text>
        <Text style={ui.muted}>Responsible teacher: {data?.context?.teacher}</Text>
        <Notice text="A teacher without this duty cannot open or submit a class register. Missing submission is not an absent class." />
      </Card>

      <Button title="Open daily register" onPress={() => navigation.navigate('TE07', { classId: 'c1', date: data?.date ?? '2026-11-09' })} />

      <BottomNav navigation={navigation} current="TE06" />
    </Screen>
  );
}