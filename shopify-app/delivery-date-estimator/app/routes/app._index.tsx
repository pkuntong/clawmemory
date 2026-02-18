import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import {
  PAID_PLAN_NAMES,
  authenticate,
  PLAN_PREMIUM,
  PLAN_PRO,
  isBillingTestMode,
} from "../shopify.server";
import {
  getAnalyticsSummary,
  getOnboardingProgress,
  trackAnalyticsEvent,
  updateOnboardingProgress,
  type OnboardingStepKey,
} from "../db.server";

type PlanKey = "free" | "pro" | "premium";

const ONBOARDING_STEPS: Array<{
  key: OnboardingStepKey;
  label: string;
}> = [
  { key: "themeBlockAdded", label: "Added the app block in Theme Editor." },
  {
    key: "shippingConfigured",
    label: "Configured cutoff, processing, and shipping range in app settings.",
  },
  {
    key: "holidaysValidated",
    label: "Validated holiday/weekend behavior on at least two products.",
  },
  { key: "mobileVerified", label: "Verified rendering and copy on mobile." },
  { key: "billingLive", label: "Switched billing mode to live before launch." },
];

function getActivePlan(subscriptionName: string | undefined): PlanKey {
  if (subscriptionName === PLAN_PREMIUM) {
    return "premium";
  }
  if (subscriptionName === PLAN_PRO) {
    return "pro";
  }
  return "free";
}

function isOnboardingStepKey(value: string): value is OnboardingStepKey {
  return ONBOARDING_STEPS.some((step) => step.key === value);
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing, session } = await authenticate.admin(request);
  const billingTestMode = isBillingTestMode();

  const { appSubscriptions } = await billing.check({
    plans: [...PAID_PLAN_NAMES],
    isTest: billingTestMode,
  });

  const activeSubscription = appSubscriptions.at(0);
  const activePlan = getActivePlan(activeSubscription?.name);
  const themeEditorUrl = `https://${session.shop}/admin/themes/current/editor?context=apps`;
  const onboarding = await getOnboardingProgress(session.shop);
  const completedSteps = ONBOARDING_STEPS.filter((step) => onboarding[step.key]).length;
  const completionPercent = Math.round((completedSteps / ONBOARDING_STEPS.length) * 100);
  const analyticsSummary =
    activePlan === "premium" ? await getAnalyticsSummary(session.shop, 30) : null;

  return {
    activePlan,
    analyticsSummary,
    billingTestMode,
    completionPercent,
    completedSteps,
    onboarding,
    shop: session.shop,
    themeEditorUrl,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent !== "toggle-step") {
    return { success: false, error: "Unknown action." };
  }

  const step = formData.get("step");
  const value = formData.get("value");

  if (typeof step !== "string" || !isOnboardingStepKey(step)) {
    return { success: false, error: "Invalid checklist step." };
  }

  if (value !== "true" && value !== "false") {
    return { success: false, error: "Invalid checklist value." };
  }

  const checked = value === "true";

  await updateOnboardingProgress(session.shop, {
    [step]: checked,
  });

  await trackAnalyticsEvent(session.shop, "onboarding_step_toggled", {
    step,
    checked,
  });

  return { success: true };
};

