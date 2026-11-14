import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../../theme/tokens';

const ITEMS = [
  { key: 'home', label: 'Home', icon: 'home-outline', activeIcon: 'home', route: 'TE01' },
  { key: 'classes', label: 'Classes', icon: 'people-outline', activeIcon: 'people', route: 'TE02' },
  { key: 'work', label: 'Work', icon: 'briefcase-outline', activeIcon: 'briefcase', route: 'TE08' },
  { key: 'timetable', label: 'Timetable', icon: 'calendar-outline', activeIcon: 'calendar', route: 'TE05' },
  { key: 'more', label: 'More', icon: 'menu-outline', activeIcon: 'menu', route: 'TE19' },
];

function routeToKey(route) {
  if (!route) return 'home';
  if (route === 'TE01') return 'home';
  if (['TE02', 'TE03', 'TE04'].includes(route)) return 'classes';
  if (['TE08', 'TE09', 'TE10', 'TE11', 'TE12', 'TE13', 'TE14', 'TE15'].includes(route)) return 'work';
  if (route === 'TE05') return 'timetable';
  return 'more';
}

export function BottomNav({ navigation, current }) {
  const activeKey = routeToKey(current);
  return (
    <View style={styles.bar}>
      {ITEMS.map((item) => {
        const active = item.key === activeKey;
        return (
          <Pressable
            key={item.key}
            style={styles.item}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => navigation.navigate(item.route)}
          >
            <Ionicons name={active ? item.activeIcon : item.icon} size={22} color={active ? colors.primary : colors.muted} />
            <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
    paddingTop: 8,
    paddingBottom: 6,
  },
  item: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 4, minHeight: 48 },
  label: { fontSize: 11, color: colors.muted },
  labelActive: { color: colors.primary, fontWeight: '600' },
});