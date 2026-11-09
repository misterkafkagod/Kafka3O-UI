import { createContext } from "react";
import type { AppearanceStore } from "./createAppearanceStore";

// AppearanceContext is empty in tests and embeddings that do not offer appearance choices.
export const AppearanceContext = createContext<AppearanceStore | null>(null);
