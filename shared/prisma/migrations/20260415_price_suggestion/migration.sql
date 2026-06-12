CREATE TABLE IF NOT EXISTS "price_suggestions" (
  "id"             UUID          NOT NULL DEFAULT gen_random_uuid(),
  "productId"      UUID          NOT NULL,
  "productName"    TEXT          NOT NULL,
  "currentPrice"   DECIMAL(10,2) NOT NULL,
  "suggestedPrice" DECIMAL(10,2) NOT NULL,
  "changePercent"  FLOAT         NOT NULL,
  "rationale"      TEXT          NOT NULL,
  "status"         TEXT          NOT NULL DEFAULT 'pending',
  "createdAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3)  NOT NULL,

  CONSTRAINT "price_suggestions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "price_suggestions_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);
