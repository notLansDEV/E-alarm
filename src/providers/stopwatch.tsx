import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';

export type Lap = { id: string; lapMs: number; totalMs: number };

type StopwatchContextValue = {
  elapsedMs: number;
  running: boolean;
  laps: Lap[];
  start: () => void;
  pause: () => void;
  reset: () => void;
  lap: () => void;
};

const StopwatchContext = createContext<StopwatchContextValue | null>(null);

export function StopwatchProvider({ children }: PropsWithChildren) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<Lap[]>([]);
  const startRef = useRef<number | null>(null);
  const baseRef = useRef(0);
  const lastLapTotalRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      if (startRef.current == null) return;
      setElapsedMs(baseRef.current + (Date.now() - startRef.current));
    }, 31);
    return () => clearInterval(id);
  }, [running]);

  const start = useCallback(() => {
    if (startRef.current != null) return;
    startRef.current = Date.now();
    setRunning(true);
  }, []);

  const pause = useCallback(() => {
    if (startRef.current != null) {
      baseRef.current += Date.now() - startRef.current;
      startRef.current = null;
    }
    setElapsedMs(baseRef.current);
    setRunning(false);
  }, []);

  const reset = useCallback(() => {
    startRef.current = null;
    baseRef.current = 0;
    lastLapTotalRef.current = 0;
    setElapsedMs(0);
    setRunning(false);
    setLaps([]);
  }, []);

  const lap = useCallback(() => {
    const total = startRef.current != null ? baseRef.current + (Date.now() - startRef.current) : baseRef.current;
    const lapMs = total - lastLapTotalRef.current;
    lastLapTotalRef.current = total;
    setLaps((prev) => [{ id: `${Date.now()}-${prev.length}`, lapMs, totalMs: total }, ...prev]);
  }, []);

  const value = useMemo(() => ({ elapsedMs, running, laps, start, pause, reset, lap }), [elapsedMs, running, laps, start, pause, reset, lap]);
  return <StopwatchContext.Provider value={value}>{children}</StopwatchContext.Provider>;
}

export function useStopwatch() {
  const ctx = useContext(StopwatchContext);
  if (!ctx) throw new Error('useStopwatch must be used within StopwatchProvider');
  return ctx;
}
