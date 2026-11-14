import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, Field, Notice, Select, ui } from '../../../components/Controls';
import { BottomNav } from './BottomNav';

export function TE09AssignmentEditorScreen() {
  const navigation = useNavigation();
  const [method, setMethod] = useState('mixed');
  const [window, setWindow] = useState('open');

  return (
    <Screen title="Create or edit assignment" subtitle="Set exactly what pupils must submit." code="TE09">
      <Card title="Basics">
        <Select label="Class arm *" value="JSS1 A" onChange={() => {}} options={[{ value: 'JSS1 A', label: 'JSS1 A' }, { value: 'JSS1 B', label: 'JSS1 B' }]} />
        <Select label="Subject *" value="Mathematics" onChange={() => {}} options={[{ value: 'Mathematics', label: 'Mathematics' }]} />
        <Field label="Title *" placeholder="Fractions practice" />
        <Field label="Instructions *" placeholder="Answer questions 1-5. Show your working." multiline />
        <Notice text="Supporting file — PDF / JPG / PNG — up to 10 MB." />
      </Card>

      <Card title="Submission">
        <Select label="Submission method *" value={method} onChange={setMethod}
          options={[{ value: 'typed', label: 'Typed answer' }, { value: 'file', label: 'File upload' }, { value: 'mixed', label: 'Typed answer + file' }, { value: 'physical', label: 'Physical work - teacher records receipt' }]} />
        <Field label="Due date *" placeholder="2026-11-13" />
        <Field label="Due time (WAT) *" placeholder="18:00" />
        <Select label="Submission window" value={window} onChange={setWindow}
          options={[{ value: 'open', label: 'Accept late while open' }, { value: 'closed', label: 'Closed - no further submissions' }]} />
        <Field label="Maximum score" placeholder="20" keyboardType="numeric" />
      </Card>

      <Notice text="Late work is labelled Late while the submission window stays open. Teacher closes the window explicitly; a deadline alone does not silently close it." />

      <Button title="Preview and publish assignment" />
      <Button title="Save assignment draft" variant="secondary" />

      <BottomNav navigation={navigation} current="TE09" />
    </Screen>
  );
}