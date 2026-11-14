import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, Field, Notice, ui } from '../../../components/Controls';
import { BottomNav } from './BottomNav';
import { useTeacher } from './TeacherNavigator';

export function TE18ConversationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const threadId = route.params?.threadId ?? 't1';
  const { context, model } = useTeacher();
  const [data, setData] = useState(null);

  useMemo(() => { void model.thread(context.schoolId, threadId).then(setData); }, [context.schoolId, threadId]);

  return (
    <Screen title="Conversation" subtitle="Zainab Bello - Mrs Bello and class teacher." code="TE18">
      <Card title="Private participants">
        <Text style={ui.muted}>School / child: {data?.school} - {data?.child} - {data?.classArm}</Text>
        <Text style={ui.muted}>Participants: {data?.participants}</Text>
        <Text style={ui.muted}>Thread: {data?.thread}</Text>
      </Card>

      <Card title="Messages">
        {(data?.messages ?? []).map((m) => (
          <View key={m.id} style={{ paddingVertical: 6 }}>
            <Text style={[ui.text, { fontWeight: '600' }]}>{m.author}</Text>
            <Text style={ui.text}>{m.text}</Text>
            <Text style={ui.muted}>{m.time}</Text>
          </View>
        ))}
      </Card>

      <Card title="Reply">
        <Field label="Reply *" placeholder="Enter reply" multiline />
        <Notice text="Attachment — PDF / JPG / PNG — up to 10 MB. Show sending / accepted / failed states on each message." />
      </Card>

      <Button title="Send reply" />
      <Button title="Open pupil learning record" variant="secondary" onPress={() => navigation.navigate('TE04', { studentId: 's1' })} />

      <BottomNav navigation={navigation} current="TE18" />
    </Screen>
  );
}