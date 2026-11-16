import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../../components/Screen';
import { Button, Card, Notice, Select, ui } from '../../../components/Controls';
import { BottomNav } from './BottomNav';
import { useTeacher } from './TeacherNavigator';

export function TE05TimetableScreen() {
  const navigation = useNavigation();
  const { context, model } = useTeacher();
  const [data, setData] = useState(null);
  const [display, setDisplay] = useState('week');
  const [selectedClass, setSelectedClass] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    model.timetable(context.schoolId)
      .then((value) => {
        if (!active) return;
        setData(value);
        setSelectedClass('all');
      })
      .catch((reason) => {
        if (active) setError(reason?.message ?? 'Could not load your published timetable.');
      });
    return () => { active = false; };
  }, [model, context.schoolId]);

  const classes = data?.classes ?? [];
  const lessons = (data?.lessons ?? []).filter((item) =>
    selectedClass === 'all' || item.classId === selectedClass,
  );
  const firstAssignedClass = classes[0]?.id ?? '';

  return (
    <Screen
      title="Timetable and calendar"
      subtitle={data ? `${data.date} · ${data.timezone} · week from ${data.week || 'school timetable'}` : 'Your published lessons, exams and assigned school duties.'}
      code="TE05"
    >
      {error ? <Notice text={error} tone="error" /> : null}
      <Select
        label="Display"
        value={display}
        onChange={setDisplay}
        options={[
          { value: 'week', label: 'My combined week' },
          { value: 'class', label: 'Selected class' },
          { value: 'calendar', label: "Today's activities" },
        ]}
      />
      <Select
        label="Class filter"
        value={selectedClass}
        onChange={setSelectedClass}
        options={[
          { value: 'all', label: 'All my classes' },
          ...classes.map((item) => ({ value: item.id, label: item.label })),
        ]}
      />

      {display === 'week' ? (
        <Card title="Published weekly timetable">
          <View style={[ui.row, { paddingVertical: 4 }]}>
            <Text style={[ui.muted, { width: 60 }]}>WAT</Text>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day) => (
              <Text key={day} style={[ui.muted, { flex: 1, textAlign: 'center', fontWeight: '600' }]}>{day}</Text>
            ))}
          </View>
          {(data?.grid ?? []).map((row) => (
            <View key={row.startMinute} style={[ui.row, { paddingVertical: 6 }]}>
              <Text style={[ui.muted, { width: 60 }]}>{row.time}</Text>
              {['mon', 'tue', 'wed', 'thu', 'fri'].map((day) => (
                <Text key={day} style={[ui.text, { flex: 1, textAlign: 'center', fontSize: 11 }]}>
                  {row[day] || '—'}
                </Text>
              ))}
            </View>
          ))}
          {!data?.grid?.length ? <Text style={ui.muted}>No published weekly lessons are assigned to this teacher.</Text> : null}
          <Notice text="Only published lessons appear here. WAT times and weekday positions come from the school timetable." />
        </Card>
      ) : null}

      {display === 'class' ? (
        <Card title="Lessons for selected class">
          {lessons.map((lesson) => (
            <Pressable
              key={lesson.id}
              onPress={() => navigation.navigate('TE03', { classId: lesson.classId })}
              style={[ui.row, { paddingVertical: 8 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={ui.text}>{lesson.dayLabel} · {lesson.time}</Text>
                <Text style={ui.muted}>{lesson.subject} · {lesson.classLabel}</Text>
                {lesson.room ? <Text style={ui.muted}>Room: {lesson.room}</Text> : null}
              </View>
              <Text style={ui.muted}>Open class</Text>
            </Pressable>
          ))}
          {!lessons.length ? <Text style={ui.muted}>No published lessons match this class filter.</Text> : null}
        </Card>
      ) : null}

      {display === 'calendar' ? (
        <>
          <Card title={`School activities · ${data?.date ?? ''}`}>
            {(data?.duties ?? []).map((item) => (
              <View key={item.id} style={{ paddingVertical: 7 }}>
                <Text style={ui.text}>{item.time || 'Time not set'} · {item.title}</Text>
                <Text style={ui.muted}>{item.detail}</Text>
              </View>
            ))}
            {!data?.duties?.length ? <Text style={ui.muted}>No published teaching, examination or supervision activities are listed for today.</Text> : null}
          </Card>

          <Card title="Published examinations">
            {(data?.examinations ?? []).map((item) => (
              <View key={item.id} style={{ paddingVertical: 7 }}>
                <Text style={ui.text}>{item.date} · {item.time || 'Time not set'} · {item.title}</Text>
                <Text style={ui.muted}>{item.classLabel}{item.department ? ' · ' + item.department : ''}{item.room ? ' · ' + item.room : ''}</Text>
                <Text style={ui.muted}>{item.invigilatorName ? 'Invigilator: ' + item.invigilatorName : ''}</Text>
              </View>
            ))}
            {!data?.examinations?.length ? <Text style={ui.muted}>No upcoming published examinations were returned for your assignments.</Text> : null}
          </Card>

          <Card title="School calendar exceptions">
            {(data?.calendarExceptions ?? []).map((item) => (
              <View key={item.id} style={{ paddingVertical: 6 }}>
                <Text style={ui.text}>{item.onDate} · {item.title}</Text>
                <Text style={ui.muted}>{item.teachingDay ? 'Teaching day' : 'School closed'}</Text>
              </View>
            ))}
            {!data?.calendarExceptions?.length ? <Text style={ui.muted}>No dated school calendar exceptions are recorded for your assigned sessions.</Text> : null}
          </Card>
        </>
      ) : null}

      <Card title="Assigned classes">
        {classes.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => navigation.navigate('TE03', { classId: item.id })}
            style={[ui.row, { paddingVertical: 6 }]}
          >
            <Text style={[ui.text, { flex: 1 }]}>{item.label}</Text>
            <Text style={ui.muted}>{item.classTeacher ? 'Class teacher' : 'Subject teaching'}</Text>
          </Pressable>
        ))}
        {!classes.length ? <Text style={ui.muted}>No current class assignments were returned.</Text> : null}
      </Card>

      <Button
        title="Open an assigned class"
        onPress={() => navigation.navigate('TE03', { classId: selectedClass === 'all' ? firstAssignedClass : selectedClass })}
        disabled={!classes.length}
      />
      <Button title="View school notices" variant="secondary" onPress={() => navigation.navigate('TE16')} />

      <BottomNav navigation={navigation} current="TE05" />
    </Screen>
  );
}
