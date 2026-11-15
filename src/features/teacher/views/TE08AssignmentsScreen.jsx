import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, Field, Notice, Select, ui } from '../../../components/Controls';
import { BottomNav } from './BottomNav';
import { useTeacher } from './TeacherNavigator';

export function TE08AssignmentsScreen() {
  const navigation = useNavigation();
  const { context, model } = useTeacher();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    model.assignments(context.schoolId)
      .then((value) => { if (active) setData(value); })
      .catch((reason) => { if (active) setError(reason?.message ?? 'Could not load assignments.'); });
    return () => { active = false; };
  }, [model, context.schoolId]);

  const filtered = useMemo(() => (data?.items ?? []).filter((item) => {
    const state = String(item.state ?? '').toUpperCase();
    const statusMatch = status === 'all'
      || (status === 'draft' && state === 'DRAFT')
      || (status === 'open' && state === 'PUBLISHED')
      || (status === 'closed' && state === 'CLOSED')
      || (status === 'archived' && state === 'ARCHIVED');
    return statusMatch && String(item.title ?? '').toLowerCase().includes(search.trim().toLowerCase());
  }), [data, status, search]);

  return (
    <Screen title="Assignments" subtitle="Published work, drafts and review queues." code="TE08">
      {error ? <Notice text={error} tone="error" /> : null}
      <Select
        label="Status"
        value={status}
        onChange={setStatus}
        options={[
          { value: 'all', label: 'All assignments' },
          { value: 'draft', label: 'Draft' },
          { value: 'open', label: 'Published - open' },
          { value: 'closed', label: 'Closed' },
          { value: 'archived', label: 'Archived' },
        ]}
      />
      <Field label="Search assignment" value={search} onChangeText={setSearch} placeholder="Search by title" />

      <Card title="Assignments">
        {filtered.map((item) => (
          <Pressable key={item.id} style={[ui.row, { paddingVertical: 8 }]} onPress={() => navigation.navigate('TE10', { assignmentId: item.id })}>
            <View style={{ flex: 1 }}>
              <Text style={ui.text}>{item.title}</Text>
              <Text style={ui.muted}>{item.detail}</Text>
            </View>
            <Text style={[ui.muted, { fontWeight: '600' }]}>{item.state}</Text>
          </Pressable>
        ))}
        {!filtered.length ? <Text style={ui.muted}>No assignments match this filter.</Text> : null}
      </Card>

      <Notice text="Teacher assignment feedback and internal term assessment are separate records. An assignment score is not automatically a CA mark." />

      <Button title="Create assignment" onPress={() => navigation.navigate('TE09')} />
      <Button
        title="Review submissions"
        variant="secondary"
        disabled={!filtered.length}
        onPress={() => navigation.navigate('TE10', { assignmentId: filtered[0]?.id })}
      />

      <BottomNav navigation={navigation} current="TE08" />
    </Screen>
  );
}
