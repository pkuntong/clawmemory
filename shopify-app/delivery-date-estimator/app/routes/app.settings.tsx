import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { getStoreConfig, trackAnalyticsEvent, upsertStoreConfig } from "../db.server";
import {
  PAID_PLAN_NAMES,
  PLAN_PREMIUM,
  PLAN_PRO,
  authenticate,
  isBillingTestMode,
} from "../shopify.server";

type PlanKey = "free" | "pro" | "premium";

const ICON_STYLE_OPTIONS = ["truck", "package", "clock", "none"] as const;
type IconStyle = (typeof ICON_STYLE_OPTIONS)[number];

const DEFAULTS = {
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
  iconStyle: "truck",
  fontSize: 14,
  textColor: "#333333",
  backgroundColor: "#f8f9fa",
  borderColor: "#e2e2e2",
  urgencyColor: "#e63946",
} as const;

const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney",
];

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const isValidIsoDate = (value: string) => {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const parseStoredHolidays = (raw: string | null | undefined): string[] => {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return Array.from(
      new Set(
        parsed
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter((value) => value !== "" && isValidIsoDate(value)),
      ),
    ).sort();
  } catch {
    return [];
  }
};

const parseHolidayInput = (raw: string) => {
  const candidates = raw
    .split(/[,\n]/g)
    .map((value) => value.trim())
    .filter((value) => value !== "");

  const valid: string[] = [];
  const invalid: string[] = [];

  for (const value of candidates) {
    if (isValidIsoDate(value)) {
      valid.push(value);
    } else {
      invalid.push(value);
    }
  }

  return {
    holidays: Array.from(new Set(valid)).sort(),
    invalid,
  };
};

const isIconStyle = (value: string): value is IconStyle => {
  return ICON_STYLE_OPTIONS.includes(value as IconStyle);
};

const normalizedColor = (value: string, fallback: string) => {
  if (!HEX_COLOR_PATTERN.test(value)) return fallback;
  return value.length === 4
    ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
    : value;
};

function getActivePlan(subscriptionName: string | undefined): PlanKey {
  if (subscriptionName === PLAN_PREMIUM) {
    return "premium";
  }
  if (subscriptionName === PLAN_PRO) {
    return "pro";
  }
  return "free";
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing, session } = await authenticate.admin(request);
  const { appSubscriptions } = await billing.check({
    plans: [...PAID_PLAN_NAMES],
    isTest: isBillingTestMode(),
  });
  const activePlan = getActivePlan(appSubscriptions.at(0)?.name);
  const premiumUnlocked = activePlan === "premium";
  const rawConfig = await getStoreConfig(session.shop);
  const config = rawConfig
    ? {
        ...rawConfig,
        holidays: parseStoredHolidays(rawConfig.holidays),
      }
    : null;

  return { shop: session.shop, config, activePlan, premiumUnlocked };
};

type ActionData = {
  success: boolean;
  errors?: string[];
  warnings?: string[];
};

const getInt = (
  formData: FormData,
  key: string,
  fallback: number,
  options?: { min?: number; max?: number },
) => {
  const raw = formData.get(key);
  if (typeof raw !== "string" || raw.trim() === "") return fallback;

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) return fallback;

  if (typeof options?.min === "number" && parsed < options.min) return options.min;
  if (typeof options?.max === "number" && parsed > options.max) return options.max;
  return parsed;
};

const getText = (formData: FormData, key: string, fallback: string) => {
  const raw = formData.get(key);
  if (typeof raw !== "string") return fallback;
  const value = raw.trim();
  return value || fallback;
};

