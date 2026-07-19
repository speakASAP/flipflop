'use client';

import { useEffect } from 'react';
// Vendored from shared/packages/consent — refresh with shared/scripts/sync-consent.sh.
import { mountConsentBanner } from '@/lib/consent/consent-banner.js';

/** Bump when the wording changes; visitors are then asked again. */
const CONSENT_VERSION = 'alfares-consent-v1';

/**
 * Only strictly necessary storage is declared, because that is all this site
 * uses — no analytics, no marketing, no third-party trackers. A switch that
 * changes nothing is not a choice, so the banner discloses and asks once.
 */
export function ConsentBanner() {
  useEffect(() => {
    const banner = mountConsentBanner({
      version: CONSENT_VERSION,
      policyUrl: '/ochrana-osobnich-udaju',
      text: {
        title: 'Cookies a úložiště',
        disclosureBody:
          'Ukládáme jen údaje nezbytné pro chod webu, přihlášení a nákupní košík. Nepoužíváme analytické ani marketingové cookies a nesledujeme vás na jiných webech.',
        acknowledge: 'Rozumím',
        policyLabel: 'Zásady ochrany osobních údajů',
      },
    });

    return () => banner.destroy();
  }, []);

  return null;
}
