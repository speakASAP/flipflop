CREATE TABLE "price_suggestion" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "currentPrice" DOUBLE PRECISION NOT NULL,
  "suggestedPrice" DOUBLE PRECISION NOT NULL,
  "changePercent" DOUBLE PRECISION NOT NULL,
  "rationale" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "price_suggestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IDX_price_suggestion_product_id" ON "price_suggestion"("productId");
CREATE INDEX "IDX_price_suggestion_status" ON "price_suggestion"("status");
