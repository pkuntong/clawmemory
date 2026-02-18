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

const dateKeyFor = (date: Date) => date.toISOString().slice(0, 10);

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

export async function incrementDailyMetric(
  shop: string,
  key: string,
  by = 1,
  at = new Date(),
) {
  const date = dateKeyFor(at);
  return prisma.dailyMetric.upsert({
    where: {
      shop_key_date: {
        shop,
        key,
        date,
      },
    },
    update: {
      count: {
        increment: by,
      },
    },
    create: {
      shop,
      key,
      date,
      count: by,
    },
  });
}

export async function getDailyMetrics(
  shop: string,
  keys: string[],
  windowDays = 30,
) {
  const days: string[] = [];
  for (let i = windowDays - 1; i >= 0; i -= 1) {
    const day = new Date();
    day.setUTCDate(day.getUTCDate() - i);
    days.push(dateKeyFor(day));
  }

  const fromDate = days[0];
  const rows = await prisma.dailyMetric.findMany({
    where: {
      shop,
      key: { in: keys },
      date: { gte: fromDate },
    },
    select: {
      key: true,
      date: true,
      count: true,
    },
  });

  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(`${row.key}:${row.date}`, row.count);
  }

  const series = keys.map((key) => ({
    key,
    points: days.map((date) => ({
      date,
      count: counts.get(`${key}:${date}`) ?? 0,
    })),
  }));

  const totals = series.map((item) => ({
    key: item.key,
    total: item.points.reduce((sum, point) => sum + point.count, 0),
  }));

  return {
    windowDays,
    days,
    series,
    totals,
  };
}
