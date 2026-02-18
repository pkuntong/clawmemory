import type { LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import { getStoreConfig, incrementDailyMetric } from "../db.server";

const DEFAULT_CONFIG = {
  cutoffHour: 14,
  processingDays: 1,
  shippingDaysMin: 3,
  shippingDaysMax: 5,
  excludeWeekends: true,
  timezone: "America/New_York",
  holidays: [] as string[],
  showCountdown: true,
  labelText: "Estimated delivery",
  countdownText: "Order within",
  countdownSuffix: "to get it by",
  abTestEnabled: false,
  abTestSplit: 50,
  labelTextVariantB: "",
  countdownTextVariantB: "",
  countdownSuffixVariantB: "",
  iconStyle: "truck",
  fontSize: 14,
  textColor: "#333333",
  backgroundColor: "#f8f9fa",
  borderColor: "#e2e2e2",
  urgencyColor: "#e63946",
};

function safeParseHolidays(raw: string | null | undefined) {
  if (!raw) return [] as string[];

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const source = (url.searchParams.get("source") || "app_proxy").toLowerCase();

  if (!shop) {
    return data({ error: "Missing shop parameter" }, { status: 400 });
  }

  const sourceKey = source.replace(/[^a-z0-9_]/g, "") || "unknown";
  await incrementDailyMetric(shop, "api_config_requests");
  await incrementDailyMetric(shop, `api_config_source_${sourceKey}`);

  const config = await getStoreConfig(shop);
  if (!config) {
    return data(DEFAULT_CONFIG, {
      headers: {
        "Cache-Control": "public, max-age=60",
      },
    });
  }

  return data(
    {
      cutoffHour: config.cutoffHour,
      processingDays: config.processingDays,
      shippingDaysMin: config.shippingDaysMin,
      shippingDaysMax: config.shippingDaysMax,
      excludeWeekends: config.excludeWeekends,
      timezone: config.timezone,
      holidays: safeParseHolidays(config.holidays),
      showCountdown: config.showCountdown,
      labelText: config.labelText,
      countdownText: config.countdownText,
      countdownSuffix: config.countdownSuffix,
      abTestEnabled: config.abTestEnabled,
      abTestSplit: config.abTestSplit,
      labelTextVariantB: config.labelTextVariantB,
      countdownTextVariantB: config.countdownTextVariantB,
      countdownSuffixVariantB: config.countdownSuffixVariantB,
      iconStyle: config.iconStyle,
      fontSize: config.fontSize,
      textColor: config.textColor,
      backgroundColor: config.backgroundColor,
      borderColor: config.borderColor,
      urgencyColor: config.urgencyColor,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60",
      },
    },
  );
}
