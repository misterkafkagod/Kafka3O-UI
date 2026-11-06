import type { ReactNode } from "react";
import styles from "./ScrollableTableRegion.module.css";

type ScrollableTableRegionProps = {
  label: string;
  children: ReactNode;
};

export function ScrollableTableRegion({ label, children }: ScrollableTableRegionProps) {
  return (
    <div role="region" aria-label={label} tabIndex={0} className={styles.region}>
      {children}
    </div>
  );
}
