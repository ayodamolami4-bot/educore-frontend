import React, { createContext, useContext } from 'react';
import type { Services } from './services';
const Context = createContext<Services | null>(null);
export function ServicesProvider({
  services,
  children,
}: React.PropsWithChildren<{ services: Services }>) {
  return <Context.Provider value={services}>{children}</Context.Provider>;
}
export function useServices(): Services {
  const value = useContext(Context);
  if (!value) throw new Error('ServicesProvider missing');
  return value;
}
