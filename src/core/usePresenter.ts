import { useSyncExternalStore } from 'react';
import type { Store } from './Store';
export function usePresenter<T>(presenter: Store<T>): T {
  return useSyncExternalStore(presenter.subscribe, presenter.getSnapshot, presenter.getSnapshot);
}
