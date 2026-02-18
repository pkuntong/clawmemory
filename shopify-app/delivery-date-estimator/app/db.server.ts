import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient;
}

if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient();
  }
}

const prisma = global.prismaGlobal ?? new PrismaClient();

export default prisma;

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
  }>,
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
