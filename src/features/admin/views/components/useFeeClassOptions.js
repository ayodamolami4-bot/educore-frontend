/** Live fee-plan class choices use backend class IDs, never display labels. */
import { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { AcademicStructureModel } from '../../models';

export default function useFeeClassOptions() {
  const navigation = useNavigation();
  const [options, setOptions] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    const load = () => {
      AcademicStructureModel.classes()
        .then((page) => {
          if (!alive) return;
          const items = Array.isArray(page?.items) ? page.items : [];
          setOptions(items.map((item) => ({
            value: item.id,
            label: [item.level, item.arm].filter(Boolean).join(' ') ||
              item.classLabel || 'Class',
          })));
          setError('');
        })
        .catch((reason) => {
          if (alive) setError(reason?.message ?? 'Could not load current classes.');
        });
    };
    load();
    const unsubscribe = navigation.addListener('focus', load);
    return () => {
      alive = false;
      unsubscribe?.remove?.();
    };
  }, [navigation]);

  return { options, error };
}
