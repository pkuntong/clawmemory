import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import {
  PAID_PLAN_NAMES,
  authenticate,
  PLAN_PREMIUM,
  PLAN_PRO,
  isBillingTestMode,
} from "../shopify.server";

type PlanKey = "free" | "pro" | "premium";

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
  const billingTestMode = isBillingTestMode();

  const { appSubscriptions } = await billing.check({
    plans: [...PAID_PLAN_NAMES],
    isTest: billingTestMode,
  });

  const activeSubscription = appSubscriptions.at(0);
  const activePlan = getActivePlan(activeSubscription?.name);
  const themeEditorUrl = `https://${session.shop}/admin/themes/current/editor?context=apps`;

  return {
    activePlan,
    billingTestMode,
    shop: session.shop,
    themeEditorUrl,
  };
};

export default function Index() {
  const { activePlan, billingTestMode, shop, themeEditorUrl } =
    useLoaderData<typeof loader>();

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
          <s-link href="/app/billing">Manage plan</s-link>
          <s-link href="/app/setup">Open setup guide</s-link>
          <s-link href={themeEditorUrl} target="_blank">
            Open Theme Editor
          </s-link>
        </s-stack>
      </s-section>

      <s-section heading="Launch Checklist">
        <s-unordered-list>
          <s-list-item>Add the app block in Online Store Theme Editor.</s-list-item>
          <s-list-item>
            Configure cutoff hour, processing days, and shipping range.
          </s-list-item>
          <s-list-item>
            Confirm weekend and holiday behavior on at least two products.
          </s-list-item>
          <s-list-item>
            Verify mobile rendering and checkout conversion copy.
          </s-list-item>
          <s-list-item>Switch billing from test mode before App Store submission.</s-list-item>
        </s-unordered-list>
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
