import { useSyncExternalStore } from 'react';
export function usePresenter(presenter) {
  return useSyncExternalStore(presenter.subscribe, presenter.getSnapshot, presenter.getSnapshot);
}
