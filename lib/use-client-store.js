"use client";

import { useSyncExternalStore } from "react";
import {
  getClientStoreSnapshot,
  getServerStoreSnapshot,
  subscribeToStoreChange,
} from "@/lib/client-store";

export function useClientStore() {
  return useSyncExternalStore(
    subscribeToStoreChange,
    getClientStoreSnapshot,
    getServerStoreSnapshot,
  );
}

export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
