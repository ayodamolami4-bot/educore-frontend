/**
 * Admin module entry — JavaScript replacement for the old index.ts.
 *
 * Navigation mirrors the AD01 design: a bottom tab bar with
 * Home · Students · Academics · Fees · More. All 34 AD screens are
 * registered on the root stack so any screen can navigate to any other
 * (e.g. StudentListView pushes StudentProfile).
 *
 * CONTRACT: every role folder's index.js must export <role>Module —
 * the shared navigation does `import { adminModule } from '../features/admin'`.
 * The adminModule entry lives at the bottom of this same file, so there is
 * no separate module.js needed (delete module.js in this folder if present).
 */
import React from 'react';
import { Text, View, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ADMIN_SCREENS, screenComponent } from './views/screens';
import AdminScaffold from './views/components/AdminScaffold';
import { colors, typography, spacing } from './views/theme';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

/** Short descriptions for the menu cards — what each page actually does. */
const MENU_DESCRIPTIONS = {
  AD05: 'Guardians, their children and contact details',
  AD07: 'Staff, their subjects and form classes',
  AD08: 'Register a teacher or edit their profile',
  AD10: 'School profile, term dates and admin access',
  AD11: 'Term dates, key dates and today\u2019s activities',
  AD12: 'Create or rename classes, subjects and departments',
  AD13: 'One class: its roster, subjects and timetable',
  AD14: 'Fill the weekly periods for each class',
  AD15: 'Check every draft, then publish',
  AD16: "Today's registers and who to follow up",
  AD17: 'Approve or correct registers teachers sent back',
  AD18: 'Weights, pass mark and grade bands',
  AD19: 'Approve the results teachers sent in',
  AD20: 'Report batches, one learner\u2019s card, CSV export',
  AD21: 'Set the amounts, then issue the bills',
  AD22: 'Every bill, its status and payment',
  AD24: 'Payments in, checks out — the money board',
  AD26: 'Who would move up, repeat or graduate — before it is final',
  AD27: 'Confirm the previews — the step that moves the classes',
  AD28: 'Write an announcement and send it out',
  AD29: 'Conversations with staff and guardians',
  AD31: 'Guardian complaints and how each was resolved',
  AD33: 'Bring students or teachers in from a file, take data out',
  AD34: 'Every change, who made it and when',
};

/** A card menu of screens for tabs that have no single landing screen.
    Pages that need something opened first (a guardian, an invoice…) are NOT
    cards — they open from their lists, never dead-end empty. */
function MenuScreen({ adCodes }) {
  const navigation = useNavigation();
  const openable = adCodes.filter((code) => {
    const entry = ADMIN_SCREENS[code];
    return entry && entry.Component && MENU_DESCRIPTIONS[code];
  });
  return (
    <AdminScaffold
      eyebrow="Menu"
      title="Pick a page"
      subtitle="Everything on this tab — tap a card to open it."
    >
      {openable.map((code) => {
        const entry = ADMIN_SCREENS[code];
        return (
          <Pressable
            key={code}
            style={({ pressed }) => [styles.menuCard, pressed && styles.menuCardPressed]}
            onPress={() => navigation.navigate(entry.name)}
          >
            <View style={styles.menuCardBody}>
              <Text style={styles.menuTitle}>{entry.title}</Text>
              <Text style={styles.menuDesc}>{MENU_DESCRIPTIONS[code]}</Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </Pressable>
        );
      })}
    </AdminScaffold>
  );
}

function AcademicsMenu() {
  return (
    <MenuScreen
      adCodes={[
        'AD11',
        'AD12',
        'AD13',
        'AD14',
        'AD15',
        'AD16',
        'AD17',
        'AD18',
        'AD19',
        'AD20',
        'AD26',
        'AD27',
      ]}
    />
  );
}

function FeesMenu() {
  // AD23 (invoice detail) and AD25 (payment detail) open FROM a bill or a
  // payment — they have no content of their own, so they are not cards here.
  return <MenuScreen adCodes={['AD21', 'AD22', 'AD24']} />;
}

