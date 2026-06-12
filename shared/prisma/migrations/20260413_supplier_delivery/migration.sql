-- CreateTable
CREATE TABLE "supplier_delivery" (
    "id" TEXT NOT NULL,
    "supplier_id" VARCHAR(255) NOT NULL,
    "supplier_name" VARCHAR(255) NOT NULL,
    "ordered_at" TIMESTAMP(6) NOT NULL,
    "received_at" TIMESTAMP(6),
    "product_id" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_supplier_delivery" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IDX_supplier_delivery_supplier_id" ON "supplier_delivery"("supplier_id");
