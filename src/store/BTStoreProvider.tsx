import React, { createContext, useContext, useRef } from 'react';
import { useStore } from 'zustand';
import { createBTStore, defaultBTStore } from './btStore';
import type { BTStore, BTStoreApi } from './btStore';

type BTStoreProviderProps = {
  children: React.ReactNode;
  store?: BTStoreApi;
  storageKey?: string;
};

const BTStoreContext = createContext<BTStoreApi | null>(null);

export const BTStoreProvider: React.FC<BTStoreProviderProps> = ({
  children,
  store,
  storageKey,
}) => {
  const storeRef = useRef<BTStoreApi>(store ?? createBTStore(storageKey));

  return <BTStoreContext.Provider value={storeRef.current}>{children}</BTStoreContext.Provider>;
};

export const useBTStoreApi = (): BTStoreApi => {
  return useContext(BTStoreContext) ?? defaultBTStore;
};

export function useBTStore(): BTStore;
export function useBTStore<T>(selector: (state: BTStore) => T): T;
export function useBTStore<T>(selector?: (state: BTStore) => T) {
  const store = useBTStoreApi();
  return useStore(store, selector ?? ((state) => state as T));
}
