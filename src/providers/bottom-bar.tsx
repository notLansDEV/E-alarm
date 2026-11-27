import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren, type ReactNode } from 'react';

type BottomBarContextValue = {
  override: ReactNode | null;
  setOverride: (node: ReactNode | null) => void;
};

const BottomBarContext = createContext<BottomBarContextValue | null>(null);

export function BottomBarProvider({ children }: PropsWithChildren) {
  const [override, setOverrideState] = useState<ReactNode | null>(null);
  const setOverride = useCallback((node: ReactNode | null) => setOverrideState(node), []);
  const value = useMemo(() => ({ override, setOverride }), [override, setOverride]);
  return <BottomBarContext.Provider value={value}>{children}</BottomBarContext.Provider>;
}

export function useBottomBar() {
  const ctx = useContext(BottomBarContext);
  if (!ctx) throw new Error('useBottomBar must be used within BottomBarProvider');
  return ctx;
}
