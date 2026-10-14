-- CreateEnum
CREATE TYPE "DrawStatus" AS ENUM ('VERIFIED', 'SOURCE_ONLY', 'CONFLICT');

-- CreateEnum
CREATE TYPE "PrizeType" AS ENUM ('LAST2', 'FRONT3', 'LAST3');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('RUNNING', 'SUCCESS', 'NO_CHANGE', 'PARTIAL', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ChangeAction" AS ENUM ('ADDED', 'UPDATED', 'VERIFIED', 'CONFLICT');

-- CreateTable
CREATE TABLE "lottery_draws" (
    "id" SERIAL NOT NULL,
    "draw_date" DATE NOT NULL,
    "first_prize_number" VARCHAR(6) NOT NULL,
    "status" "DrawStatus" NOT NULL DEFAULT 'SOURCE_ONLY',
    "source_name" VARCHAR(64) NOT NULL,
    "source_url" TEXT NOT NULL,
    "verified_source" VARCHAR(64),
    "verified_at" TIMESTAMP(3),
    "conflict_number" VARCHAR(6),
    "conflict_source" VARCHAR(64),
    "fetched_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lottery_draws_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prize_results" (
    "id" SERIAL NOT NULL,
    "draw_id" INTEGER NOT NULL,
    "prize_type" "PrizeType" NOT NULL,
    "number" VARCHAR(6) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "prize_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" SERIAL NOT NULL,
    "source_name" VARCHAR(64) NOT NULL,
    "trigger" VARCHAR(16) NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "status" "SyncStatus" NOT NULL DEFAULT 'RUNNING',
    "records_added" INTEGER NOT NULL DEFAULT 0,
    "records_updated" INTEGER NOT NULL DEFAULT 0,
    "records_conflict" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "details" JSONB,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "draw_changes" (
    "id" SERIAL NOT NULL,
    "sync_log_id" INTEGER NOT NULL,
    "draw_date" DATE NOT NULL,
    "action" "ChangeAction" NOT NULL,
    "old_number" VARCHAR(6),
    "new_number" VARCHAR(6),
    "source_name" VARCHAR(64) NOT NULL,
    "source_url" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "draw_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_numbers" (
    "id" SERIAL NOT NULL,
    "number" VARCHAR(6) NOT NULL,
    "label" VARCHAR(80),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_meta" (
    "key" VARCHAR(64) NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_meta_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "lottery_draws_draw_date_key" ON "lottery_draws"("draw_date");

-- CreateIndex
CREATE INDEX "lottery_draws_first_prize_number_idx" ON "lottery_draws"("first_prize_number");

-- CreateIndex
CREATE INDEX "lottery_draws_status_draw_date_idx" ON "lottery_draws"("status", "draw_date");

-- CreateIndex
CREATE INDEX "prize_results_prize_type_number_idx" ON "prize_results"("prize_type", "number");

-- CreateIndex
CREATE UNIQUE INDEX "prize_results_draw_id_prize_type_position_key" ON "prize_results"("draw_id", "prize_type", "position");

-- CreateIndex
CREATE INDEX "sync_logs_started_at_idx" ON "sync_logs"("started_at");

-- CreateIndex
CREATE INDEX "sync_logs_status_finished_at_idx" ON "sync_logs"("status", "finished_at");

-- CreateIndex
CREATE INDEX "draw_changes_sync_log_id_idx" ON "draw_changes"("sync_log_id");

-- CreateIndex
CREATE INDEX "draw_changes_draw_date_idx" ON "draw_changes"("draw_date");

-- CreateIndex
CREATE UNIQUE INDEX "saved_numbers_number_key" ON "saved_numbers"("number");

-- AddForeignKey
ALTER TABLE "prize_results" ADD CONSTRAINT "prize_results_draw_id_fkey" FOREIGN KEY ("draw_id") REFERENCES "lottery_draws"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draw_changes" ADD CONSTRAINT "draw_changes_sync_log_id_fkey" FOREIGN KEY ("sync_log_id") REFERENCES "sync_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
