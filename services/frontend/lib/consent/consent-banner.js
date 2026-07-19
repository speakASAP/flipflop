/**
 * Vanilla DOM consent banner built on consent-core. No framework, no build step —
 * usable from plain HTML, a NestJS-rendered page, or inside a React app via the
 * thin wrapper each frontend keeps.
 *
 * When the app declares only strictly-necessary storage the banner renders a
 * disclosure with one acknowledge button instead of switches. There is nothing
 * to opt out of, and pretending otherwise would be theatre.
 */

import {
  NECESSARY_CATEGORY,
  acceptAllSelection,
  isDisclosureOnly,
  needsDecision,
  rejectOptionalSelection,
  saveDecision,
} from './consent-core.js';

const CONTAINER_ID = 'alfares-consent';

const DEFAULT_TEXT = {
  title: 'Cookies a úložiště',
  disclosureBody:
    'Tento web ukládá pouze údaje nezbytné pro přihlášení, bezpečnost a základní chod. Nepoužíváme analytické ani marketingové cookies a nesledujeme vás na jiných webech.',
  choiceBody:
    'Nezbytné údaje ukládáme vždy. U ostatního se rozhodujete vy a volbu můžete kdykoli změnit.',
  acknowledge: 'Rozumím',
  acceptAll: 'Přijmout vše',
  rejectOptional: 'Jen nezbytné',
  savePreferences: 'Uložit volbu',
  policyLabel: 'Zásady cookies',
};

/**
 * @param {Object} options
 * @param {string} options.version           Bump to re-ask after wording changes.
 * @param {import('./consent-core.js').ConsentCategory[]} [options.categories]
 * @param {string} [options.policyUrl]
 * @param {Document} [options.document]
 * @param {Storage} [options.storage]
 * @param {(decision: import('./consent-core.js').ConsentDecision) => void} [options.onDecision]
 * @param {Partial<typeof DEFAULT_TEXT>} [options.text]
 * @returns {{ destroy: () => void, shown: boolean }}
 */
export function mountConsentBanner(options) {
  const doc = options.document || (typeof document !== 'undefined' ? document : null);
  if (!doc) return { destroy: () => {}, shown: false };

  const categories = options.categories?.length ? options.categories : [NECESSARY_CATEGORY];
  const text = { ...DEFAULT_TEXT, ...(options.text || {}) };

  if (!needsDecision(options.version, options.storage)) {
    return { destroy: () => {}, shown: false };
  }

  // A second mount would trap focus twice and double-record the decision.
  doc.getElementById(CONTAINER_ID)?.remove();

  const disclosureOnly = isDisclosureOnly(categories);
  const container = doc.createElement('div');
  container.id = CONTAINER_ID;
  container.setAttribute('role', 'dialog');
  container.setAttribute('aria-modal', 'false');
  container.setAttribute('aria-labelledby', CONTAINER_ID + '-title');
  container.innerHTML = bannerMarkup({ categories, text, disclosureOnly, policyUrl: options.policyUrl });

  const style = doc.createElement('style');
  style.textContent = bannerStyles();
  container.appendChild(style);

  doc.body.appendChild(container);

  const destroy = () => container.remove();

  const decide = (selection) => {
    const decision = saveDecision({
      version: options.version,
      categories,
      selection,
      storage: options.storage,
    });
    destroy();
    if (decision) options.onDecision?.(decision);
  };

  container.querySelector('[data-consent-accept]')?.addEventListener('click', () => {
    decide(acceptAllSelection(categories));
  });

  container.querySelector('[data-consent-reject]')?.addEventListener('click', () => {
    decide(rejectOptionalSelection(categories));
  });

  container.querySelector('[data-consent-save]')?.addEventListener('click', () => {
    const selection = {};
    for (const category of categories) {
      const input = container.querySelector('[data-consent-category="' + category.id + '"]');
      selection[category.id] = category.required === true || input?.checked === true;
    }
    decide(selection);
  });

  return { destroy, shown: true };
}

