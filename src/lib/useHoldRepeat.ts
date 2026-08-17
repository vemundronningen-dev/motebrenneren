"use client";

import { useRef, useCallback, useEffect } from "react";

const INITIAL_DELAY_MS = 400;
const REPEAT_INTERVAL_MS = 90;

/** Langtrykk / hold-nede-for-auto-repeat, for +/- knapper. */
export function useHoldRepeat(callback: () => void) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  });

  const clear = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timeoutRef.current = null;
    intervalRef.current = null;
  }, []);

  const start = useCallback(() => {
    callbackRef.current();
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        callbackRef.current();
      }, REPEAT_INTERVAL_MS);
    }, INITIAL_DELAY_MS);
  }, []);

  useEffect(() => clear, [clear]);

  return {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      start();
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
  };
}
