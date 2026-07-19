/**
 * Alfares ecosystem consent core — framework-agnostic, zero dependencies.
 *
 * Design rule: an app declares only the storage categories it actually uses.
 * A banner offering an "analytics" switch on a site that runs no analytics is
 * not consent, it is decoration — and it trains users to dismiss real choices.
 *
 * Consent lives in the visitor's browser only. Nothing is sent to a server, so
 * no personal data (IP, user agent) is collected from anonymous visitors just
 * to prove they clicked a button.
 *
 * @typedef {Object} ConsentCategory
 * @property {string} id            Stable id, e.g. "analytics".
 * @property {string} label         Short user-facing name.
 * @property {string} description   What is stored and why.
 * @property {boolean} [required]   Strictly necessary: always on, cannot be refused.
 *
 * @typedef {Object} ConsentDecision
 * @property {string} version                 Text version the visitor agreed to.
 * @property {string} decidedAt               ISO timestamp of the decision.
 * @property {Record<string, boolean>} categories
 */

export const CONSENT_STORAGE_KEY = 'alfares.consent';

/**
 * The strictly-necessary category every app has: session/auth storage without
 * which the site cannot function. It is disclosed, never offered as a choice,
 * because refusing it would just break the site.
 */
export const NECESSARY_CATEGORY = Object.freeze({
  id: 'necessary',
  label: 'Nezbytné',
  description:
    'Přihlášení, bezpečnost a základní chod webu. Bez nich web nefunguje, proto je nelze odmítnout.',
  required: true,
});

/**
 * Reads the stored decision. Returns null when nothing is stored, when storage
 * is unavailable (private mode, blocked cookies), or when the stored data is
 * unreadable — in every one of those cases the visitor has not decided.
 *
 * @param {Storage} [storage]
 * @returns {ConsentDecision | null}
 */
export function readDecision(storage) {
  const store = storage || safeStorage();
  if (!store) return null;

  try {
    const raw = store.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.version !== 'string' || !parsed.version) return null;
    if (!parsed.categories || typeof parsed.categories !== 'object') return null;

    return parsed;
  } catch {
    return null;
  }
}

/**
 * True when the visitor still has to be asked: no decision yet, or the wording
 * changed since they decided. A version bump re-opens the question rather than
 * silently carrying the old answer over to new terms.
 *
 * @param {string} currentVersion
 * @param {Storage} [storage]
 */
export function needsDecision(currentVersion, storage) {
  const decision = readDecision(storage);
  return !decision || decision.version !== currentVersion;
}

/**
 * Stores the decision. Required categories are forced on regardless of input —
 * they are disclosed, not optional, and storing them as "false" would be a lie.
 *
 * @param {Object} params
 * @param {string} params.version
 * @param {ConsentCategory[]} params.categories
 * @param {Record<string, boolean>} params.selection
 * @param {Storage} [params.storage]
 * @param {() => Date} [params.now]
 * @returns {ConsentDecision | null} null when storage is unavailable.
 */
export function saveDecision({ version, categories, selection, storage, now }) {
  const store = storage || safeStorage();
  const clock = now || (() => new Date());

  const resolved = {};
  for (const category of categories) {
    resolved[category.id] = category.required === true ? true : selection[category.id] === true;
  }

  const decision = {
    version,
    decidedAt: clock().toISOString(),
    categories: resolved,
  };

  if (!store) return null;

  try {
    store.setItem(CONSENT_STORAGE_KEY, JSON.stringify(decision));
  } catch {
    // Storage full or blocked. The visitor still made a choice this page view;
    // we just cannot remember it, so they will be asked again next time.
    return decision;
  }

  return decision;
}

/**
 * Whether a given category is currently allowed. Unknown categories are denied:
 * code must not start storing something the visitor was never asked about.
 *
 * @param {string} categoryId
 * @param {string} currentVersion
 * @param {Storage} [storage]
 */
export function isAllowed(categoryId, currentVersion, storage) {
  if (categoryId === NECESSARY_CATEGORY.id) return true;

  const decision = readDecision(storage);
  if (!decision || decision.version !== currentVersion) return false;

  return decision.categories[categoryId] === true;
}

/** Clears the decision so the visitor is asked again. Used by "change settings". */
export function clearDecision(storage) {
  const store = storage || safeStorage();
  if (!store) return;
  try {
    store.removeItem(CONSENT_STORAGE_KEY);
  } catch {
    // Nothing to do — an unclearable store means the banner reappears anyway.
  }
}

/**
 * Selection helpers. "Reject" keeps required categories on because they are not
 * refusable; everything optional goes off.
 *
 * @param {ConsentCategory[]} categories
 */
export function acceptAllSelection(categories) {
  return Object.fromEntries(categories.map((c) => [c.id, true]));
}

/** @param {ConsentCategory[]} categories */
export function rejectOptionalSelection(categories) {
  return Object.fromEntries(categories.map((c) => [c.id, c.required === true]));
}

/**
 * True when the app declares nothing beyond strictly-necessary storage. Callers
 * use this to render a disclosure with a single acknowledge button instead of
 * fake toggles.
 *
 * @param {ConsentCategory[]} categories
 */
export function isDisclosureOnly(categories) {
  return categories.every((category) => category.required === true);
}

function safeStorage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    // Accessing localStorage throws in some privacy modes.
    return null;
  }
}
