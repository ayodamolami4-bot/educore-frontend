import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, Notice, ui } from '../../../components/Controls';
import { BottomNav } from './BottomNav';
import { useTeacher } from './TeacherNavigator';

export function TE01HomeScreen() {
  const navigation = useNavigation();
  const { context, openShared, model } = useTeacher();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void model.dashboard(context.schoolId)
      .then((d) => { if (active) setData(d); })
      .catch((reason) => { if (active) setError(reason?.message ?? 'Could not load your teacher workspace.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [model, context.schoolId]);

  return (
    <Screen title="Teacher home" subtitle="Subject teaching and class-teacher duties in one account." code="TE01">
      <Card title={data?.greeting ?? 'Teacher'} subtitle={data?.today ?? context.schoolName}>
        {loading ? (
          <Notice text="Loading this school's records…" />
        ) : (
          <View style={ui.row}>
            {data.summary.map((s) => (
              <View key={s.label} style={{ flex: 1 }}>
                <Text style={ui.muted}>{s.label}</Text>
                <Text style={ui.text}>{s.value}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      {error ? <Notice text={error} tone="error" /> : null}

      <Card title="Today and next actions">
        {(data?.actions ?? []).map((a) => (
          <View key={a.id} style={[ui.row, { paddingVertical: 6 }]}>
            <Text style={[ui.muted, { width: 50 }]}>{a.time}</Text>
            <View style={{ flex: 1 }}>
              <Text style={ui.text}>{a.title}</Text>
              <Text style={ui.muted}>{a.detail}</Text>
            </View>
            <Text style={[ui.muted, { fontWeight: '600' }]}>{a.tag}</Text>
          </View>
        ))}
        <Notice text="A subject teacher sees class-report actions only when assigned as that class teacher." />
      </Card>

      <Button title="Open my classes" onPress={() => navigation.navigate('TE02')} />
      <Button title="Notifications" variant="secondary" onPress={() => openShared('Notifications')} />

      <BottomNav navigation={navigation} current="TE01" />
    </Screen>
  );
}