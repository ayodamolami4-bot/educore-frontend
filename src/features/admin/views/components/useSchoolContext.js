/**
 * useSchoolContext — the LIVE school name + session/term label every admin
 * screen shows in its banner. Falls back to the seeded "Greenfield Secondary"
 * defaults while the first load is in flight (or if it fails), so every screen
 * renders before the network answers and never goes blank.
 *
 * Why a hook: AdminScaffold hard-coded "Greenfield Secondary" as a default, so
 * changing the school name in AD10 never reached the banner on any other
 * screen. The screens do not pass the name down; a single hook that reads the
 * settings once and refreshes on focus is the fix that touches every screen.
 */
import { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SchoolSettingsModel } from '../../models';

const FALLBACK = {
  schoolName: 'Greenfield Secondary',
  contextBottom: '2026/2027 · First Term',
};

function contextBottomOf(settings) {
  if (!settings) return FALLBACK.contextBottom;
  // The settings store "2026-2027" + "First Term"; the banner shows the
  // "2026/2027 · First Term" shape the seed used everywhere.
  const session = String(settings.sessionLabel || '').replace('-', '/');
  const term = settings.termLabel || '';
  return [session, term].filter(Boolean).join(' · ') || FALLBACK.contextBottom;
}

export default function useSchoolContext() {
  const navigation = useNavigation();
  const [context, setContext] = useState(FALLBACK);

  useEffect(() => {
    let alive = true;
    const load = () => {
      SchoolSettingsModel.get()
        .then((result) => {
          if (!alive) return;
          const settings = result && result.settings;
          if (!settings) return;
          setContext({
            schoolName: settings.schoolName || FALLBACK.schoolName,
            contextBottom: contextBottomOf(settings),
          });
        })
        .catch(() => {}); // keep the fallback — the banner still shows
    };
    load();
    // The banner must follow a name change made on AD10 the moment the office
    // comes back to any other screen, so refresh on focus.
    const unsubscribe = navigation.addListener('focus', load);
    return () => {
      alive = false;
      unsubscribe?.remove?.();
    };
  }, [navigation]);

  return context;
}
