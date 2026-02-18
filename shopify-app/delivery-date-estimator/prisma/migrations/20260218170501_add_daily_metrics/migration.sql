-- CreateTable
CREATE TABLE "DailyMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "DailyMetric_shop_date_idx" ON "DailyMetric"("shop", "date");

-- CreateIndex
CREATE INDEX "DailyMetric_shop_key_date_idx" ON "DailyMetric"("shop", "key", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyMetric_shop_key_date_key" ON "DailyMetric"("shop", "key", "date");
