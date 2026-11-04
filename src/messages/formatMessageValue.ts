export type MessageValueFormat = "text" | "json" | "base64";

export type FormattedMessageValue = {
  value: string;
  invalidJson: boolean;
};

export function formatMessageValue(base64: string, format: MessageValueFormat): FormattedMessageValue {
  if (format === "base64") {
    return { value: base64, invalidJson: false };
  }

  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const text = new TextDecoder().decode(bytes);
  if (format === "text") {
    return { value: text, invalidJson: false };
  }

  try {
    return { value: JSON.stringify(JSON.parse(text), null, 2), invalidJson: false };
  } catch {
    return { value: text, invalidJson: true };
  }
}
