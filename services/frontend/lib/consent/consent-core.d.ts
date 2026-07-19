export interface ConsentCategory {
  id: string;
  label: string;
  description: string;
  /** Strictly necessary: always on, cannot be refused. */
  required?: boolean;
}

export interface ConsentDecision {
  version: string;
  decidedAt: string;
  categories: Record<string, boolean>;
}

export const CONSENT_STORAGE_KEY: string;
export const NECESSARY_CATEGORY: ConsentCategory;

export function readDecision(storage?: Storage): ConsentDecision | null;
export function needsDecision(currentVersion: string, storage?: Storage): boolean;

export function saveDecision(params: {
  version: string;
  categories: ConsentCategory[];
  selection: Record<string, boolean>;
  storage?: Storage;
  now?: () => Date;
}): ConsentDecision | null;

export function isAllowed(categoryId: string, currentVersion: string, storage?: Storage): boolean;
export function clearDecision(storage?: Storage): void;
export function acceptAllSelection(categories: ConsentCategory[]): Record<string, boolean>;
export function rejectOptionalSelection(categories: ConsentCategory[]): Record<string, boolean>;
export function isDisclosureOnly(categories: ConsentCategory[]): boolean;
