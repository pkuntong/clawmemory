import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default prisma;

// StoreConfig helpers
export async function getStoreConfig(shop: string) {
  return prisma.storeConfig.findUnique({
    where: { shop },
  });
}

export async function upsertStoreConfig(
  shop: string,
  data: Partial<{
    cutoffHour: number;
    processingDays: number;
    shippingDaysMin: number;
    shippingDaysMax: number;
    excludeWeekends: boolean;
    timezone: string;
    holidays: string;
    showCountdown: boolean;
    labelText: string;
    countdownText: string;
    countdownSuffix: string;
    iconStyle: string;
    fontSize: number;
    textColor: string;
    backgroundColor: string;
    borderColor: string;
    urgencyColor: string;
  }>
) {
  return prisma.storeConfig.upsert({
    where: { shop },
    update: data,
    create: {
      shop,
      ...data,
    },
  });
}