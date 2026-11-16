import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, EmptyState, Notice, Select, ui } from '../../../components/Controls';
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

  const classLabel = (id) => data?.classes?.find((item) => item.id === id)?.label ?? 'Assigned class';
  const openRegister = (classId, date) => navigation.navigate('TE07', {
    classId,
    date,
    classLabel: classLabel(classId),
  });

  const registers = (data?.registers ?? []).filter((item) =>
    (!classDuty || item.classId === classDuty) &&
    (registerState === 'all' || item.state === registerState)
  );

  return (
    <Screen title="Attendance centre" subtitle="Only your assigned daily-register duties." code="TE06">
      {error ? <Notice text={error} tone="error" /> : null}
      <Card title="School date">
        <Text style={ui.text}>{data?.date ?? 'Loading school date…'}</Text>
      </Card>
      <Select
        label="Class duty"
        value={classDuty}
        onChange={setClassDuty}
        options={(data?.classes ?? []).map((item) => ({ value: item.id, label: item.label }))}
      />
      <Select
        label="Register state"
        value={registerState}
        onChange={setRegisterState}
        options={[
          { value: 'all', label: 'All states' },
          { value: 'DRAFT', label: 'Draft' },
          { value: 'SUBMITTED', label: 'Submitted' },
        ]}
      />

      <Card title="Registers">
        {registers.map((item) => (
          <Pressable
            key={item.id}
            style={[ui.row, { paddingVertical: 8 }]}
            onPress={() => openRegister(item.classId, item.date)}
          >
            <View style={{ flex: 1 }}>
              <Text style={ui.text}>{item.label}</Text>
              <Text style={ui.muted}>{item.detail}</Text>
            </View>
            <Text style={[ui.muted, { fontWeight: '600' }]}>{item.state}</Text>
          </Pressable>
        ))}
        {data && registers.length === 0 ? (
          <EmptyState title="No registers for this filter" description="No register has been created or submitted for your selected class and date." />
        ) : null}
      </Card>

      <Card title="School-day context">
        <Text style={ui.muted}>Date: {data?.date ?? '—'}</Text>
        <Notice text="A teacher without the current attendance duty cannot open or submit a class register. A missing register is not an absent class." />
      </Card>

      <Button
        title="Open daily register"
        disabled={!classDuty || !data?.date}
        onPress={() => openRegister(classDuty, data.date)}
      />
      <BottomNav navigation={navigation} current="TE06" />
    </Screen>
  );
}