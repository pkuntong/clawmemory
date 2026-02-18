import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, redirect, useActionData, useLoaderData } from "react-router";
import {
  PAID_PLAN_NAMES,
  PLAN_PREMIUM,
  PLAN_PRO,
  authenticate,
  isBillingTestMode,
} from "../shopify.server";
import { incrementDailyMetric, trackAnalyticsEvent } from "../db.server";

type PlanKey = "free" | "pro" | "premium";

const PLAN_DETAILS = {
  free: {
    name: "Free",
    price: "Free",
    features: [
      "1 shipping configuration",
      "Delivery estimate",
      "Countdown timer",
      "Standard customization",
    ],
  },
  pro: {
    name: "Pro",
    price: "$7.99/mo",
    features: [
      "Unlimited shipping configurations",
      "Full color and text customization",
      "Holiday calendar",
      "Priority support",
    ],
  },
  premium: {
    name: "Premium",
    price: "$14.99/mo",
    features: [
      "Everything in Pro",
      "Multi-language support",
      "A/B testing",
      "Conversion analytics",
      "Dedicated support",
    ],
  },
} as const;

const VALID_PLANS: PlanKey[] = ["free", "pro", "premium"];

function getActivePlan(subscriptionName: string | undefined): PlanKey {
  if (subscriptionName === PLAN_PREMIUM) {
    return "premium";
  }
  if (subscriptionName === PLAN_PRO) {
    return "pro";
  }
  return "free";
}

function getRequestedPlan(planValue: FormDataEntryValue | null): PlanKey | null {
  if (typeof planValue !== "string") {
    return null;
  }

  if (VALID_PLANS.includes(planValue as PlanKey)) {
    return planValue as PlanKey;
  }

  return null;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing } = await authenticate.admin(request);
  const billingTestMode = isBillingTestMode();

  const { appSubscriptions } = await billing.check({
    plans: [...PAID_PLAN_NAMES],
    isTest: billingTestMode,
  });

  const activeSubscription = appSubscriptions.at(0);

  return {
    billingTestMode,
    currentPlan: getActivePlan(activeSubscription?.name),
    activeSubscriptionId: activeSubscription?.id ?? null,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing, session } = await authenticate.admin(request);
  const billingTestMode = isBillingTestMode();
  const formData = await request.formData();
  const requestedPlan = getRequestedPlan(formData.get("plan"));

  if (!requestedPlan) {
    return { error: "Invalid plan requested." };
  }

  if (requestedPlan === "free") {
    const subscriptionId = formData.get("subscriptionId");
    if (typeof subscriptionId !== "string" || !subscriptionId) {
      return { error: "No active paid subscription found to cancel." };
    }

    await trackAnalyticsEvent(session.shop, "billing_downgrade_requested", {
      requestedPlan,
      billingTestMode,
    });
    await incrementDailyMetric(session.shop, "billing_downgrade_requested");

    await billing.cancel({
      subscriptionId,
      isTest: billingTestMode,
      prorate: true,
    });

    return redirect("/app/billing");
  }

  await trackAnalyticsEvent(session.shop, "billing_upgrade_requested", {
    requestedPlan,
    billingTestMode,
  });
  await incrementDailyMetric(session.shop, "billing_upgrade_requested");

  await billing.request({
    plan: requestedPlan === "pro" ? PLAN_PRO : PLAN_PREMIUM,
    isTest: billingTestMode,
    returnUrl: `${new URL(request.url).origin}/app/billing`,
  });

  return null;
};

export default function BillingPage() {
  const { activeSubscriptionId, billingTestMode, currentPlan } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <s-page heading="Billing">
      {billingTestMode && (
        <s-section>
          <s-paragraph>
            Billing is currently running in test mode. Set
            `SHOPIFY_BILLING_TEST_MODE=false` in production.
          </s-paragraph>
        </s-section>
      )}

      {actionData?.error && (
        <s-section>
          <s-paragraph>{actionData.error}</s-paragraph>
        </s-section>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        {VALID_PLANS.map((planKey) => {
          const plan = PLAN_DETAILS[planKey];
          const isCurrent = currentPlan === planKey;
          const canDowngrade = planKey !== "free" || Boolean(activeSubscriptionId);

          let ctaLabel = "Current plan";
          if (!isCurrent && planKey === "free") {
            ctaLabel = "Downgrade to Free";
          } else if (!isCurrent && currentPlan === "free") {
            ctaLabel = `Upgrade to ${plan.name}`;
          } else if (!isCurrent) {
            ctaLabel = `Switch to ${plan.name}`;
          }

          return (
            <section
              key={planKey}
              style={{
                border: "1px solid #d9d9d9",
                borderRadius: 12,
                padding: 16,
                background: "#fff",
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: 8 }}>{plan.name}</h2>
              <p style={{ marginTop: 0, marginBottom: 12, fontWeight: 700 }}>
                {plan.price}
              </p>
              <ul style={{ marginTop: 0, paddingLeft: 18 }}>
                {plan.features.map((feature) => (
                  <li key={feature} style={{ marginBottom: 6 }}>
                    {feature}
                  </li>
                ))}
              </ul>

              <Form method="post">
                <input type="hidden" name="plan" value={planKey} />
                {planKey === "free" && activeSubscriptionId && (
                  <input
                    type="hidden"
                    name="subscriptionId"
                    value={activeSubscriptionId}
                  />
                )}
                <button
                  type="submit"
                  disabled={isCurrent || !canDowngrade}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1px solid #0f172a",
                    background: isCurrent ? "#f3f4f6" : "#0f172a",
                    color: isCurrent ? "#374151" : "#ffffff",
                    cursor: isCurrent ? "default" : "pointer",
                    fontWeight: 600,
                  }}
                >
                  {ctaLabel}
                </button>
              </Form>
            </section>
          );
        })}
      </div>
    </s-page>
  );
}
