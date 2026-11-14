import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, Notice, Select, ui } from '../../../components/Controls';
import { BottomNav } from './BottomNav';
import { useTeacher } from './TeacherNavigator';

export function TE12MarksStatusScreen() {
  const navigation = useNavigation();
  const { context, model } = useTeacher();
  const [data, setData] = useState(null);

  useMemo(() => { void model.marksPackages(context.schoolId).then(setData); }, [context.schoolId]);

  return (
    <Screen title="Marks and submission status" subtitle="Your subject marks and separate class-report duty." code="TE12">
      <Select label="Session" value="2026/2027" onChange={() => {}} options={[{ value: '2026/2027', label: '2026/2027' }, { value: '2025/2026', label: '2025/2026' }]} />
      <Select label="Term" value="First Term" onChange={() => {}} options={[{ value: 'First Term', label: 'First Term' }, { value: 'Second Term', label: 'Second Term' }, { value: 'Third Term', label: 'Third Term' }]} />
      <Select label="Class" value="JSS1 A" onChange={() => {}} options={[{ value: 'JSS1 A', label: 'JSS1 A' }, { value: 'JSS1 B', label: 'JSS1 B' }]} />
      <Select label="Subject" value="Mathematics" onChange={() => {}} options={[{ value: 'Mathematics', label: 'Mathematics' }]} />

      <Card title="Subject mark packages">
        {(data?.packages ?? []).map((p) => (
          <Pressable key={p.id} style={[ui.row, { paddingVertical: 8 }]} onPress={() => navigation.navigate('TE13')}>
            <View style={{ flex: 1 }}>
              <Text style={ui.text}>{p.label}</Text>
              <Text style={ui.muted}>{p.detail}</Text>
            </View>
            <Text style={[ui.muted, { fontWeight: '600' }]}>{p.state}</Text>
          </Pressable>
        ))}
      </Card>

      <Card title="Class-teacher responsibility">
        {data?.classReport && (
          <Pressable style={[ui.row]} onPress={() => navigation.navigate('TE14')}>
            <View style={{ flex: 1 }}>
              <Text style={ui.text}>{data.classReport.label}</Text>
              <Text style={ui.muted}>{data.classReport.detail}</Text>
            </View>
            <Text style={[ui.muted, { fontWeight: '600' }]}>{data.classReport.state}</Text>
          </Pressable>
        )}
      </Card>

      <Notice text="When you teach a subject in your own class, submit those subject marks once. The class sheet reuses them; class-report preparation is a separate task." />

      <Button title="Enter or review scores" onPress={() => navigation.navigate('TE13')} />
      <Button title="Prepare class reports" variant="secondary" onPress={() => navigation.navigate('TE14')} />

      <BottomNav navigation={navigation} current="TE12" />
    </Screen>
  );
}