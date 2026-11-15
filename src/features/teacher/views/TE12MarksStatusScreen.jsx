import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, Notice, ui } from '../../../components/Controls';
import { BottomNav } from './BottomNav';
import { useTeacher } from './TeacherNavigator';

export function TE12MarksStatusScreen() {
  const navigation = useNavigation();
  const { context, model } = useTeacher();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    model.marksPackages(context.schoolId)
      .then((value) => { if (active) setData(value); })
      .catch((reason) => {
        if (active) setError(reason?.message ?? 'Could not load the teacher assessment packages.');
      });
    return () => { active = false; };
  }, [model, context.schoolId]);

  const firstPackage = data?.packages?.[0] ?? null;
  const firstClassReport = data?.classReports?.[0] ?? data?.classReport ?? null;

  return (
    <Screen
      title="Marks and submission status"
      subtitle="Only your assigned subject sheets and class-teacher reports are shown."
      code="TE12"
    >
      {error ? <Notice text={error} tone="error" /> : null}

      <Card title="Subject mark packages">
        {(data?.packages ?? []).map((item) => (
          <Pressable
            key={item.id}
            style={[ui.row, { paddingVertical: 8 }]}
            onPress={() => navigation.navigate('TE13', {
              cycleId: item.cycleId,
              assignmentId: item.assignmentId,
            })}
          >
            <View style={{ flex: 1 }}>
              <Text style={ui.text}>{item.label}</Text>
              <Text style={ui.muted}>{item.detail}</Text>
            </View>
            <Text style={[ui.muted, { fontWeight: '600' }]}>{item.state}</Text>
          </Pressable>
        ))}
        {!data?.packages?.length && !error ? (
          <Text style={ui.muted}>No assessment sheets are currently assigned to this teacher.</Text>
        ) : null}
      </Card>

      <Card title="Class-teacher responsibility">
        {(data?.classReports ?? (data?.classReport ? [data.classReport] : [])).map((item) => (
          <Pressable
            key={item.id ?? item.cycleId}
            style={[ui.row, { paddingVertical: 8 }]}
            onPress={() => navigation.navigate('TE14', {
              classId: item.classId,
              cycleId: item.cycleId,
            })}
          >
            <View style={{ flex: 1 }}>
              <Text style={ui.text}>{item.label}</Text>
              <Text style={ui.muted}>{item.detail}</Text>
            </View>
            <Text style={[ui.muted, { fontWeight: '600' }]}>{item.state}</Text>
          </Pressable>
        ))}
        {!data?.classReports?.length && !data?.classReport ? (
          <Text style={ui.muted}>No current class-teacher report cycle is assigned.</Text>
        ) : null}
      </Card>

      <Notice text="Subject score sheets and class-teacher report remarks are separate workflows. The backend checks marks, ratings and completeness before submission; this app does not calculate official grades." />

      <Button
        title="Enter or review scores"
        disabled={!firstPackage}
        onPress={() => firstPackage && navigation.navigate('TE13', {
          cycleId: firstPackage.cycleId,
          assignmentId: firstPackage.assignmentId,
        })}
      />
      <Button
        title="Prepare class reports"
        variant="secondary"
        disabled={!firstClassReport}
        onPress={() => firstClassReport && navigation.navigate('TE14', {
          classId: firstClassReport.classId,
          cycleId: firstClassReport.cycleId,
        })}
      />

      <BottomNav navigation={navigation} current="TE12" />
    </Screen>
  );
}
