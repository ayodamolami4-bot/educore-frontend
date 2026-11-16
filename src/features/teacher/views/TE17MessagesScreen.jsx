import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, EmptyState, Field, Notice, Select, ui } from '../../../components/Controls';
import { BottomNav } from './BottomNav';
import { useTeacher } from './TeacherNavigator';

export function TE17MessagesScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { context, model } = useTeacher();
  const [data, setData] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(route.params?.studentId ?? '');
  const [contacts, setContacts] = useState(null);
  const [guardianId, setGuardianId] = useState('');
  const [subject, setSubject] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      model.threads(context.schoolId),
      model.threadStudents(context.schoolId),
    ]).then(([threads, roster]) => {
      if (!active) return;
      setData(threads);
      setStudents(roster);
      setSelectedStudentId((current) => {
        if (current && roster.some((student) => student.id === current)) return current;
        return route.params?.studentId && roster.some((student) => student.id === route.params.studentId)
          ? route.params.studentId
          : roster[0]?.id ?? '';
      });
    }).catch((reason) => {
      if (active) setError(reason?.message ?? 'Could not load eligible conversations and class rosters.');
    });
    return () => { active = false; };
  }, [model, context.schoolId, route.params?.studentId]);

  useEffect(() => {
    let active = true;
    setContacts(null);
    setGuardianId('');
    if (!selectedStudentId) return () => { active = false; };
    model.threadContacts(context.schoolId, selectedStudentId)
      .then((value) => {
        if (!active) return;
        setContacts(value);
        setGuardianId(value.guardians[0]?.id ?? '');
      })
      .catch((reason) => {
        if (active) setError(reason?.message ?? 'This student is not eligible for a family conversation.');
      });
    return () => { active = false; };
  }, [model, context.schoolId, selectedStudentId]);

  const openThread = (threadId) => navigation.navigate('TE18', { threadId });

  const startThread = async () => {
    if (busy) return;
    setError('');
    setNotice('');
    const selected = students.find((student) => student.id === selectedStudentId);
    if (!selected || !guardianId) {
      setError('Choose a current class-teacher student and a linked guardian with learning access.');
      return;
    }
    setBusy(true);
    try {
      const created = await model.createThread(context.schoolId, {
        studentId: selected.id,
        guardianId,
        subject,
        body: firstMessage,
      });
      if (!created?.id) throw new Error('The school did not return the new conversation.');
      setSubject('');
      setFirstMessage('');
      navigation.navigate('TE18', { threadId: created.id });
    } catch (reason) {
      setError(reason?.message ?? 'Could not start this conversation.');
    } finally {
      setBusy(false);
    }
  };

  const selected = students.find((student) => student.id === selectedStudentId);

  return (
    <Screen title="Messages inbox" subtitle="Only conversations permitted by your current class-teacher duties." code="TE17">
      {error ? <Notice text={error} tone="error" /> : null}
      {notice ? <Notice text={notice} tone="success" /> : null}

      <Card title="Private threads">
        {(data?.threads ?? []).map((thread) => (
          <Pressable
            key={thread.id}
            style={[ui.row, { paddingVertical: 8 }]}
            onPress={() => openThread(thread.id)}
          >
            <View style={{ flex: 1 }}>
              <Text style={ui.text}>{thread.label}</Text>
              <Text style={ui.muted}>{thread.detail}</Text>
            </View>
            <Text style={[ui.muted, { fontWeight: '600' }]}>{thread.state}</Text>
          </Pressable>
        ))}
        {data && data.threads.length === 0 ? (
          <EmptyState title="No conversations yet" description="Conversations opened by or with eligible families will appear here." />
        ) : null}
        {!data && !error ? <Notice text="Loading conversations…" /> : null}
      </Card>

      <Card title="Start a family conversation">
        <Select
          label="Student from your class-teacher roster"
          value={selectedStudentId}
          onChange={setSelectedStudentId}
          options={students.map((student) => ({
            value: student.id,
            label: student.name + ' · ' + student.classLabel,
          }))}
          placeholder="Choose an assigned student"
          disabled={!students.length || busy}
        />
        {contacts ? (
          <>
            <Select
              label="Linked guardian with learning access"
              value={guardianId}
              onChange={setGuardianId}
              options={contacts.guardians.map((guardian) => ({
                value: guardian.id,
                label: guardian.label,
              }))}
              placeholder="Choose an eligible guardian"
              disabled={!contacts.guardians.length || busy}
            />
            {!contacts.classTeacherAssigned ? (
              <Notice text="The school must assign a current class teacher before this family conversation can be opened." tone="warning" />
            ) : contacts.guardians.length === 0 ? (
              <Notice text="No active guardian relationship with learning access is recorded for this student." tone="warning" />
            ) : null}
          </>
        ) : selectedStudentId ? (
          <Notice text="Checking this student's current guardian permissions…" />
        ) : (
          <Notice text="Only students in classes where you are the current class teacher are listed." />
        )}
        <Field
          label="Subject"
          value={subject}
          onChangeText={setSubject}
          placeholder="e.g. Attendance follow-up"
          editable={!busy}
          maxLength={160}
        />
        <Field
          label="First message"
          value={firstMessage}
          onChangeText={setFirstMessage}
          placeholder="Write the message that will open this conversation."
          multiline
          editable={!busy}
          maxLength={8000}
        />
        <Button
          title="Start conversation"
          onPress={startThread}
          loading={busy}
          disabled={!selected || !guardianId || !contacts?.classTeacherAssigned || subject.trim().length < 3 || firstMessage.trim().length < 2}
        />
      </Card>

      {selected ? (
        <Button
          title="View selected student record"
          variant="secondary"
          onPress={() => navigation.navigate('TE04', { studentId: selected.id, classId: selected.classId })}
        />
      ) : null}

      <Notice text="Teachers can open family threads only for their current class-teacher students and linked guardians with learning access. Office and principal conversations are managed through their own workspaces." />
      <BottomNav navigation={navigation} current="TE17" />
    </Screen>
  );
}