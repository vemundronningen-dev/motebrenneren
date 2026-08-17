"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_ROLES } from "./roles";
import type { CustomRole } from "./types";

const OVERRIDES_KEY = "motebrenneren:rateOverrides:v1";
const CUSTOM_ROLES_KEY = "motebrenneren:customRoles:v1";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage kan feile (privat modus, full kvote) – ignorer stille.
  }
}

function customRoleId(): string {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

interface HydratedState {
  overrides: Record<string, number>;
  customRoles: CustomRole[];
  hydrated: boolean;
}

export function useLocalRates() {
  const [state, setState] = useState<HydratedState>({
    overrides: {},
    customRoles: [],
    hydrated: false,
  });
  const { overrides, customRoles, hydrated } = state;

  useEffect(() => {
    setState({
      overrides: readJson(OVERRIDES_KEY, {}),
      customRoles: readJson(CUSTOM_ROLES_KEY, []),
      hydrated: true,
    });
  }, []);

  const setOverrides = useCallback(
    (updater: (prev: Record<string, number>) => Record<string, number>) => {
      setState((prev) => ({ ...prev, overrides: updater(prev.overrides) }));
    },
    [],
  );

  const setCustomRoles = useCallback(
    (updater: (prev: CustomRole[]) => CustomRole[]) => {
      setState((prev) => ({ ...prev, customRoles: updater(prev.customRoles) }));
    },
    [],
  );

  const setRate = useCallback(
    (roleId: string, rate: number) => {
      setOverrides((prev) => {
        const next = { ...prev, [roleId]: rate };
        writeJson(OVERRIDES_KEY, next);
        return next;
      });
    },
    [setOverrides],
  );

  const resetRate = useCallback(
    (roleId: string) => {
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[roleId];
        writeJson(OVERRIDES_KEY, next);
        return next;
      });
    },
    [setOverrides],
  );

  const resetAll = useCallback(() => {
    setOverrides(() => ({}));
    writeJson(OVERRIDES_KEY, {});
  }, [setOverrides]);

  const addCustomRole = useCallback(
    (name: string, rate: number) => {
      const id = customRoleId();
      setCustomRoles((prev) => {
        const next = [...prev, { id, name, rate }];
        writeJson(CUSTOM_ROLES_KEY, next);
        return next;
      });
      return id;
    },
    [setCustomRoles],
  );

  const updateCustomRole = useCallback(
    (id: string, patch: Partial<Pick<CustomRole, "name" | "rate">>) => {
      setCustomRoles((prev) => {
        const next = prev.map((r) => (r.id === id ? { ...r, ...patch } : r));
        writeJson(CUSTOM_ROLES_KEY, next);
        return next;
      });
    },
    [setCustomRoles],
  );

  const removeCustomRole = useCallback(
    (id: string) => {
      setCustomRoles((prev) => {
        const next = prev.filter((r) => r.id !== id);
        writeJson(CUSTOM_ROLES_KEY, next);
        return next;
      });
    },
    [setCustomRoles],
  );

  const rateFor = useCallback(
    (roleId: string): number => {
      if (overrides[roleId] != null) return overrides[roleId];
      const def = DEFAULT_ROLES.find((r) => r.id === roleId);
      if (def) return def.defaultRate;
      const custom = customRoles.find((r) => r.id === roleId);
      return custom?.rate ?? 0;
    },
    [overrides, customRoles],
  );

  const isOverridden = useCallback(
    (roleId: string) => overrides[roleId] != null,
    [overrides],
  );

  return {
    hydrated,
    overrides,
    customRoles,
    setRate,
    resetRate,
    resetAll,
    addCustomRole,
    updateCustomRole,
    removeCustomRole,
    rateFor,
    isOverridden,
  };
}