export const action = async ({ request }: ActionFunctionArgs): Promise<ActionData> => {
  const { billing, session } = await authenticate.admin(request);
  const warnings: string[] = [];
  const formData = await request.formData();
  const errors: string[] = [];
  const { appSubscriptions } = await billing.check({
    plans: [...PAID_PLAN_NAMES],
    isTest: isBillingTestMode(),
  });
  const activePlan = getActivePlan(appSubscriptions.at(0)?.name);
  const premiumUnlocked = activePlan === "premium";

  const shippingDaysMin = getInt(formData, "shippingDaysMin", DEFAULTS.shippingDaysMin, {
    min: 0,
    max: 60,
  });
  const shippingDaysMax = getInt(formData, "shippingDaysMax", DEFAULTS.shippingDaysMax, {
    min: 0,
    max: 60,
  });
  const cutoffHour = getInt(formData, "cutoffHour", DEFAULTS.cutoffHour, {
    min: 0,
    max: 23,
  });
  const processingDays = getInt(formData, "processingDays", DEFAULTS.processingDays, {
    min: 0,
    max: 30,
  });
  const timezone = getText(formData, "timezone", DEFAULTS.timezone);
  const iconStyleRaw = getText(formData, "iconStyle", DEFAULTS.iconStyle).toLowerCase();
  const fontSize = getInt(formData, "fontSize", DEFAULTS.fontSize, { min: 10, max: 48 });
  const labelText = getText(formData, "labelText", DEFAULTS.labelText);
  const countdownText = getText(formData, "countdownText", DEFAULTS.countdownText);
  const countdownSuffix = getText(formData, "countdownSuffix", DEFAULTS.countdownSuffix);
  const textColor = getText(formData, "textColor", DEFAULTS.textColor);
  const backgroundColor = getText(formData, "backgroundColor", DEFAULTS.backgroundColor);
  const borderColor = getText(formData, "borderColor", DEFAULTS.borderColor);
  const urgencyColor = getText(formData, "urgencyColor", DEFAULTS.urgencyColor);
  const holidaysInput = getText(formData, "holidays", "");
  const { holidays, invalid } = parseHolidayInput(holidaysInput);
  const submittedPremiumFields = [
    "holidays",
    "countdownSuffix",
    "iconStyle",
    "fontSize",
    "textColor",
    "backgroundColor",
    "borderColor",
    "urgencyColor",
  ].some((field) => formData.has(field));

  if (shippingDaysMax < shippingDaysMin) {
    errors.push("Max shipping days must be greater than or equal to min shipping days.");
  }

  if (!timezone.includes("/")) {
    errors.push("Timezone must be an IANA value like America/New_York.");
  }

  if (timezone.length > 80) {
    errors.push("Timezone is too long.");
  }

  if (premiumUnlocked && !isIconStyle(iconStyleRaw)) {
    errors.push("Icon style must be one of: truck, package, clock, or none.");
  }

  if (labelText.length > 80 || countdownText.length > 80) {
    errors.push("Label and countdown text fields must be 80 characters or fewer.");
  }

  if (premiumUnlocked && countdownSuffix.length > 80) {
    errors.push("Countdown suffix must be 80 characters or fewer.");
  }

  if (premiumUnlocked) {
    for (const [name, value] of [
      ["Text color", textColor],
      ["Background color", backgroundColor],
      ["Border color", borderColor],
      ["Urgency color", urgencyColor],
    ]) {
      if (!HEX_COLOR_PATTERN.test(value)) {
        errors.push(`${name} must be a valid hex color (for example #333333).`);
      }
    }
  }

  if (premiumUnlocked && invalid.length > 0) {
    const sample = invalid.slice(0, 5).join(", ");
    const suffix = invalid.length > 5 ? ` (+${invalid.length - 5} more)` : "";
    errors.push(
      `Invalid holiday dates: ${sample}${suffix}. Use YYYY-MM-DD format (for example 2026-12-25).`,
    );
  }

  if (!premiumUnlocked && submittedPremiumFields) {
    warnings.push(
      "Advanced styling and holiday calendar are Premium features. Upgrade to Premium to edit them.",
    );
  }

  if (errors.length > 0) {
    await trackAnalyticsEvent(session.shop, "settings_save_failed", {
      errors,
      activePlan,
    });
    return { success: false, errors, warnings };
  }

  const updateData = {
    cutoffHour,
    processingDays,
    shippingDaysMin,
    shippingDaysMax,
    excludeWeekends: formData.get("excludeWeekends") === "on",
    timezone,
    showCountdown: formData.get("showCountdown") === "on",
    labelText,
    countdownText,
  } as Parameters<typeof upsertStoreConfig>[1];

  if (premiumUnlocked) {
    updateData.holidays = JSON.stringify(holidays);
    updateData.countdownSuffix = countdownSuffix;
    updateData.iconStyle = iconStyleRaw;
    updateData.fontSize = fontSize;
    updateData.textColor = normalizedColor(textColor, DEFAULTS.textColor);
    updateData.backgroundColor = normalizedColor(backgroundColor, DEFAULTS.backgroundColor);
    updateData.borderColor = normalizedColor(borderColor, DEFAULTS.borderColor);
    updateData.urgencyColor = normalizedColor(urgencyColor, DEFAULTS.urgencyColor);
  }

  await upsertStoreConfig(session.shop, updateData);
  await trackAnalyticsEvent(session.shop, "settings_saved", {
    activePlan,
    premiumUnlocked,
    warningsCount: warnings.length,
  });

  return { success: true, warnings };
};

