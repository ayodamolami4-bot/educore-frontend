import React, { createContext, useContext } from 'react';
const Context = createContext(null);
export function ServicesProvider({ services, children }) {
  return <Context.Provider value={services}>{children}</Context.Provider>;
}
export function useServices() {
  const value = useContext(Context);
  if (!value) throw new Error('ServicesProvider missing');
  return value;
}
