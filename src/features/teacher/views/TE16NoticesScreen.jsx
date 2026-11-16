import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, EmptyState, Field, Notice, ui } from '../../../components/Controls';
import { BottomNav } from './BottomNav';
import { useTeacher } from './TeacherNavigator';

export function TE16NoticesScreen() {
  const navigation = useNavigation();
  const { context, openShared, model } = useTeacher();
  const [data, setData] = useState(null);
  const [opened, setOpened] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    model.notices(context.schoolId)
      .then((value) => { if (active) setData(value); })
      .catch((reason) => { if (active) setError(reason?.message ?? 'Could not load published school notices.'); });
    return () => { active = false; };
  }, [model, context.schoolId]);

  const filtered = useMemo(() => (data?.items ?? []).filter((item) =>
    (item.title + ' ' + item.body + ' ' + item.scope).toLowerCase().includes(search.trim().toLowerCase())
  ), [data, search]);

  return (
    <Screen
      title={opened ? opened.title : 'School notices'}
      subtitle={opened ? 'Published school announcement' : 'Published notices addressed to your authorised school and class context.'}
      code="TE16"
    >
      {error ? <Notice text={error} tone="error" /> : null}
      {!data && !error ? <Notice text="Loading published school notices…" /> : null}

      {opened ? (
        <View>
          <Button title="Back to all notices" variant="secondary" onPress={() => setOpened(null)} />
          <Card title="Notice details">
            <Text style={ui.muted}>Audience: {opened.scope ?? 'School'}</Text>
            {opened.publishedAt ? <Text style={ui.muted}>Published: {opened.publishedAt}</Text> : null}
            <Text style={ui.text}>{opened.body}</Text>
            {opened.files?.length ? <Text style={ui.muted}>{opened.files.length} attachment(s) are linked to this notice.</Text> : null}
          </Card>
        </View>
      ) : (
        <>
          <Field
            label="Search notices"
            value={search}
            onChangeText={setSearch}
            placeholder="Search title, audience or notice text"
          />
          <Card title="Published notices">
            {filtered.map((item) => (
              <Pressable
                key={item.id}
                style={[ui.row, { paddingVertical: 8 }]}
                onPress={() => setOpened(item)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={ui.text}>{item.title}</Text>
                  <Text style={ui.muted}>{item.scope} · {item.publishedAt ?? ''}</Text>
                </View>
                <Text style={[ui.muted, { fontWeight: '600' }]}>Open</Text>
              </Pressable>
            ))}
            {data && filtered.length === 0 ? (
              <EmptyState title="No matching notices" description="Published notices available to you will appear here." />
            ) : null}
          </Card>
        </>
      )}

      <Button title="Open linked timetable" onPress={() => navigation.navigate('TE05')} />
      <Button title="Notifications" variant="secondary" onPress={() => openShared('Notifications')} />
      <BottomNav navigation={navigation} current="TE16" />
    </Screen>
  );
}