export default function SettingsPage() {
  const { activePlan, config, premiumUnlocked } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const c = {
    ...DEFAULTS,
    ...(config || {}),
    holidays: Array.isArray(config?.holidays) ? config.holidays : DEFAULTS.holidays,
  };

  const iconStyle = isIconStyle(c.iconStyle) ? c.iconStyle : DEFAULTS.iconStyle;
  const holidayText = c.holidays.join("\n");
  const actionErrors = actionData?.errors ?? [];
  const actionWarnings = actionData?.warnings ?? [];

  return (
    <s-page heading="Delivery Settings">
      {actionData?.success && (
        <s-section>
          <s-paragraph>
            Saved. Theme extension requests to <code>/api/config</code> will return the updated
            values.
          </s-paragraph>
        </s-section>
      )}
      {actionErrors.length > 0 && (
        <s-section>
          <s-paragraph>Could not save settings. Fix the following:</s-paragraph>
          <ul style={{ marginTop: 8 }}>
            {actionErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </s-section>
      )}
      {actionWarnings.length > 0 && (
        <s-section>
          <s-paragraph>Note:</s-paragraph>
          <ul style={{ marginTop: 8 }}>
            {actionWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </s-section>
      )}

      {!premiumUnlocked && (
        <s-section>
          <s-paragraph>
            You are on the <strong>{activePlan}</strong> plan. Holiday calendar and advanced
            style controls are available on <strong>Premium</strong>.
          </s-paragraph>
          <s-link href="/app/billing">Upgrade to Premium</s-link>
        </s-section>
      )}

      <Form method="post">
        <s-section heading="Shipping Rules">
          <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
            <label>
              Cutoff Hour (24h)
              <input
                name="cutoffHour"
                type="number"
                min={0}
                max={23}
                step={1}
                defaultValue={c.cutoffHour}
              />
            </label>
            <label>
              Processing Days
              <input
                name="processingDays"
                type="number"
                min={0}
                max={30}
                step={1}
                defaultValue={c.processingDays}
              />
            </label>
            <label>
              Min Shipping Days
              <input
                name="shippingDaysMin"
                type="number"
                min={0}
                max={60}
                step={1}
                defaultValue={c.shippingDaysMin}
              />
            </label>
            <label>
              Max Shipping Days
              <input
                name="shippingDaysMax"
                type="number"
                min={0}
                max={60}
                step={1}
                defaultValue={c.shippingDaysMax}
              />
            </label>
            <label>
              <input
                name="excludeWeekends"
                type="checkbox"
                defaultChecked={c.excludeWeekends}
              />
              Exclude weekends
            </label>
            <label>
              Timezone
              <input
                name="timezone"
                defaultValue={c.timezone}
                list="timezone-options"
                maxLength={80}
              />
            </label>
            <datalist id="timezone-options">
              {COMMON_TIMEZONES.map((timezone) => (
                <option key={timezone} value={timezone} />
              ))}
            </datalist>
          </div>
        </s-section>

        <s-section heading="Display">
          <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
            <label>
              <input name="showCountdown" type="checkbox" defaultChecked={c.showCountdown} />
              Show countdown
            </label>
            <label>
              Label Text
              <input name="labelText" defaultValue={c.labelText} maxLength={80} />
            </label>
            <label>
              Countdown Text
              <input name="countdownText" defaultValue={c.countdownText} maxLength={80} />
            </label>
          </div>
        </s-section>

        {premiumUnlocked && (
          <>
            <s-section heading="Holidays (Skipped Dates)">
              <div style={{ display: "grid", gap: 8, maxWidth: 520 }}>
                <label htmlFor="holidays-input">
                  Holiday Dates (one per line or comma-separated)
                </label>
                <textarea
                  id="holidays-input"
                  name="holidays"
                  rows={6}
                  defaultValue={holidayText}
                  placeholder={"2026-11-26\n2026-12-25\n2027-01-01"}
                />
                <small>
                  Use YYYY-MM-DD format. These dates will be excluded from delivery estimates.
                </small>
              </div>
            </s-section>

            <s-section heading="Advanced Display (Premium)">
              <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
                <label>
                  Countdown Suffix
                  <input
                    name="countdownSuffix"
                    defaultValue={c.countdownSuffix}
                    maxLength={80}
                  />
                </label>
                <label>
                  Icon Style
                  <select name="iconStyle" defaultValue={iconStyle}>
                    <option value="truck">Truck</option>
                    <option value="package">Package</option>
                    <option value="clock">Clock</option>
                    <option value="none">None</option>
                  </select>
                </label>
                <label>
                  Font Size
                  <input
                    name="fontSize"
                    type="number"
                    min={10}
                    max={48}
                    step={1}
                    defaultValue={c.fontSize}
                  />
                </label>
                <label>
                  Text Color
                  <input
                    name="textColor"
                    type="color"
                    defaultValue={normalizedColor(c.textColor, DEFAULTS.textColor)}
                  />
                </label>
                <label>
                  Background Color
                  <input
                    name="backgroundColor"
                    type="color"
                    defaultValue={normalizedColor(c.backgroundColor, DEFAULTS.backgroundColor)}
                  />
                </label>
                <label>
                  Border Color
                  <input
                    name="borderColor"
                    type="color"
                    defaultValue={normalizedColor(c.borderColor, DEFAULTS.borderColor)}
                  />
                </label>
                <label>
                  Urgency Color
                  <input
                    name="urgencyColor"
                    type="color"
                    defaultValue={normalizedColor(c.urgencyColor, DEFAULTS.urgencyColor)}
                  />
                </label>
              </div>
            </s-section>
          </>
        )}

        <button type="submit">Save Settings</button>
      </Form>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
