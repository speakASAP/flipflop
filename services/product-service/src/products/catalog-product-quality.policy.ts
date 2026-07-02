export const CATALOG_PRODUCT_QUALITY_POLICY_ID = 'catalog.product_quality.v1';

export const CATALOG_PRODUCT_QUALITY_MANDATORY_BLOCKER_CODES = [
  'missing_sku',
  'duplicate_sku',
  'missing_title',
  'missing_description',
  'missing_current_price',
  'missing_image',
  'placeholder_image_only',
  'archived_product',
] as const;

export type CatalogProductQualityIssue = {
  code: string;
  field?: string | null;
  severity?: string | null;
  message?: string | null;
  source?: string | null;
  [key: string]: unknown;
};

export type CatalogProductQualityReviewItem = {
  productId?: string | null;
  sku?: string | null;
  title?: string | null;
  lifecycle?: string | null;
  canActivate?: boolean | null;
  completionScore?: number | null;
  blockingIssues?: CatalogProductQualityIssue[];
  optionalOpportunities?: CatalogProductQualityIssue[];
  nextAction?: string | null;
  [key: string]: unknown;
};

export type CatalogProductQualityStatus = {
  policyId: string;
  productId: string | null;
  checked: boolean;
  blocked: boolean;
  canActivate: boolean;
  failedClosed: boolean;
  lookupFailed: boolean;
  lookupError: string | null;
  blockingIssues: CatalogProductQualityIssue[];
  mandatoryBlockers: CatalogProductQualityIssue[];
  optionalOpportunities: CatalogProductQualityIssue[];
  completionScore: number | null;
  nextAction: string;
  source: string;
};

export type CatalogProductQualityBlockedReason = {
  reason: string;
  message: string;
  field?: string | null;
  policyId: string;
};

const EAN_FIELDS = new Set(['ean', 'barcode', 'gtin']);
const NON_BLOCKING_EAN_CODES = new Set(['missing_ean', 'invalid_ean', 'duplicate_ean']);

export function isNonBlockingEanQualityIssue(issue: CatalogProductQualityIssue): boolean {
  const code = String(issue?.code || '').trim().toLowerCase();
  const field = String(issue?.field || '').trim().toLowerCase();
  return NON_BLOCKING_EAN_CODES.has(code) || EAN_FIELDS.has(field);
}

export function normalizeCatalogProductQualityStatus(input: {
  item?: CatalogProductQualityReviewItem | null;
  policyId?: string | null;
  productId?: string | null;
  lookupError?: string | null;
}): CatalogProductQualityStatus {
  const policyId = input.policyId || CATALOG_PRODUCT_QUALITY_POLICY_ID;
  const lookupError = input.lookupError || null;
  const item = input.item || null;
  const productId = String(input.productId || item?.productId || '').trim() || null;

  if (lookupError || !item) {
    const message = lookupError || 'Catalog product quality review did not return a matching product.';
    const issue: CatalogProductQualityIssue = {
      code: 'catalog_quality_review_unavailable',
      field: 'quality_review',
      severity: 'blocking',
      message,
      source: policyId,
    };

    return {
      policyId,
      productId,
      checked: false,
      blocked: true,
      canActivate: false,
      failedClosed: true,
      lookupFailed: true,
      lookupError: message,
      blockingIssues: [issue],
      mandatoryBlockers: [issue],
      optionalOpportunities: [],
      completionScore: null,
      nextAction: 'retry_catalog_quality_review',
      source: policyId,
    };
  }

  const rawBlockingIssues = Array.isArray(item.blockingIssues) ? item.blockingIssues : [];
  const blockingIssues = rawBlockingIssues.filter((issue) => !isNonBlockingEanQualityIssue(issue));
  const mandatoryBlockers = blockingIssues.filter((issue) => {
    const code = String(issue?.code || '').trim();
    return Boolean(code) || issue?.severity === 'blocking';
  });
  const blocked = mandatoryBlockers.length > 0 || item.canActivate === false;

  return {
    policyId,
    productId,
    checked: true,
    blocked,
    canActivate: !blocked,
    failedClosed: false,
    lookupFailed: false,
    lookupError: null,
    blockingIssues,
    mandatoryBlockers,
    optionalOpportunities: Array.isArray(item.optionalOpportunities) ? item.optionalOpportunities : [],
    completionScore: typeof item.completionScore === 'number' ? item.completionScore : null,
    nextAction: item.nextAction || (blocked ? 'resolve_catalog_quality_blockers' : 'ready_for_activation'),
    source: policyId,
  };
}

export function catalogProductQualityBlockedReasons(
  quality: CatalogProductQualityStatus,
): CatalogProductQualityBlockedReason[] {
  if (!quality.blocked) {
    return [];
  }

  if (quality.lookupFailed) {
    return [{
      reason: 'catalog_quality_review_unavailable',
      message: quality.lookupError || 'Catalog product quality review is unavailable; failing closed.',
      field: 'quality_review',
      policyId: quality.policyId,
    }];
  }

  if (quality.mandatoryBlockers.length > 0) {
    return quality.mandatoryBlockers.map((issue) => ({
      reason: String(issue.code || 'catalog_quality_blocker'),
      message: String(issue.message || `Catalog product quality blocker: ${issue.code || 'unknown'}`),
      field: issue.field || null,
      policyId: quality.policyId,
    }));
  }

  return [{
    reason: 'catalog_quality_activation_not_allowed',
    message: 'Catalog product quality policy does not allow activation.',
    field: 'quality_review',
    policyId: quality.policyId,
  }];
}
