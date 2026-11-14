import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, Field, Notice, Select, ui } from '../../../components/Controls';
import { BottomNav } from './BottomNav';
import { useTeacher } from './TeacherNavigator';

export function TE11ReviewSubmissionScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { assignmentId, studentId } = route.params ?? { assignmentId: 'as1', studentId: 'su1' };
  const { context, model } = useTeacher();
  const [data, setData] = useState(null);
  const [outcome, setOutcome] = useState('release');

  useMemo(() => { void model.submission(context.schoolId, assignmentId, studentId).then(setData); }, [context.schoolId, assignmentId, studentId]);

  return (
    <Screen title="Review student submission" subtitle="Zainab Bello - Fractions practice - Version 1." code="TE11">
      <Card title="Accepted submission">
        <Text style={ui.muted}>Submitted: {data?.submitted}</Text>
        <Text style={ui.muted}>Status: {data?.status}</Text>
        <Text style={ui.muted}>Version: {data?.version}</Text>
        <Text style={ui.muted}>Physical receipt: {data?.receipt}</Text>
      </Card>

      <Card title="Submitted content">
        {(data?.content ?? []).map((c, i) => (
          <View key={i} style={{ paddingVertical: 4 }}>
            <Text style={ui.muted}>{c.type}</Text>
            <Text style={ui.text}>{c.detail}</Text>
          </View>
        ))}
      </Card>

      <Card title="Review and apply outcome">
        <Select label="Submission version" value="v1" onChange={() => {}} options={[{ value: 'v1', label: 'Version 1' }]} />
        <Field label={`Score / ${data?.maxScore ?? 20}`} placeholder="16" keyboardType="numeric" />
        <Field label="Feedback" placeholder="Good method. Recheck your final answer for question 4." multiline />
        <Notice text="Feedback attachment — PDF / JPG / PNG — up to 10 MB." />
        <Select label="Review outcome" value={outcome} onChange={setOutcome}
          options={[{ value: 'save', label: 'Save review draft' }, { value: 'release', label: 'Release feedback' }, { value: 'return', label: 'Return for resubmission' }]} />
        <Field label="Return / resubmission instructions" placeholder="Enter return / resubmission instructions" />
      </Card>

      <Notice text="Released feedback is visible to the pupil and authorised guardian." />

      <Button title="Review and apply outcome" />
      <Button title="Back to class submissions" variant="secondary" onPress={() => navigation.navigate('TE10', { assignmentId })} />

      <BottomNav navigation={navigation} current="TE11" />
    </Screen>
  );
}