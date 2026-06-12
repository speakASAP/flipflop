-- CreateTable
CREATE TABLE "loyalty_account" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "customer_email" TEXT NOT NULL,
    "total_points" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_account_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_account_customer_id_key" ON "loyalty_account"("customer_id");
