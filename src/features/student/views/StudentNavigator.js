/**
 * StudentNavigator — the student app's home screen. A native-stack over a
 * bottom-tab bar: Home, Assignments, Results, Notices, Profile. The other
 * ST pages (My class, Learning, Timetable, Attendance, Assignment detail,
 * Report card, Notice detail) are pushed onto the stack from the tabs.
 *
 * The signed-in student's id comes from the selected school context in demo
 * mode, or from the authenticated STUDENT dashboard in live mode. Never
 * substitute a demo or sequential ID for a real learner identity.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useServices } from '../../../core/ServicesContext';
import { api, configureRoleApi } from '../../admin/api/client';
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
const StudentIdentityContext = createContext(null);

function HomeStack() {
  const studentId = useContext(StudentIdentityContext);
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
  const studentId = useContext(StudentIdentityContext);
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
  const studentId = useContext(StudentIdentityContext);
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
  const studentId = useContext(StudentIdentityContext);
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Profile" component={ProfileScreen} initialParams={{ studentId }} />
    </Stack.Navigator>
  );
}

export default function StudentNavigator({ navigation: _navigation }) {
  const services = useServices();
  configureRoleApi(services);

  const context = services.session.getSnapshot().context;
  const contextKey = `${context?.schoolId ?? ''}:${context?.role ?? ''}`;
  const [identity, setIdentity] = useState({
    key: '',
    studentId: null,
    error: '',
  });

  const studentId = services.config.demo
    ? context?.studentId ?? null
    : identity.key === contextKey ? identity.studentId : null;

  const identityError =
    !context?.schoolId || context.role !== 'STUDENT'
      ? 'No authorised student school context is selected.'
      : services.config.demo && context.studentId == null
        ? 'The demo student identity is unavailable.'
        : identity.key === contextKey ? identity.error : '';

  useEffect(() => {
    let active = true;

    if (!context?.schoolId || context.role !== 'STUDENT' || services.config.demo) {
      return () => { active = false; };
    }

    api.get('dashboard', null, {})
      .then((payload) => {
        if (payload?.role !== 'STUDENT' || !payload.studentId) {
          throw new Error('The backend did not return the signed-in student identity.');
        }
        if (active) {
          setIdentity({ key: contextKey, studentId: payload.studentId, error: '' });
        }
      })
      .catch((error) => {
        if (active) {
          setIdentity({
            key: contextKey,
            studentId: null,
            error: error?.message || 'Could not verify the signed-in student.',
          });
        }
      });

    return () => { active = false; };
  }, [services, context?.schoolId, context?.role, contextKey]);

  if (identityError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text>{identityError}</Text>
      </View>
    );
  }

  if (studentId == null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <ActivityIndicator />
        <Text>Loading your student account...</Text>
      </View>
    );
  }

  return (
    <StudentIdentityContext.Provider value={studentId}>
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
    </StudentIdentityContext.Provider>
  );
}
