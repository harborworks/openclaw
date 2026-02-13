/** Model definitions and their provider dependencies. */

export interface ModelDef {
  /** Value stored on the agent (e.g. "opus4.6") */
  value: string;
  /** Display label */
  label: string;
  /** Secret name required for this model to work */
  requiredKey: string;
}

/** All available models. */
export const ALL_MODELS: readonly ModelDef[] = [
  { value: "opus4.6", label: "Opus 4.6", requiredKey: "ANTHROPIC_API_KEY" },
  { value: "sonnet4.5", label: "Sonnet 4.5", requiredKey: "ANTHROPIC_API_KEY" },
  { value: "haiku4.5", label: "Haiku 4.5", requiredKey: "ANTHROPIC_API_KEY" },
] as const;

/** Lookup display label for a model value. */
export function modelToDisplay(value: string): string {
  return ALL_MODELS.find((m) => m.value === value)?.label ?? value;
}

/** Get the required secret key for a model value. */
export function modelRequiredKey(value: string): string | undefined {
  return ALL_MODELS.find((m) => m.value === value)?.requiredKey;
}
