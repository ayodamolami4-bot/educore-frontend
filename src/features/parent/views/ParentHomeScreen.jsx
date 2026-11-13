import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Button, Card, EmptyState, Notice, Select, ui } from '../../../components/Controls.jsx';
import { Screen } from '../../../components/Screen.jsx';
import { useServices } from '../../../core/ServicesContext.jsx';
import { usePresenter } from '../../../core/usePresenter.js';
import { sameContext } from '../../../core/SessionStore.js';
import { canPay, canReadLearning } from '../models/ParentModel.js';
import { ParentPresenter } from '../presenters/ParentPresenter.js';

const activityNames = {
  BREAK: 'Break',
  FRIDAY_SPORTS: 'Friday sports',
  WEDNESDAY_PT: 'Physical training',
};

function schoolTime(minute) {
  return (
    String(Math.floor(minute / 60)).padStart(2, '0') + ':' + String(minute % 60).padStart(2, '0')
  );
}

export function ParentHomeScreen({ context, model, navigation, openShared }) {
  const { session } = useServices();
  const account = usePresenter(session);
  const presenter = useMemo(() => new ParentPresenter(model, session), [model, session]);
  const state = usePresenter(presenter);
  const children = account.contexts.filter((child) => child.role === 'PARENT' && child.childId);
  const current = children.findIndex((child) => sameContext(context, child));
  useEffect(() => {
    void presenter.loadHome();
  }, [presenter]);

  const schedule = state.home?.schedule;
  const currentClass = state.home?.classes.find(
    (item) =>
      schedule?.on && item.startsOn <= schedule.on && (!item.endsOn || item.endsOn >= schedule.on),
  );

  return (
    <Screen title="Parent home" subtitle={context.schoolName} code="PA01">
      <Notice text={state.error} tone="error" />
      <Card title={'Welcome, ' + account.account.displayName}>
        <Select
          label="Child and school"
          value={String(current)}
          options={children.map((child, index) => ({
            value: String(index),
            label: child.childName ?? 'Linked child',
            description: child.schoolName,
          }))}
          disabled={state.busy || !children.length}
          onChange={(index) => {
            if (index !== String(current)) void presenter.chooseChild(children[Number(index)]);
          }}
        />
        {currentClass && (
          <Text style={ui.muted}>
            {[currentClass.level + ' ' + currentClass.arm, currentClass.department]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        )}
        <Button
          title="View my children"
          variant="secondary"
          onPress={() => navigation.navigate('PA02')}
        />
        {canPay(context) && (
          <Button
            icon="wallet-outline"
            title="Fees and payments"
            onPress={() => navigation.navigate('PA10')}
          />
        )}
      </Card>
      {state.busy && !state.home && <ActivityIndicator accessibilityLabel="Loading parent home" />}
      {canReadLearning(context) && schedule && (
        <Card title="Today's schedule" subtitle={schedule.on + ' · WAT'}>
          {schedule.teachingDay && schedule.items.length ? (
            schedule.items.map((item) => (
              <View
                style={ui.row}
                key={[item.id ?? item.type, item.startMinute, item.endMinute].join(':')}
              >
                <Text style={ui.muted}>
                  {schoolTime(item.startMinute)}–{schoolTime(item.endMinute)}
                </Text>
                <Text style={[ui.text, { flex: 1 }]}>
                  {activityNames[item.type] ??
                    item.subjectName ??
                    (item.type === 'EXAM' ? 'Examination' : 'Lesson')}
                </Text>
              </View>
            ))
          ) : (
            <EmptyState
              title={
                schedule.teachingDay
                  ? 'No schedule items yet'
                  : (schedule.calendarTitle ?? 'No classes today')
              }
              icon="calendar-outline"
            />
          )}
        </Card>
      )}
      {state.home?.unavailable && (
        <Button
          title="Reload school updates"
          variant="secondary"
          loading={state.busy}
          onPress={() => void presenter.loadHome()}
        />
      )}
      {canReadLearning(context) && (
        <Card title="Your child's learning">
          <Text style={ui.muted}>Academic records published by the school for the selected child.</Text>
          <Button title="Child overview" variant="secondary" onPress={() => navigation.navigate('PA03')} />
          <Button title="Timetable and calendar" variant="secondary" onPress={() => navigation.navigate('PA04')} />
          <Button title="Learning materials and assignments" variant="secondary" onPress={() => navigation.navigate('PA05')} />
          <Button title="Attendance" variant="secondary" onPress={() => navigation.navigate('PA07')} />
          <Button title="Academic results" onPress={() => navigation.navigate('PA08')} />
        </Card>
      )}
      <Card title="Communication with school">
        <Button title="Messages" variant="secondary" onPress={() => navigation.navigate('PA13')} />
        <Button title="School notices" variant="secondary" onPress={() => navigation.navigate('PA15')} />
        <Button title="My complaints" variant="secondary" onPress={() => navigation.navigate('PA16')} />
        <Button title="Profile and relationships" variant="quiet" onPress={() => navigation.navigate('PA19')} />
      </Card>
      <Card title="School updates">
        {state.home?.notifications.map((item) => (
          <View key={item.id}>
            <Text style={ui.text}>{item.title}</Text>
            <Text style={ui.muted}>{item.safePreview}</Text>
          </View>
        ))}
        <Button
          title="Notifications"
          icon="notifications-outline"
          variant="secondary"
          onPress={() => openShared('Notifications')}
        />
        <Button title="Account settings" variant="quiet" onPress={() => openShared('Settings')} />
      </Card>
    </Screen>
  );
}
