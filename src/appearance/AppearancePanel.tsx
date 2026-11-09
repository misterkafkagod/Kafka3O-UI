import { type Appearance, colorModes, colorThemes } from "./Appearance";
import { AppearanceChoice } from "./AppearanceChoice";
import styles from "./AppearancePanel.module.css";
import { useAppearance } from "./useAppearance";

const modeLabels: Record<Appearance["mode"], string> = { system: "Match system", light: "Light", dark: "Dark" };
const themeLabels: Record<Appearance["theme"], string> = { blue: "Blue", slate: "Slate", teal: "Teal", "high-contrast": "High contrast" };

export function AppearancePanel() {
  const appearance = useAppearance();
  if (!appearance) return null;
  const { store, state } = appearance;
  return (
    <details className={styles.panel}>
      <summary>Appearance</summary>
      <div className={styles.content}>
        <AppearanceChoice legend="Color mode" name="kafka3o-color-mode" options={colorModes} labels={modeLabels}
          value={state.appearance.mode} onChange={(mode) => store.update({ mode })} />
        <AppearanceChoice legend="Color theme" name="kafka3o-color-theme" options={colorThemes} labels={themeLabels}
          value={state.appearance.theme} onChange={(theme) => store.update({ theme })} />
        <button type="button" className={styles.reset} onClick={() => store.reset()}>Reset appearance</button>
        {state.saveFailed ? <p role="status" className={styles.notice}>Preferences can't be saved in this browser.</p> : null}
      </div>
    </details>
  );
}