function bannerMarkup({ categories, text, disclosureOnly, policyUrl }) {
  const policyLink = policyUrl
    ? '<a class="alfares-consent__link" href="' + escapeAttr(policyUrl) + '">' + escapeHtml(text.policyLabel) + '</a>'
    : '';

  if (disclosureOnly) {
    return (
      '<div class="alfares-consent__panel">' +
      '<h2 class="alfares-consent__title" id="' + CONTAINER_ID + '-title">' + escapeHtml(text.title) + '</h2>' +
      '<p class="alfares-consent__body">' + escapeHtml(text.disclosureBody) + ' ' + policyLink + '</p>' +
      '<div class="alfares-consent__actions">' +
      '<button type="button" class="alfares-consent__button alfares-consent__button--primary" data-consent-accept>' +
      escapeHtml(text.acknowledge) +
      '</button></div></div>'
    );
  }

  const rows = categories
    .map((category) => {
      const checked = category.required === true ? ' checked disabled' : '';
      return (
        '<li class="alfares-consent__category"><label>' +
        '<input type="checkbox" data-consent-category="' + escapeAttr(category.id) + '"' + checked + '>' +
        '<span><strong>' + escapeHtml(category.label) + '</strong>' +
        (category.required === true ? ' <em>(vždy aktivní)</em>' : '') +
        '<br>' + escapeHtml(category.description) + '</span></label></li>'
      );
    })
    .join('');

  return (
    '<div class="alfares-consent__panel">' +
    '<h2 class="alfares-consent__title" id="' + CONTAINER_ID + '-title">' + escapeHtml(text.title) + '</h2>' +
    '<p class="alfares-consent__body">' + escapeHtml(text.choiceBody) + ' ' + policyLink + '</p>' +
    '<ul class="alfares-consent__categories">' + rows + '</ul>' +
    '<div class="alfares-consent__actions">' +
    '<button type="button" class="alfares-consent__button alfares-consent__button--primary" data-consent-accept>' +
    escapeHtml(text.acceptAll) + '</button>' +
    '<button type="button" class="alfares-consent__button" data-consent-reject>' +
    escapeHtml(text.rejectOptional) + '</button>' +
    '<button type="button" class="alfares-consent__button" data-consent-save>' +
    escapeHtml(text.savePreferences) + '</button>' +
    '</div></div>'
  );
}

function bannerStyles() {
  return `
#${CONTAINER_ID} {
  position: fixed;
  inset: auto 0 0 0;
  z-index: 2147483000;
  display: flex;
  justify-content: center;
  padding: 16px;
  font-family: inherit;
}
#${CONTAINER_ID} .alfares-consent__panel {
  width: min(720px, 100%);
  background: #ffffff;
  color: #1a1a1a;
  border: 1px solid rgba(0, 0, 0, 0.16);
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
  padding: 18px 20px;
}
#${CONTAINER_ID} .alfares-consent__title { margin: 0 0 8px; font-size: 16px; font-weight: 700; }
#${CONTAINER_ID} .alfares-consent__body { margin: 0 0 12px; font-size: 14px; line-height: 1.5; }
#${CONTAINER_ID} .alfares-consent__link { color: inherit; text-decoration: underline; }
#${CONTAINER_ID} .alfares-consent__categories { list-style: none; margin: 0 0 14px; padding: 0; }
#${CONTAINER_ID} .alfares-consent__category { margin-bottom: 10px; font-size: 13px; line-height: 1.45; }
#${CONTAINER_ID} .alfares-consent__category label { display: flex; gap: 10px; align-items: flex-start; cursor: pointer; }
#${CONTAINER_ID} .alfares-consent__category input { margin-top: 3px; flex-shrink: 0; }
#${CONTAINER_ID} .alfares-consent__actions { display: flex; flex-wrap: wrap; gap: 8px; }
#${CONTAINER_ID} .alfares-consent__button {
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  padding: 9px 16px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.2);
  background: #f4f4f5;
  color: #1a1a1a;
  cursor: pointer;
}
#${CONTAINER_ID} .alfares-consent__button--primary { background: #b3122b; border-color: #b3122b; color: #ffffff; }
@media (prefers-color-scheme: dark) {
  #${CONTAINER_ID} .alfares-consent__panel { background: #17181c; color: #f2f2f3; border-color: rgba(255, 255, 255, 0.18); }
  #${CONTAINER_ID} .alfares-consent__button { background: #26272c; color: #f2f2f3; border-color: rgba(255, 255, 255, 0.22); }
  #${CONTAINER_ID} .alfares-consent__button--primary { background: #d81e3c; border-color: #d81e3c; color: #ffffff; }
}
`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, '&#39;');
}
