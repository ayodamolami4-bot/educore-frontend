import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, EmptyState, Notice, Select, ui } from '../../../components/Controls';
import { BottomNav } from './BottomNav';
import { useTeacher } from './TeacherNavigator';

export function TE02ClassesScreen() {
  const navigation = useNavigation();
  const { context, model } = useTeacher();
  const [data, setData] = useState(null);
  const [view, setView] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    model.classes(context.schoolId)
      .then((value) => { if (active) setData(value); })
      .catch((reason) => { if (active) setError(reason?.message ?? 'Could not load your assigned classes.'); });
    return () => { active = false; };
  }, [model, context.schoolId]);

  const filtered = useMemo(() => (data?.items ?? []).filter((item) => {
    if (view === 'class') return item.classTeacher;
    if (view === 'subject') return !item.classTeacher || Boolean(item.detail);
    return true;
  }), [data, view]);

  return (
    <Screen title="My classes and subjects" subtitle="Only classes you actually teach or supervise." code="TE02">
      {error ? <Notice text={error} tone="error" /> : null}
      <Select
        label="Assignment view"
        value={view}
        onChange={setView}
        options={[
          { value: 'all', label: 'All my responsibilities' },
          { value: 'subject', label: 'Subject teaching' },
          { value: 'class', label: 'Class-teacher duty' },
        ]}
      />

      <Card title="Accepted assignments">
        {filtered.map((item) => (
          <Pressable
            key={item.id}
            style={[ui.row, { paddingVertical: 8 }]}
            onPress={() => navigation.navigate('TE03', { classId: item.id })}
          >
            <View style={{ flex: 1 }}>
              <Text style={ui.text}>{item.label}</Text>
              <Text style={ui.muted}>{item.detail || 'Assigned class workspace'}</Text>
            </View>
            <Text style={[ui.muted, { fontWeight: '600' }]}>{item.state}</Text>
          </Pressable>
        ))}
        {data && filtered.length === 0 ? (
          <EmptyState
            title="No matching assignments"
            description={view === 'class'
              ? 'No current class-teacher duties are assigned to this account.'
              : 'No subject-teaching assignments match this view.'}
          />
        ) : null}
        {!data && !error ? <Notice text="Loading your current school assignments…" /> : null}
      </Card>

      <Notice text="Teaching eligibility is not the same as an active class assignment. Ask School Office to correct an incorrect assignment." />
      <Button title="View my responsibilities" variant="secondary" onPress={() => navigation.navigate('TE19')} />
      <BottomNav navigation={navigation} current="TE02" />
    </Screen>
  );
}