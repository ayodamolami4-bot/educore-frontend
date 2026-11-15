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
  const [classDuty, setClassDuty] = useState('');
  const [registerState, setRegisterState] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    model.attendanceCentre(context.schoolId)
      .then((value) => {
        if (!active) return;
        setData(value);
        setClassDuty(value.classDuty ?? '');
      })
      .catch((reason) => {
        if (active) setError(reason?.message ?? 'Could not load attendance registers.');
      });
    return () => { active = false; };
  }, [model, context.schoolId]);

  return (
    <Screen title="Attendance centre" subtitle="Only your assigned daily-register duties." code="TE06">
      <Select label="School date" value={data?.date ?? ''} onChange={() => {}} options={data?.date ? [{ value: data.date, label: data.date }] : []} />
      <Select label="Class duty" value={classDuty} onChange={setClassDuty}
        options={(data?.classes ?? []).map((item) => ({ value: item.id, label: item.label }))} />
      <Select label="Register state" value={registerState} onChange={setRegisterState}
        options={[{ value: 'all', label: 'All states' }, { value: 'DRAFT', label: 'Draft' }, { value: 'SUBMITTED', label: 'Submitted' }]} />
      {error ? <Notice text={error} tone="error" /> : null}

      <Card title="Registers">
        {(data?.registers ?? [])
          .filter((r) => (!classDuty || r.classId === classDuty) && (registerState === 'all' || r.state === registerState))
          .map((r) => (
          <Pressable key={r.id} style={[ui.row, { paddingVertical: 8 }]} onPress={() => navigation.navigate('TE07', { classId: r.classId, date: r.date })}>
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

      <Button
        title="Open daily register"
        disabled={!classDuty || !data?.date}
        onPress={() => navigation.navigate('TE07', { classId: classDuty, date: data.date })}
      />

      <BottomNav navigation={navigation} current="TE06" />
    </Screen>
  );
}