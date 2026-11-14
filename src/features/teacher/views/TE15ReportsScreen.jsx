import React, { useState } from 'react';
import { Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, Field, Notice, Select, ui } from '../../../components/Controls';
import { BottomNav } from './BottomNav';
import { useTeacher } from './TeacherNavigator';

export function TE15ReportsScreen() {
  const navigation = useNavigation();
  const { context, model } = useTeacher();
  const [data, setData] = React.useState(null);

  React.useMemo(() => { void model.reports(context.schoolId).then(setData); }, [context.schoolId]);

  return (
    <Screen title="Teaching reports" subtitle="Export only your permitted teaching and class duties." code="TE15">
      <Select label="Report type" value="Class academic summary" onChange={() => {}} options={(data?.types ?? ['Class academic summary']).map((t) => ({ value: t, label: t }))} />
      <Select label="Session" value="2026/2027" onChange={() => {}} options={(data?.sessions ?? ['2026/2027']).map((s) => ({ value: s, label: s }))} />
      <Select label="Term" value="First Term" onChange={() => {}} options={(data?.terms ?? ['First Term']).map((t) => ({ value: t, label: t }))} />
      <Select label="Class" value="JSS1 A" onChange={() => {}} options={(data?.classes ?? ['JSS1 A']).map((c) => ({ value: c, label: c }))} />
      <Select label="Subject" value="Mathematics" onChange={() => {}} options={(data?.subjects ?? ['Mathematics']).map((s) => ({ value: s, label: s }))} />
      <Field label="From date" placeholder="Enter from date" />
      <Field label="To date" placeholder="Enter to date" />

      <Card title="Preview scope">
        <Text style={ui.muted}>Academic data: Published revision or explicitly labelled draft</Text>
        <Text style={ui.muted}>Attendance: Submitted register coverage shown</Text>
        <Text style={ui.muted}>Export generated: School / class / filters / generated time</Text>
      </Card>

      <Select label="Format" value="PDF" onChange={() => {}} options={(data?.formats ?? ['PDF']).map((f) => ({ value: f, label: f }))} />

      <Notice text="No school-wide finance, private complaints or unrelated class records. Draft reports are labelled and never shown as published family reports." />

      <Button title="Preview and export report" />
      <Button title="Refresh export status" variant="secondary" />

      <BottomNav navigation={navigation} current="TE15" />
    </Screen>
  );
}