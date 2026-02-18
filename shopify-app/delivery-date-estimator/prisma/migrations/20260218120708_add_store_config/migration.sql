-- CreateTable
CREATE TABLE "StoreConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "cutoffHour" INTEGER NOT NULL DEFAULT 14,
    "processingDays" INTEGER NOT NULL DEFAULT 1,
    "shippingDaysMin" INTEGER NOT NULL DEFAULT 3,
    "shippingDaysMax" INTEGER NOT NULL DEFAULT 5,
    "excludeWeekends" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "holidays" TEXT NOT NULL DEFAULT '',
    "showCountdown" BOOLEAN NOT NULL DEFAULT true,
    "labelText" TEXT NOT NULL DEFAULT 'Estimated delivery',
    "countdownText" TEXT NOT NULL DEFAULT 'Order within',
    "countdownSuffix" TEXT NOT NULL DEFAULT 'to get it by',
    "iconStyle" TEXT NOT NULL DEFAULT 'truck',
    "fontSize" INTEGER NOT NULL DEFAULT 14,
    "textColor" TEXT NOT NULL DEFAULT '#333333',
    "backgroundColor" TEXT NOT NULL DEFAULT '#f8f9fa',
    "borderColor" TEXT NOT NULL DEFAULT '#e2e2e2',
    "urgencyColor" TEXT NOT NULL DEFAULT '#e63946',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "sessionId" TEXT,
    CONSTRAINT "StoreConfig_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreConfig_shop_key" ON "StoreConfig"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "StoreConfig_sessionId_key" ON "StoreConfig"("sessionId");
