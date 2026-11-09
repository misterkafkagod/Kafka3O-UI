import { type Appearance, colorModes } from "./Appearance";
import styles from "./AppearancePanel.module.css";
import { useAppearance } from "./useAppearance";

const modeLabels: Record<Appearance["mode"], string> = { system: "Match system", light: "Light", dark: "Dark" };

export function AppearancePanel() {
  const appearance = useAppearance();
  if (!appearance) return null;
  const { store, state } = appearance;
  return (
    <details className={styles.panel}>
      <summary>Appearance</summary>
      <div className={styles.content}>
        <fieldset>
          <legend>Color mode</legend>
          {colorModes.map((mode) => (
            <label key={mode}>
              <input type="radio" name="kafka3o-color-mode" value={mode} checked={state.appearance.mode === mode}
                onChange={() => store.update({ mode })} />
              {modeLabels[mode]}
            </label>
          ))}
        </fieldset>
        <button type="button" className={styles.reset} onClick={() => store.reset()}>Reset appearance</button>
        {state.saveFailed ? <p role="status" className={styles.notice}>Preferences can't be saved in this browser.</p> : null}
      </div>
    </details>
  );
}