export default function Index() {
  const {
    activePlan,
    analyticsSummary,
    billingTestMode,
    completionPercent,
    completedSteps,
    onboarding,
    shop,
    themeEditorUrl,
  } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const planLabel = {
    free: "Free",
    pro: "Pro",
    premium: "Premium",
  }[activePlan];

  return (
    <s-page heading="Delivery Date Estimator">
      <s-section heading="Store Status">
        <s-paragraph>
          <s-text>Shop: </s-text>
          <s-text>{shop}</s-text>
        </s-paragraph>
        <s-paragraph>
          <s-text>Active plan: </s-text>
          <s-text>{planLabel}</s-text>
        </s-paragraph>
        <s-paragraph>
          <s-text>Billing mode: </s-text>
          <s-text>{billingTestMode ? "Test" : "Live"}</s-text>
        </s-paragraph>
        <s-stack direction="inline" gap="base">
          <s-link href="/app/settings">Open settings</s-link>
          <s-link href="/app/billing">Manage plan</s-link>
          <s-link href="/app/setup">Open setup guide</s-link>
          <s-link href={themeEditorUrl} target="_blank">
            Open Theme Editor
          </s-link>
        </s-stack>
      </s-section>

      {actionData?.error && (
        <s-section>
          <s-paragraph>{actionData.error}</s-paragraph>
        </s-section>
      )}

      <s-section heading="Activation Checklist">
        <s-paragraph>
          {completedSteps}/{ONBOARDING_STEPS.length} completed ({completionPercent}%)
        </s-paragraph>
        {onboarding.completedAt && (
          <s-paragraph>
            Completed on {new Date(onboarding.completedAt).toLocaleDateString()}.
          </s-paragraph>
        )}

        <s-unordered-list>
          {ONBOARDING_STEPS.map((step) => {
            const checked = onboarding[step.key];

            return (
              <s-list-item key={step.key}>
                <s-stack direction="inline" gap="base">
                  <s-text>{checked ? "✅" : "⬜️"}</s-text>
                  <s-text>{step.label}</s-text>
                  <Form method="post">
                    <input type="hidden" name="intent" value="toggle-step" />
                    <input type="hidden" name="step" value={step.key} />
                    <input type="hidden" name="value" value={checked ? "false" : "true"} />
                    <button type="submit">
                      {checked ? "Mark incomplete" : "Mark complete"}
                    </button>
                  </Form>
                </s-stack>
              </s-list-item>
            );
          })}
        </s-unordered-list>
      </s-section>

      <s-section heading="Analytics Snapshot">
        {activePlan === "premium" ? (
          <>
            <s-paragraph>
              Last {analyticsSummary?.windowDays ?? 30} days:{" "}
              {analyticsSummary?.totalEvents ?? 0} tracked events.
            </s-paragraph>
            {analyticsSummary?.lastEventAt && (
              <s-paragraph>
                Last event: {new Date(analyticsSummary.lastEventAt).toLocaleString()}
              </s-paragraph>
            )}
            {(analyticsSummary?.eventsByName.length ?? 0) > 0 ? (
              <s-unordered-list>
                {analyticsSummary?.eventsByName.slice(0, 5).map((event) => (
                  <s-list-item key={event.name}>
                    {event.name}: {event.count}
                  </s-list-item>
                ))}
              </s-unordered-list>
            ) : (
              <s-paragraph>No events yet. Interact with settings and checklist first.</s-paragraph>
            )}
          </>
        ) : (
          <>
            <s-paragraph>
              Analytics visibility is included in the Premium plan.
            </s-paragraph>
            <s-link href="/app/billing">Upgrade to Premium</s-link>
          </>
        )}
      </s-section>

      <s-section heading="Plan Capabilities">
        <s-unordered-list>
          <s-list-item>
            <s-text>Free: </s-text>
            <s-text>1 configuration, delivery estimate, countdown timer.</s-text>
          </s-list-item>
          <s-list-item>
            <s-text>Pro ($7.99/mo): </s-text>
            <s-text>
              Unlimited configurations, full customization, holidays, priority
              support.
            </s-text>
          </s-list-item>
          <s-list-item>
            <s-text>Premium ($14.99/mo): </s-text>
            <s-text>
              Everything in Pro plus multi-language support, A/B testing, and
              analytics.
            </s-text>
          </s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section slot="aside" heading="Resources">
        <s-unordered-list>
          <s-list-item>
            <s-link href="/app/setup">Setup and testing workflow</s-link>
          </s-list-item>
          <s-list-item>
            <s-link href="https://shopify.dev/docs/apps/billing" target="_blank">
              Shopify billing docs
            </s-link>
          </s-list-item>
          <s-list-item>
            <s-link
              href="https://shopify.dev/docs/apps/build/online-store/theme-app-extensions"
              target="_blank"
            >
              Theme app extension docs
            </s-link>
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
