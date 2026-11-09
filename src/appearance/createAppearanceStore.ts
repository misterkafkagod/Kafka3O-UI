import { type Appearance, appearanceStorageKey, type AppearanceStorage, defaultAppearance } from "./Appearance";
import { applyAppearance } from "./applyAppearance";
import { loadAppearance } from "./loadAppearance";
import { saveAppearance } from "./saveAppearance";

export type AppearanceState = {
  appearance: Appearance;
  // saveFailed is true when the last change could not be stored in this browser.
  saveFailed: boolean;
};

export type AppearanceStore = {
  get: () => AppearanceState;
  subscribe: (listener: () => void) => () => void;
  update: (change: Partial<Appearance>) => void;
  reset: () => void;
};

// createAppearanceStore applies the saved appearance at once and keeps the page, storage and other tabs in step.
export function createAppearanceStore(storage: AppearanceStorage | null, root: HTMLElement,
  events: Pick<Window, "addEventListener">): AppearanceStore {
  let state: AppearanceState = { appearance: loadAppearance(storage), saveFailed: false };
  const listeners = new Set<() => void>();
  const publish = (next: AppearanceState) => {
    state = next;
    applyAppearance(root, state.appearance);
    for (const listener of listeners) listener();
  };
  applyAppearance(root, state.appearance);
  events.addEventListener("storage", (event: StorageEvent) => {
    if (event.key === appearanceStorageKey || event.key === null) {
      publish({ appearance: loadAppearance(storage), saveFailed: state.saveFailed });
    }
  });
  return {
    get: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update: (change) => {
      const appearance = { ...state.appearance, ...change };
      publish({ appearance, saveFailed: !saveAppearance(storage, appearance) });
    },
    reset: () => publish({ appearance: defaultAppearance, saveFailed: !saveAppearance(storage, null) }),
  };
}
