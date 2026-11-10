import { useId, useRef } from "react";
import styles from "./SettingInfo.module.css";

type SettingInfoProps = {
  name: string;
  documentation: string;
};

// SettingInfo shows a setting's documentation in a dialog opened from an information icon.
export function SettingInfo({ name, documentation }: SettingInfoProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  return (
    <>
      <button type="button" className={styles.icon} aria-label={`About ${name}`} aria-haspopup="dialog"
        onClick={() => dialogRef.current?.showModal()}>
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">
          <circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="10" cy="6.2" r="1.15" fill="currentColor" />
          <path d="M10 9v5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId}
        onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
        <h3 id={titleId}>{name}</h3>
        <p>{documentation}</p>
        <button type="button" onClick={() => dialogRef.current?.close()}>Close</button>
      </dialog>
    </>
  );
}