function MoreMenu() {
  // AD06/AD09 (profiles) open from their lists; AD30 (one conversation) and
  // AD32 (one complaint) open from their inboxes — same rule.
  return (
    <MenuScreen
      adCodes={['AD05', 'AD07', 'AD08', 'AD10', 'AD28', 'AD29', 'AD31', 'AD33', 'AD34']}
    />
  );
}

/** Tab icon matches the tab's function — outline when idle, filled when active. */
function tabIcon(inactive, active) {
  return function TabBarIcon({ focused, color, size }) {
    return <Ionicons name={focused ? active : inactive} size={size} color={color} />;
  };
}

function AdminTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="HomeTab"
        component={screenComponent('AD01')}
        options={{ title: 'Home', tabBarIcon: tabIcon('home-outline', 'home') }}
      />
      <Tabs.Screen
        name="StudentsTab"
        component={screenComponent('AD02')}
        options={{ title: 'Students', tabBarIcon: tabIcon('people-outline', 'people') }}
      />
      <Tabs.Screen
        name="AcademicsTab"
        component={AcademicsMenu}
        options={{ title: 'Academics', tabBarIcon: tabIcon('school-outline', 'school') }}
      />
      <Tabs.Screen
        name="FeesTab"
        component={FeesMenu}
        options={{ title: 'Fees', tabBarIcon: tabIcon('wallet-outline', 'wallet') }}
      />
      <Tabs.Screen
        name="MoreTab"
        component={MoreMenu}
        options={{
          title: 'More',
          tabBarIcon: tabIcon('ellipsis-horizontal', 'ellipsis-horizontal'),
        }}
      />
    </Tabs.Navigator>
  );
}

/**
 * The admin navigator. It renders INSIDE the app's single NavigationContainer
 * (the root container in src/navigation) — nested navigators are fine; a
 * nested NavigationContainer is not. Every AD screen is addressable by name.
 */
export function AdminNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="AdminTabs" component={AdminTabs} options={{ headerShown: false }} />
      {Object.entries(ADMIN_SCREENS).map(([code, entry]) => (
        <Stack.Screen
          key={code}
          name={entry.name}
          component={screenComponent(code)}
          options={{ title: entry.title, headerShown: false }}
        />
      ))}
      {/* Safety net: older presenters navigate to "ADxx Placeholder" names.
          Registering those names for the not-yet-built screens means a stale
          call lands on the recipe page instead of dying with a console error. */}
      {Object.entries(ADMIN_SCREENS)
        .filter(([, entry]) => !entry.Component)
        .map(([code, entry]) => (
          <Stack.Screen
            key={`${code}-placeholder-alias`}
            name={`${code} Placeholder`}
            component={screenComponent(code)}
            options={{ title: entry.title, headerShown: false }}
          />
        ))}
    </Stack.Navigator>
  );
}

/* ------------------------------------------------------------------ *
 * Role-module entry — what the shared workspace renders for ADMIN.    *
 * It mounts the whole admin app above (own tabs and own stack) as a   *
 * plain navigator inside the ROOT NavigationContainer. The context /  *
 * openShared / target props passed by RoleWorkspaceScreen are         *
 * accepted but not needed yet.                                        *
 * ------------------------------------------------------------------ */
export function AdminHomeScreen() {
  return <AdminNavigator />;
}

export default AdminNavigator;

export const adminModule = { HomeScreen: AdminHomeScreen };

const styles = StyleSheet.create({
  menuCard: {
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  menuCardPressed: { backgroundColor: colors.positive },
  menuCardBody: { flex: 1 },
  menuTitle: { ...typography.body, fontWeight: '700' },
  menuDesc: { ...typography.label, color: colors.muted, marginTop: 2 },
  menuChevron: { color: colors.muted, fontSize: 20 },
});
