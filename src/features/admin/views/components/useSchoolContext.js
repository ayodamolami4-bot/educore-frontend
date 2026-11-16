/**
 * Shared school banner context. Starts with the authenticated school name
 * and refreshes its official session/term details from the settings endpoint.
 */
import { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SchoolSettingsModel } from '../../models';
import { getActiveContext } from '../../api/client';

function contextBottomOf(settings) {
  if (!settings) return '';
  const session = settings.activeSession;
  const sessionLabel = session
    ? [session.name, [session.startsOn, session.endsOn].filter(Boolean).join('–')].filter(Boolean).join(' ')
    : '';
  return [sessionLabel, settings.timezone].filter(Boolean).join(' · ');
}

export default function useSchoolContext() {
  const navigation = useNavigation();
  const activeContext = getActiveContext();
  const [context, setContext] = useState({
    schoolName: activeContext.schoolName || 'School workspace',
    contextBottom: '',
  });

  useEffect(() => {
    let alive = true;
    const load = () => {
      SchoolSettingsModel.get()
        .then((result) => {
          if (!alive) return;
          const settings = result;
          if (!settings) return;
          setContext({
            schoolName: settings.schoolName || activeContext.schoolName || 'School workspace',
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
  }, [navigation, activeContext.schoolName]);

  return context;
}
