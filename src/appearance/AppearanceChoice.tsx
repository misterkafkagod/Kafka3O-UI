type AppearanceChoiceProps<T extends string> = {
  legend: string;
  name: string;
  options: readonly T[];
  labels: Record<T, string>;
  value: T;
  onChange: (value: T) => void;
};

// AppearanceChoice is one labeled radio group of the Appearance panel.
export function AppearanceChoice<T extends string>({ legend, name, options, labels, value, onChange }: AppearanceChoiceProps<T>) {
  return (
    <fieldset>
      <legend>{legend}</legend>
      {options.map((option) => (
        <label key={option}>
          <input type="radio" name={name} value={option} checked={value === option} onChange={() => onChange(option)} />
          {labels[option]}
        </label>
      ))}
    </fieldset>
  );
}
