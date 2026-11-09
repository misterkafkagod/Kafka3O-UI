import { useContext, useSyncExternalStore } from "react";
import { AppearanceContext } from "./AppearanceContext";
import type { AppearanceState, AppearanceStore } from "./createAppearanceStore";

const noSubscription = () => () => undefined;
const noState = () => null;

export function useAppearance(): { store: AppearanceStore; state: AppearanceState } | null {
  const store = useContext(AppearanceContext);
  const state = useSyncExternalStore(store ? store.subscribe : noSubscription, store ? store.get : noState);
  return store && state ? { store, state } : null;
}
