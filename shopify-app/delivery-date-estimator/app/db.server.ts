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

export type OnboardingStepKey =
  | "themeBlockAdded"
  | "shippingConfigured"
  | "holidaysValidated"
  | "mobileVerified"
  | "billingLive";

const ONBOARDING_STEP_KEYS: OnboardingStepKey[] = [
  "themeBlockAdded",
  "shippingConfigured",
  "holidaysValidated",
  "mobileVerified",
  "billingLive",
];

const DEFAULT_EVENT_PROPERTIES = "{}";

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

export async function getOnboardingProgress(shop: string) {
  return prisma.onboardingProgress.upsert({
    where: { shop },
    update: {},
    create: { shop },
  });
}

export async function updateOnboardingProgress(
  shop: string,
  patch: Partial<Record<OnboardingStepKey, boolean>>,
) {
  const current = await getOnboardingProgress(shop);

  const next = {
    ...current,
    ...patch,
  };

  const completed = ONBOARDING_STEP_KEYS.every((step) => next[step]);

  return prisma.onboardingProgress.update({
    where: { shop },
    data: {
      ...patch,
      completedAt: completed ? new Date() : null,
    },
  });
}

export async function trackAnalyticsEvent(
  shop: string,
  name: string,
  properties?: Record<string, unknown>,
) {
  return prisma.analyticsEvent.create({
    data: {
      shop,
      name,
      properties: properties
        ? JSON.stringify(properties)
        : DEFAULT_EVENT_PROPERTIES,
    },
  });
}

export async function getAnalyticsSummary(shop: string, windowDays = 30) {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const events = await prisma.analyticsEvent.findMany({
    where: {
      shop,
      createdAt: {
        gte: since,
      },
    },
    select: {
      name: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 1000,
  });

  const counts = new Map<string, number>();
  for (const event of events) {
    counts.set(event.name, (counts.get(event.name) ?? 0) + 1);
  }

  const eventsByName = Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    windowDays,
    totalEvents: events.length,
    lastEventAt: events[0]?.createdAt ?? null,
    eventsByName,
  };
}
