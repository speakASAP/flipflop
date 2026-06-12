-- CreateTable
CREATE TABLE "marketing_campaign" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "goal_id" VARCHAR(255) NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "sent_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_marketing_campaign" PRIMARY KEY ("id")
);
