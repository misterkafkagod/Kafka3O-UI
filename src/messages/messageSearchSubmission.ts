export type MessageSearchSubmission = {
  query: string | undefined;
  invalid: boolean;
  repeat: boolean;
};

export function messageSearchSubmission(text: string, previous: string | undefined): MessageSearchSubmission {
  if (text.length === 0) {
    return { query: undefined, invalid: true, repeat: false };
  }
  return { query: text, invalid: false, repeat: text === previous };
}
