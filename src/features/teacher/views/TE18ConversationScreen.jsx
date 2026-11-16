import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, Field, Notice, ui } from '../../../components/Controls';
import { BottomNav } from './BottomNav';
import { useTeacher } from './TeacherNavigator';

export function TE18ConversationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const threadId = route.params?.threadId;
  const { context, model } = useTeacher();
  const [data, setData] = useState(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    await Promise.resolve();
    if (!threadId) {
      setError('Open a conversation from the messages inbox first.');
      return;
    }
    setError('');
    try {
      const value = await model.thread(context.schoolId, threadId);
      setData(value);
      void model.readThread(context.schoolId, threadId).catch(() => {});
    } catch (reason) {
      setError(reason?.message ?? 'Could not open this conversation.');
    }
  };

  useEffect(() => { void load(); }, [model, context.schoolId, threadId]);

  const sendReply = async () => {
    if (!data || busy) return;
    setError('');
    setNotice('');
    if (data.state !== 'OPEN') {
      setError('This conversation is closed and cannot receive replies.');
      return;
    }
    if (reply.trim().length < 2) {
      setError('Write a message before sending.');
      return;
    }
    setBusy(true);
    try {
      await model.sendMessage(context.schoolId, data, reply);
      setReply('');
      const fresh = await model.thread(context.schoolId, threadId);
      setData(fresh);
      setNotice('Your message was sent.');
    } catch (reason) {
      setError(reason?.message ?? 'Could not send the reply. Check the conversation version and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title={data?.thread ?? 'Conversation'}
      subtitle={data ? [data.child, data.classArm, data.state].filter(Boolean).join(' · ') : 'Private school conversation'}
      code="TE18"
    >
      {error ? <Notice text={error} tone="error" /> : null}
      {notice ? <Notice text={notice} tone="success" /> : null}
      {!data && !error ? <Notice text="Loading conversation…" /> : null}

      {data ? (
        <>
          <Card title="Private participants">
            <Text style={ui.muted}>School: {data.school}</Text>
            {data.child ? <Text style={ui.muted}>Student: {data.child} · {data.classArm}</Text> : null}
            <Text style={ui.muted}>Participants: {data.participants}</Text>
            <Text style={ui.muted}>Conversation state: {data.state}</Text>
          </Card>

          <Card title="Messages">
            {(data.messages ?? []).map((message) => (
              <View key={message.id} style={{ paddingVertical: 8 }}>
                <Text style={[ui.text, { fontWeight: '600' }]}>{message.author}</Text>
                <Text style={ui.text}>{message.text}</Text>
                <Text style={ui.muted}>{message.time}</Text>
              </View>
            ))}
            {data.messages?.length === 0 ? <Text style={ui.muted}>No messages have been recorded.</Text> : null}
          </Card>

          <Card title="Reply">
            <Field
              label="Message"
              value={reply}
              onChangeText={setReply}
              placeholder="Write your reply"
              multiline
              editable={!busy && data.state === 'OPEN'}
              maxLength={8000}
            />
            <Button
              title="Send reply"
              onPress={sendReply}
              loading={busy}
              disabled={data.state !== 'OPEN' || reply.trim().length < 2}
            />
          </Card>

          <Button
            title="Open pupil learning record"
            variant="secondary"
            disabled={!data.studentId || !data.classId}
            onPress={() => navigation.navigate('TE04', { studentId: data.studentId, classId: data.classId })}
          />
        </>
      ) : null}

      <BottomNav navigation={navigation} current="TE18" />
    </Screen>
  );
}