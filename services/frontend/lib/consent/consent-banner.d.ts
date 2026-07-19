import type { ConsentCategory, ConsentDecision } from './consent-core.js';

export interface ConsentBannerText {
  title: string;
  disclosureBody: string;
  choiceBody: string;
  acknowledge: string;
  acceptAll: string;
  rejectOptional: string;
  savePreferences: string;
  policyLabel: string;
}

export interface MountConsentBannerOptions {
  /** Bump to re-ask after the wording changes. */
  version: string;
  /** Defaults to the strictly-necessary category alone. */
  categories?: ConsentCategory[];
  policyUrl?: string;
  document?: Document;
  storage?: Storage;
  onDecision?: (decision: ConsentDecision) => void;
  text?: Partial<ConsentBannerText>;
}

export function mountConsentBanner(options: MountConsentBannerOptions): {
  destroy: () => void;
  shown: boolean;
};
