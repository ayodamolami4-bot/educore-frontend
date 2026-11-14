import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, Field, Notice, Select, ui } from '../../../components/Controls';
import { BottomNav } from './BottomNav';
import { useTeacher } from './TeacherNavigator';
import { useTeacher as _ } from './TeacherNavigator'; // keep tree-shake friendly

export function TE16NoticesScreen() {
  const navigation = useNavigation();
  const { context, openShared, model } = useTeacher();
  const [data, setData] = useState(null);

  useMemo(() => { void model.notices(context.schoolId).then(setData); }, [context.schoolId]);

  return (
    <Screen title="School notices" subtitle="Published notices addressed to you." code="TE16">
      <Select label="Notice view" value="all" onChange={() => {}}
        options={[{ value: 'all', label: 'All notices' }, { value: 'unread', label: 'Unread' }, { value: 'calendar', label: 'School calendar' }, { value: 'mine', label: 'My classes' }]} />
      <Field label="Search notices" placeholder="Enter search notices" />

      <Card title="Notices">
        {(data?.items ?? []).map((n) => (
          <Pressable key={n.id} style={[ui.row, { paddingVertical: 8 }]}>
            <View style={{ flex: 1 }}>
              <Text style={ui.text}>{n.title}</Text>
              <Text style={ui.muted}>{n.detail}</Text>
            </View>
            <Text style={[ui.muted, { fontWeight: '600' }]}>{n.state}</Text>
          </Pressable>
        ))}
      </Card>

      <Card title="Opened notice">
        <Text style={ui.muted}>Audience: {data?.opened?.audience}</Text>
        <Text style={ui.muted}>Published: {data?.opened?.published}</Text>
        <Text style={ui.muted}>Attachment: {data?.opened?.attachment}</Text>
      </Card>

      <Button title="Open linked timetable" onPress={() => navigation.navigate('TE05')} />
      <Button title="Notifications" variant="secondary" onPress={() => openShared('Notifications')} />

      <BottomNav navigation={navigation} current="TE16" />
    </Screen>
  );
}