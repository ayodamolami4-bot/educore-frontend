/**
 * StudentNavigator — the student app's home screen. A native-stack over a
 * bottom-tab bar: Home, Assignments, Results, Notices, Profile. The other
 * ST pages (My class, Learning, Timetable, Attendance, Assignment detail,
 * Report card, Notice detail) are pushed onto the stack from the tabs.
 *
 * The signed-in student's id comes from the session context (the demo
 * transport adds `studentId` to the STUDENT context). If no studentId is on
 * the context we fall back to 1 (the demo's Amara Okafor) so the student app
 * is explorable in demo mode without a real session.
 */
import React, { useMemo } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useServices } from '../../../core/ServicesContext';
import { colors, typography } from './theme';

import StudentHomeScreen from './screens/StudentHomeScreen';
import MyClassScreen from './screens/MyClassScreen';
import LearningScreen from './screens/LearningScreen';
import TimetableScreen from './screens/TimetableScreen';
import AssignmentsScreen from './screens/AssignmentsScreen';
import AssignmentDetailScreen from './screens/AssignmentDetailScreen';
import ReportsScreen from './screens/ReportsScreen';
import AttendanceScreen from './screens/AttendanceScreen';
import NoticesScreen from './screens/NoticesScreen';
import ProfileScreen from './screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function studentIdFromSession(services) {
  // The session context for a STUDENT role carries the learner id. The demo
  // transport seeds it as 1 (Amara Okafor) so the student app shares the
  // admin demo roster. When the real backend is wired, the identity →
  // academics linkage returns the learner id on the context.
  const ctx =
    services &&
    services.session &&
    services.session.getSnapshot &&
    services.session.getSnapshot().context;
  if (ctx && ctx.studentId != null) return ctx.studentId;
  return 1;
}

function HomeStack() {
  const services = useServices();
  const studentId = useMemo(() => studentIdFromSession(services), [services]);
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={StudentHomeScreen} initialParams={{ studentId }} />
      <Stack.Screen name="MyClass" component={MyClassScreen} />
      <Stack.Screen name="Learning" component={LearningScreen} />
      <Stack.Screen name="Timetable" component={TimetableScreen} />
      <Stack.Screen name="Attendance" component={AttendanceScreen} />
    </Stack.Navigator>
  );
}

function AssignmentsStack() {
  const services = useServices();
  const studentId = useMemo(() => studentIdFromSession(services), [services]);
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="Assignments"
        component={AssignmentsScreen}
        initialParams={{ studentId }}
      />
      <Stack.Screen name="AssignmentDetail" component={AssignmentDetailScreen} />
    </Stack.Navigator>
  );
}

function ReportsStack() {
  const services = useServices();
  const studentId = useMemo(() => studentIdFromSession(services), [services]);
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Reports" component={ReportsScreen} initialParams={{ studentId }} />
    </Stack.Navigator>
  );
}

function NoticesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Notices" component={NoticesScreen} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  const services = useServices();
  const studentId = useMemo(() => studentIdFromSession(services), [services]);
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Profile" component={ProfileScreen} initialParams={{ studentId }} />
    </Stack.Navigator>
  );
}

export default function StudentNavigator({ navigation: _navigation }) {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { ...typography.label, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="HomeTab"
        component={HomeStack}
        options={{ title: 'Home', tabBarIcon: () => null }}
      />
      <Tabs.Screen
        name="AssignmentsTab"
        component={AssignmentsStack}
        options={{ title: 'Tasks', tabBarIcon: () => null }}
      />
      <Tabs.Screen
        name="ReportsTab"
        component={ReportsStack}
        options={{ title: 'Results', tabBarIcon: () => null }}
      />
      <Tabs.Screen
        name="NoticesTab"
        component={NoticesStack}
        options={{ title: 'Notices', tabBarIcon: () => null }}
      />
      <Tabs.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{ title: 'Profile', tabBarIcon: () => null }}
      />
    </Tabs.Navigator>
  );
}
