-- CreateTable
CREATE TABLE "leaderboard_entry" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(3) NOT NULL,
    "time_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leaderboard_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "used_token" (
    "jti" VARCHAR(32) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "used_token_pkey" PRIMARY KEY ("jti")
);

-- CreateTable
CREATE TABLE "rate_limit" (
    "key" VARCHAR(64) NOT NULL,
    "count" INTEGER NOT NULL,
    "reset_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "rate_limit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "leaderboard_entry_time_ms_created_at_id_idx" ON "leaderboard_entry"("time_ms", "created_at", "id");

-- CreateIndex
CREATE INDEX "used_token_expires_at_idx" ON "used_token"("expires_at");

-- CreateIndex
CREATE INDEX "rate_limit_reset_at_idx" ON "rate_limit"("reset_at");

-- AddCheckConstraint
ALTER TABLE "leaderboard_entry"
    ADD CONSTRAINT "leaderboard_entry_name_check" CHECK ("name" ~ '^[A-Z]{3}$'),
    ADD CONSTRAINT "leaderboard_entry_time_ms_check" CHECK ("time_ms" > 0 AND "time_ms" < 6000000);

-- AddCheckConstraint
ALTER TABLE "rate_limit"
    ADD CONSTRAINT "rate_limit_count_check" CHECK ("count" >= 0);
