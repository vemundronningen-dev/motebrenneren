"use client";

import { useCallback, useState } from "react";

export interface Toast {
  id: number;
  text: string;
}

let counter = 0;

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((text: string) => {
    const id = ++counter;
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  return { toasts, push };
}
