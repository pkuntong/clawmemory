import prisma from "../db.server";

export interface StoreConfigInput {
  cutoffHour?: number;
  processingDays?: number;
  shippingDaysMin?: number;
  shippingDaysMax?: number;
  excludeWeekends?: boolean;
  timezone?: string;
  holidays?: string[];
  showCountdown?: boolean;
  labelText?: string;
  countdownText?: string;
  countdownSuffix?: string;
  iconStyle?: string;
  fontSize?: number;
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  urgencyColor?: string;
}

export async function getStoreConfig(shop: string) {
  const config = await prisma.storeConfig.findUnique({
    where: { shop },
  });
  
  if (!config) {
    // Return default config
    return {
      id: null,
      shop,
      cutoffHour: 14,
      processingDays: 1,
      shippingDaysMin: 3,
      shippingDaysMax: 5,
      excludeWeekends: true,
      timezone: "America/New_York",
      holidays: [],
      showCountdown: true,
      labelText: "Estimated delivery",
      countdownText: "Order within",
      countdownSuffix: "to get it by",
      iconStyle: "truck",
      fontSize: 14,
      textColor: "#333333",
      backgroundColor: "#f8f9fa",
      borderColor: "#e2e2e2",
      urgencyColor: "#e63946",
    };
  }
  
  return {
    ...config,
    holidays: config.holidays ? JSON.parse(config.holidays) : [],
  };
}

export async function upsertStoreConfig(
  shop: string,
  sessionId: string,
  data: StoreConfigInput
) {
  const holidaysJson = data.holidays ? JSON.stringify(data.holidays) : "[]";
  
  return prisma.storeConfig.upsert({
    where: { shop },
    create: {
      shop,
      sessionId,
      cutoffHour: data.cutoffHour ?? 14,
      processingDays: data.processingDays ?? 1,
      shippingDaysMin: data.shippingDaysMin ?? 3,
      shippingDaysMax: data.shippingDaysMax ?? 5,
      excludeWeekends: data.excludeWeekends ?? true,
      timezone: data.timezone ?? "America/New_York",
      holidays: holidaysJson,
      showCountdown: data.showCountdown ?? true,
      labelText: data.labelText ?? "Estimated delivery",
      countdownText: data.countdownText ?? "Order within",
      countdownSuffix: data.countdownSuffix ?? "to get it by",
      iconStyle: data.iconStyle ?? "truck",
      fontSize: data.fontSize ?? 14,
      textColor: data.textColor ?? "#333333",
      backgroundColor: data.backgroundColor ?? "#f8f9fa",
      borderColor: data.borderColor ?? "#e2e2e2",
      urgencyColor: data.urgencyColor ?? "#e63946",
    },
    update: {
      cutoffHour: data.cutoffHour,
      processingDays: data.processingDays,
      shippingDaysMin: data.shippingDaysMin,
      shippingDaysMax: data.shippingDaysMax,
      excludeWeekends: data.excludeWeekends,
      timezone: data.timezone,
      holidays: holidaysJson,
      showCountdown: data.showCountdown,
      labelText: data.labelText,
      countdownText: data.countdownText,
      countdownSuffix: data.countdownSuffix,
      iconStyle: data.iconStyle,
      fontSize: data.fontSize,
      textColor: data.textColor,
      backgroundColor: data.backgroundColor,
      borderColor: data.borderColor,
      urgencyColor: data.urgencyColor,
    },
  });
}

export async function deleteStoreConfig(shop: string) {
  return prisma.storeConfig.delete({
    where: { shop },
  });
}
