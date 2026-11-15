import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, Field, Notice, Select, ui } from '../../../components/Controls';
import { BottomNav } from './BottomNav';
import { useTeacher } from './TeacherNavigator';

export function TE17MessagesScreen() {
  const navigation = useNavigation();
  const { context, model } = useTeacher();
  const [data, setData] = useState(null);

  useEffect(() => { void model.threads(context.schoolId).then(setData); }, [model, context.schoolId]);

  return (
    <Screen title="Messages inbox" subtitle="Eligible family and staff conversations." code="TE17">
      <Select label="Conversation scope" value="all" onChange={() => {}}
        options={[{ value: 'all', label: 'All permitted' }, { value: 'families', label: 'Class families - class teacher only' }, { value: 'office', label: 'School Office' }, { value: 'staff', label: 'Staff' }]} />
      <Field label="Find conversation" placeholder="Enter find conversation" />

      <Card title="Private threads">
        {(data?.threads ?? []).map((t) => (
          <Pressable key={t.id} style={[ui.row, { paddingVertical: 8 }]} onPress={() => navigation.navigate('TE18', { threadId: t.id })}>
            <View style={{ flex: 1 }}>
              <Text style={ui.text}>{t.label}</Text>
              <Text style={ui.muted}>{t.detail}</Text>
            </View>
            <Text style={[ui.muted, { fontWeight: '600' }]}>{t.state}</Text>
          </Pressable>
        ))}
      </Card>

      <Card title="Start an eligible thread">
        <Select label="Child context" value="Zainab Bello" onChange={() => {}} options={[{ value: 's1', label: 'Zainab Bello' }, { value: 's2', label: 'Tunde Adewale' }]} />
        <Select label="Recipient" value="Mrs Amina Bello" onChange={() => {}} options={[{ value: 'g', label: 'Mrs Amina Bello - eligible guardian' }, { value: 'o', label: 'School Office' }, { value: 'p', label: 'Principal / authorised staff' }]} />
        <Field label="Subject *" placeholder="Absence explanation" />
      </Card>

      <Notice text="Family-thread eligibility comes from class-teacher duty and guardian relationships. A subject teacher can ask Office for help; no unrestricted parent directory." />

      <Button title="Open / start conversation" onPress={() => navigation.navigate('TE18', { threadId: 't1' })} />
      <Button title="View student context" variant="secondary" onPress={() => navigation.navigate('TE04', { studentId: 's1' })} />

      <BottomNav navigation={navigation} current="TE17" />
    </Screen>
  );
}