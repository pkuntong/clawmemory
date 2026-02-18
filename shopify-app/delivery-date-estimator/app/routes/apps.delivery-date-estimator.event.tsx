import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { incrementDailyMetric } from "../db.server";

const VALID_EVENTS = new Set(["widget_impression", "ab_variant_exposed"]);
const VALID_VARIANTS = new Set(["a", "b"]);

const sanitizeSource = (value: string | null | undefined) =>
  value?.toLowerCase().replace(/[^a-z0-9_]/g, "") || "unknown";

const toStringOrNull = (value: unknown) =>
  typeof value === "string" ? value : null;

export async function loader() {
  return data({ error: "Method not allowed" }, { status: 405 });
}

export async function action({ request }: ActionFunctionArgs) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const source = sanitizeSource(url.searchParams.get("source"));

  if (!shop) {
    return data({ error: "Missing shop parameter" }, { status: 400 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    // Ignore malformed payloads from storefront beacons.
  }

  const rawEvent = toStringOrNull(payload.event) ?? url.searchParams.get("event");
  const event = rawEvent?.toLowerCase() ?? "";

  if (!VALID_EVENTS.has(event)) {
    return new Response(null, { status: 204 });
  }

  await incrementDailyMetric(shop, `storefront_event_${event}`);
  await incrementDailyMetric(shop, `storefront_event_${event}_source_${source}`);

  const variant = toStringOrNull(payload.variant)?.toLowerCase() ?? "";
  if (VALID_VARIANTS.has(variant)) {
    await incrementDailyMetric(shop, `storefront_event_${event}_variant_${variant}`);
    await incrementDailyMetric(
      shop,
      `storefront_event_${event}_variant_${variant}_source_${source}`,
    );
  }

  return new Response(null, { status: 204 });
}
