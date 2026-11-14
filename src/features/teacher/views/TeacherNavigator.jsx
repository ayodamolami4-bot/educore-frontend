import React, { createContext, useContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TeacherModel } from '../models/TeacherModel';
import { useServices } from '../../../core/ServicesContext';

import { TE01HomeScreen } from './TE01HomeScreen';
import { TE02ClassesScreen } from './TE02ClassesScreen';
import { TE03ClassWorkspaceScreen } from './TE03ClassWorkspaceScreen';
import { TE04StudentProfileScreen } from './TE04StudentProfileScreen';
import { TE05TimetableScreen } from './TE05TimetableScreen';
import { TE06AttendanceCentreScreen } from './TE06AttendanceCentreScreen';
import { TE07DailyRegisterScreen } from './TE07DailyRegisterScreen';
import { TE08AssignmentsScreen } from './TE08AssignmentsScreen';
import { TE09AssignmentEditorScreen } from './TE09AssignmentEditorScreen';
import { TE10AssignmentSubmissionsScreen } from './TE10AssignmentSubmissionsScreen';
import { TE11ReviewSubmissionScreen } from './TE11ReviewSubmissionScreen';
import { TE12MarksStatusScreen } from './TE12MarksStatusScreen';
import { TE13EnterScoresScreen } from './TE13EnterScoresScreen';
import { TE14ClassReportScreen } from './TE14ClassReportScreen';
import { TE15ReportsScreen } from './TE15ReportsScreen';
import { TE16NoticesScreen } from './TE16NoticesScreen';
import { TE17MessagesScreen } from './TE17MessagesScreen';
import { TE18ConversationScreen } from './TE18ConversationScreen';
import { TE19ProfileScreen } from './TE19ProfileScreen';

const Stack = createNativeStackNavigator();

const TeacherCtx = createContext(null);
export const useTeacher = () => useContext(TeacherCtx);

export function TeacherNavigator({ context, openShared, target }) {
  const services = useServices();
  const model = new TeacherModel(services.client);
  const value = { context, openShared, target, services, model };
  return (
    <TeacherCtx.Provider value={value}>
      <Stack.Navigator initialRouteName="TE01" screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F4F7F8' } }}>
        <Stack.Screen name="TE01" component={TE01HomeScreen} />
        <Stack.Screen name="TE02" component={TE02ClassesScreen} />
        <Stack.Screen name="TE03" component={TE03ClassWorkspaceScreen} />
        <Stack.Screen name="TE04" component={TE04StudentProfileScreen} />
        <Stack.Screen name="TE05" component={TE05TimetableScreen} />
        <Stack.Screen name="TE06" component={TE06AttendanceCentreScreen} />
        <Stack.Screen name="TE07" component={TE07DailyRegisterScreen} />
        <Stack.Screen name="TE08" component={TE08AssignmentsScreen} />
        <Stack.Screen name="TE09" component={TE09AssignmentEditorScreen} />
        <Stack.Screen name="TE10" component={TE10AssignmentSubmissionsScreen} />
        <Stack.Screen name="TE11" component={TE11ReviewSubmissionScreen} />
        <Stack.Screen name="TE12" component={TE12MarksStatusScreen} />
        <Stack.Screen name="TE13" component={TE13EnterScoresScreen} />
        <Stack.Screen name="TE14" component={TE14ClassReportScreen} />
        <Stack.Screen name="TE15" component={TE15ReportsScreen} />
        <Stack.Screen name="TE16" component={TE16NoticesScreen} />
        <Stack.Screen name="TE17" component={TE17MessagesScreen} />
        <Stack.Screen name="TE18" component={TE18ConversationScreen} />
        <Stack.Screen name="TE19" component={TE19ProfileScreen} />
      </Stack.Navigator>
    </TeacherCtx.Provider>
  );
}