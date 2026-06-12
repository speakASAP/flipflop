CREATE TABLE "discount_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(32) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 100,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "goalId" VARCHAR(255),

    CONSTRAINT "PK_discount_codes" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IDX_discount_codes_code" ON "discount_codes"("code");

CREATE TABLE "discount_code_redemptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "codeId" UUID NOT NULL,
    "orderId" UUID NOT NULL,

    CONSTRAINT "PK_discount_code_redemptions" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IDX_discount_redemption_code_order" ON "discount_code_redemptions"("codeId", "orderId");

ALTER TABLE "discount_code_redemptions" ADD CONSTRAINT "FK_discount_redemption_code" FOREIGN KEY ("codeId") REFERENCES "discount_codes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
