import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { getStoreConfig, upsertStoreConfig } from "../db.server";
import { authenticate } from "../shopify.server";

const DEFAULTS = {
  cutoffHour: 14,
  processingDays: 1,
  shippingDaysMin: 3,
  shippingDaysMax: 5,
  excludeWeekends: true,
  timezone: "America/New_York",
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

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const config = await getStoreConfig(session.shop);
  return { shop: session.shop, config };
};

type ActionData = {
  success: boolean;
  error?: string;
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
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const shippingDaysMin = getInt(formData, "shippingDaysMin", DEFAULTS.shippingDaysMin, {
    min: 0,
  });
  const shippingDaysMax = getInt(formData, "shippingDaysMax", DEFAULTS.shippingDaysMax, {
    min: 0,
  });

  if (shippingDaysMax < shippingDaysMin) {
    return {
      success: false,
      error: "Max shipping days must be greater than or equal to min shipping days.",
    };
  }

  await upsertStoreConfig(session.shop, {
    cutoffHour: getInt(formData, "cutoffHour", DEFAULTS.cutoffHour, { min: 0, max: 23 }),
    processingDays: getInt(formData, "processingDays", DEFAULTS.processingDays, { min: 0 }),
    shippingDaysMin,
    shippingDaysMax,
    excludeWeekends: formData.get("excludeWeekends") === "on",
    timezone: getText(formData, "timezone", DEFAULTS.timezone),
    showCountdown: formData.get("showCountdown") === "on",
    labelText: getText(formData, "labelText", DEFAULTS.labelText),
    countdownText: getText(formData, "countdownText", DEFAULTS.countdownText),
    countdownSuffix: getText(formData, "countdownSuffix", DEFAULTS.countdownSuffix),
    iconStyle: getText(formData, "iconStyle", DEFAULTS.iconStyle),
    fontSize: getInt(formData, "fontSize", DEFAULTS.fontSize, { min: 10, max: 48 }),
    textColor: getText(formData, "textColor", DEFAULTS.textColor),
    backgroundColor: getText(formData, "backgroundColor", DEFAULTS.backgroundColor),
    borderColor: getText(formData, "borderColor", DEFAULTS.borderColor),
    urgencyColor: getText(formData, "urgencyColor", DEFAULTS.urgencyColor),
  });

  return { success: true };
};

export default function SettingsPage() {
  const { config } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const c = { ...DEFAULTS, ...(config || {}) };

  return (
    <s-page heading="Delivery Settings">
      {actionData?.success && (
        <s-section>
          <s-paragraph>Saved.</s-paragraph>
        </s-section>
      )}
      {actionData?.error && (
        <s-section>
          <s-paragraph>{actionData.error}</s-paragraph>
        </s-section>
      )}

      <Form method="post">
        <s-section heading="Shipping Rules">
          <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
            <label>
              Cutoff Hour (24h)
              <input name="cutoffHour" type="number" defaultValue={c.cutoffHour} />
            </label>
            <label>
              Processing Days
              <input name="processingDays" type="number" defaultValue={c.processingDays} />
            </label>
            <label>
              Min Shipping Days
              <input name="shippingDaysMin" type="number" defaultValue={c.shippingDaysMin} />
            </label>
            <label>
              Max Shipping Days
              <input name="shippingDaysMax" type="number" defaultValue={c.shippingDaysMax} />
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
              <input name="timezone" defaultValue={c.timezone} />
            </label>
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
              <input name="labelText" defaultValue={c.labelText} />
            </label>
            <label>
              Countdown Text
              <input name="countdownText" defaultValue={c.countdownText} />
            </label>
            <label>
              Countdown Suffix
              <input name="countdownSuffix" defaultValue={c.countdownSuffix} />
            </label>
            <label>
              Icon Style
              <input name="iconStyle" defaultValue={c.iconStyle} />
            </label>
            <label>
              Font Size
              <input name="fontSize" type="number" defaultValue={c.fontSize} />
            </label>
            <label>
              Text Color
              <input name="textColor" defaultValue={c.textColor} />
            </label>
            <label>
              Background Color
              <input name="backgroundColor" defaultValue={c.backgroundColor} />
            </label>
            <label>
              Border Color
              <input name="borderColor" defaultValue={c.borderColor} />
            </label>
            <label>
              Urgency Color
              <input name="urgencyColor" defaultValue={c.urgencyColor} />
            </label>
          </div>
        </s-section>

        <button type="submit">Save Settings</button>
      </Form>
    </s-page>
  );
}

export const headers = (args: unknown) => boundary.headers(args);
