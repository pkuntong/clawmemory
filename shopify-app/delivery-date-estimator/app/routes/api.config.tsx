import type { LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import { getStoreConfig, incrementDailyMetric } from "../db.server";

// Public API endpoint for theme extension
// No auth required — theme extensions can't authenticate
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const source = (url.searchParams.get("source") || "unknown").toLowerCase();

  if (!shop) {
    return data({ error: "Missing shop parameter" }, { status: 400 });
  }

  await incrementDailyMetric(shop, "api_config_requests");
  const sourceKey = source.replace(/[^a-z0-9_]/g, "") || "unknown";
  await incrementDailyMetric(shop, `api_config_source_${sourceKey}`);

  // Get store config or return defaults
  const config = await getStoreConfig(shop);

  if (!config) {
    // Return sensible defaults for new stores
    return data({
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
    });
  }

  return data({
    cutoffHour: config.cutoffHour,
    processingDays: config.processingDays,
    shippingDaysMin: config.shippingDaysMin,
    shippingDaysMax: config.shippingDaysMax,
    excludeWeekends: config.excludeWeekends,
    timezone: config.timezone,
    holidays: JSON.parse(config.holidays || "[]"),
    showCountdown: config.showCountdown,
    labelText: config.labelText,
    countdownText: config.countdownText,
    countdownSuffix: config.countdownSuffix,
    iconStyle: config.iconStyle,
    fontSize: config.fontSize,
    textColor: config.textColor,
    backgroundColor: config.backgroundColor,
    borderColor: config.borderColor,
    urgencyColor: config.urgencyColor,
  });
}
