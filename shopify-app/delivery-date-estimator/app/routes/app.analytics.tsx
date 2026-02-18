import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import {
  PAID_PLAN_NAMES,
  PLAN_PREMIUM,
  PLAN_PRO,
  authenticate,
  isBillingTestMode,
} from "../shopify.server";
import {
  getAnalyticsSummary,
  getDailyMetrics,
  getOnboardingProgress,
  incrementDailyMetric,
} from "../db.server";

type PlanKey = "free" | "pro" | "premium";

const METRIC_KEYS = [
  "api_config_requests",
  "settings_saved",
  "settings_save_failed",
  "billing_upgrade_requested",
  "billing_downgrade_requested",
  "onboarding_step_toggled",
  "analytics_page_views",
] as const;

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

  const activePlan = getActivePlan(appSubscriptions.at(0)?.name);
  const premiumUnlocked = activePlan === "premium";
  const analyticsSummary = await getAnalyticsSummary(session.shop, 30);
  const dailyMetrics = await getDailyMetrics(session.shop, [...METRIC_KEYS], 30);
  const onboarding = await getOnboardingProgress(session.shop);
  const completedSteps = [
    onboarding.themeBlockAdded,
    onboarding.shippingConfigured,
    onboarding.holidaysValidated,
    onboarding.mobileVerified,
    onboarding.billingLive,
  ].filter(Boolean).length;
  const completionPercent = Math.round((completedSteps / 5) * 100);
  await incrementDailyMetric(session.shop, "analytics_page_views");

  return {
    activePlan,
    analyticsSummary,
    billingTestMode,
    completionPercent,
    completedSteps,
    dailyMetrics,
    onboarding,
    premiumUnlocked,
    shop: session.shop,
  };
};

export default function AnalyticsPage() {
  const {
    activePlan,
    analyticsSummary,
    billingTestMode,
    completionPercent,
    completedSteps,
    dailyMetrics,
    premiumUnlocked,
  } = useLoaderData<typeof loader>();

  const totalFor = (key: string) =>
    dailyMetrics.totals.find((item) => item.key === key)?.total ?? 0;

  const requests = totalFor("api_config_requests");
  const settingsSaved = totalFor("settings_saved");
  const settingsFailed = totalFor("settings_save_failed");
  const upgradeIntents = totalFor("billing_upgrade_requested");
  const downgradeIntents = totalFor("billing_downgrade_requested");
  const upgradeIntentRate =
    settingsSaved > 0 ? Math.round((upgradeIntents / settingsSaved) * 100) : 0;
  const recentRows = dailyMetrics.days.slice(-14);
  const strongPremiumSignal =
    requests >= 1000 || settingsSaved >= 20 || upgradeIntents >= 1;

  return (
    <s-page heading="Analytics">
      <s-section heading="Funnel Snapshot (30 Days)">
        <s-unordered-list>
          <s-list-item>
            Activation checklist: {completedSteps}/5 complete ({completionPercent}%)
          </s-list-item>
          <s-list-item>API config requests: {requests}</s-list-item>
          <s-list-item>Settings saves: {settingsSaved}</s-list-item>
          <s-list-item>Settings save failures: {settingsFailed}</s-list-item>
          <s-list-item>Upgrade intents: {upgradeIntents}</s-list-item>
          <s-list-item>Downgrade intents: {downgradeIntents}</s-list-item>
          <s-list-item>
            Upgrade intent rate from settings saves: {upgradeIntentRate}%
          </s-list-item>
        </s-unordered-list>
      </s-section>

      {!premiumUnlocked && (
        <s-section heading="Premium Analytics">
          <s-paragraph>
            You are on the <strong>{activePlan}</strong> plan.
            {strongPremiumSignal
              ? " Your usage indicates strong value from Premium analytics right now."
              : " Detailed trend tables and top event breakdown are available on Premium."}
          </s-paragraph>
          <s-paragraph>
            {strongPremiumSignal
              ? "Upgrade to Premium to identify the highest-converting settings and justify pricing decisions."
              : "Upgrade to Premium when you are ready to optimize conversion with full data visibility."}
          </s-paragraph>
          <s-link href="/app/billing?src=analytics_paywall">Upgrade to Premium</s-link>
        </s-section>
      )}

      {premiumUnlocked && (
        <>
          <s-section heading="Recent Trend (14 Days)">
            <div style={{ overflowX: "auto" }}>
              <table
                style={{ borderCollapse: "collapse", width: "100%", minWidth: 760 }}
              >
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>
                      Date
                    </th>
                    <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: 8 }}>
                      Requests
                    </th>
                    <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: 8 }}>
                      Saves
                    </th>
                    <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: 8 }}>
                      Save Failures
                    </th>
                    <th style={{ textAlign: "right", borderBottom: "1px solid #ddd", padding: 8 }}>
                      Upgrade Intents
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentRows.map((date) => {
                    const requestCount =
                      dailyMetrics.series
                        .find((series) => series.key === "api_config_requests")
                        ?.points.find((point) => point.date === date)?.count ?? 0;
                    const saveCount =
                      dailyMetrics.series
                        .find((series) => series.key === "settings_saved")
                        ?.points.find((point) => point.date === date)?.count ?? 0;
                    const failedCount =
                      dailyMetrics.series
                        .find((series) => series.key === "settings_save_failed")
                        ?.points.find((point) => point.date === date)?.count ?? 0;
                    const upgradeCount =
                      dailyMetrics.series
                        .find((series) => series.key === "billing_upgrade_requested")
                        ?.points.find((point) => point.date === date)?.count ?? 0;

                    return (
                      <tr key={date}>
                        <td style={{ borderBottom: "1px solid #f0f0f0", padding: 8 }}>{date}</td>
                        <td
                          style={{
                            borderBottom: "1px solid #f0f0f0",
                            padding: 8,
                            textAlign: "right",
                          }}
                        >
                          {requestCount}
                        </td>
                        <td
                          style={{
                            borderBottom: "1px solid #f0f0f0",
                            padding: 8,
                            textAlign: "right",
                          }}
                        >
                          {saveCount}
                        </td>
                        <td
                          style={{
                            borderBottom: "1px solid #f0f0f0",
                            padding: 8,
                            textAlign: "right",
                          }}
                        >
                          {failedCount}
                        </td>
                        <td
                          style={{
                            borderBottom: "1px solid #f0f0f0",
                            padding: 8,
                            textAlign: "right",
                          }}
                        >
                          {upgradeCount}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </s-section>

          <s-section heading="Top Events (30 Days)">
            {(analyticsSummary.eventsByName.length ?? 0) > 0 ? (
              <s-unordered-list>
                {analyticsSummary.eventsByName.slice(0, 12).map((event) => (
                  <s-list-item key={event.name}>
                    {event.name}: {event.count}
                  </s-list-item>
                ))}
              </s-unordered-list>
            ) : (
              <s-paragraph>No events captured yet.</s-paragraph>
            )}
            {analyticsSummary.lastEventAt && (
              <s-paragraph>
                Last event at {new Date(analyticsSummary.lastEventAt).toLocaleString()}.
              </s-paragraph>
            )}
          </s-section>
        </>
      )}

      <s-section slot="aside" heading="Notes">
        <s-unordered-list>
          <s-list-item>Billing mode: {billingTestMode ? "Test" : "Live"}</s-list-item>
          <s-list-item>
            These metrics are captured in-app and stored per shop in your app database.
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
