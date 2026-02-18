/**
 * BILLING INTEGRATION
 * 
 * This file handles Shopify subscription billing.
 * It creates recurring charges when merchants upgrade to Pro or Premium.
 * 
 * HOW TO USE:
 * 1. Copy this file into your app's: app/routes/app.billing.jsx
 * 2. The billing page will be available in your app's admin panel
 * 3. When a merchant clicks "Upgrade", Shopify handles the payment
 * 4. You get paid monthly via your Shopify Partner account
 * 
 * HOW SHOPIFY BILLING WORKS:
 * - Shopify collects payment from the merchant
 * - Shopify takes 0% on your first $1M in revenue (then 15%)
 * - Shopify pays you via your Partner account (direct deposit)
 * - Merchants see the charge on their Shopify bill
 * - You never handle credit cards or payment info
 */

import { json, redirect } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import {
  Page,
  Layout,
  Card,
  Button,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Box,
  Divider,
  Icon,
  Banner,
} from "@shopify/polaris";

// Define your pricing plans
const PLANS = {
  free: {
    name: "Free",
    price: 0,
    features: [
      "1 shipping configuration",
      "Basic delivery estimate",
      "Countdown timer",
      "Standard icons (truck, package, clock)",
    ],
    limits: {
      shippingZones: 1,
    },
  },
  pro: {
    name: "Pro",
    price: 7.99,
    features: [
      "Unlimited shipping configurations",
      "Full color customization",
      "Holiday calendar",
      "Custom text labels",
      "All icon styles",
      "Priority support",
    ],
    limits: {
      shippingZones: -1, // unlimited
    },
  },
  premium: {
    name: "Premium",
    price: 14.99,
    features: [
      "Everything in Pro",
      "Multi-language support",
      "A/B testing",
      "Conversion analytics",
      "Multiple widget styles",
      "Dedicated support",
    ],
    limits: {
      shippingZones: -1,
    },
  },
};

// Loader: Check current subscription status
export const loader = async ({ request }) => {
  const { admin, billing } = await authenticate.admin(request);

  // Check if merchant has an active subscription
  const { hasActivePayment, appSubscriptions } =
    await billing.check({
      plans: ["Pro", "Premium"],
      isTest: true, // Set to false in production!
    });

  let currentPlan = "free";
  if (hasActivePayment && appSubscriptions.length > 0) {
    const activeSub = appSubscriptions[0];
    currentPlan = activeSub.name.toLowerCase();
  }

  return json({ currentPlan });
};

// Action: Handle plan upgrades
export const action = async ({ request }) => {
  const { billing } = await authenticate.admin(request);
  const formData = await request.formData();
  const plan = formData.get("plan");

  if (plan === "free") {
    // Cancel existing subscription
    await billing.cancel();
    return redirect("/app/billing");
  }

  const planConfig = PLANS[plan];
  if (!planConfig || planConfig.price === 0) {
    return json({ error: "Invalid plan" }, { status: 400 });
  }

  // Create the subscription charge
  await billing.request({
    plan: {
      name: planConfig.name,
      amount: planConfig.price,
      currencyCode: "USD",
      interval: "EVERY_30_DAYS", // Monthly billing
    },
    isTest: true, // SET TO FALSE BEFORE GOING LIVE!
    returnUrl: `https://${new URL(request.url).host}/app/billing`,
  });

  // Shopify automatically redirects the merchant to approve the charge
  // After approval, they come back to returnUrl above
};

// Component: Billing page UI
export default function BillingPage() {
  const { currentPlan } = useLoaderData();
  const submit = useSubmit();

  const handleUpgrade = (plan) => {
    const formData = new FormData();
    formData.set("plan", plan);
    submit(formData, { method: "post" });
  };

  return (
    <Page title="Pricing Plans" backAction={{ url: "/app" }}>
      {currentPlan !== "free" && (
        <Box paddingBlockEnd="400">
          <Banner tone="success">
            You're on the <strong>{PLANS[currentPlan]?.name}</strong> plan.
          </Banner>
        </Box>
      )}

      <Layout>
        {Object.entries(PLANS).map(([key, plan]) => (
          <Layout.Section key={key} variant="oneThird">
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="headingMd" as="h2">
                    {plan.name}
                  </Text>
                  {currentPlan === key && (
                    <Badge tone="success">Current</Badge>
                  )}
                </InlineStack>

                <Text variant="headingXl" as="p">
                  {plan.price === 0 ? "Free" : `$${plan.price}/mo`}
                </Text>

                <Divider />

                <BlockStack gap="200">
                  {plan.features.map((feature, i) => (
                    <InlineStack key={i} gap="200" blockAlign="start">
                      <Text as="span" tone="success">✓</Text>
                      <Text as="span">{feature}</Text>
                    </InlineStack>
                  ))}
                </BlockStack>

                <Box paddingBlockStart="200">
                  {currentPlan === key ? (
                    <Button disabled fullWidth>
                      Current Plan
                    </Button>
                  ) : key === "free" && currentPlan !== "free" ? (
                    <Button
                      onClick={() => handleUpgrade("free")}
                      fullWidth
                    >
                      Downgrade to Free
                    </Button>
                  ) : key !== "free" ? (
                    <Button
                      variant="primary"
                      onClick={() => handleUpgrade(key)}
                      fullWidth
                    >
                      {currentPlan === "free"
                        ? `Upgrade to ${plan.name}`
                        : `Switch to ${plan.name}`}
                    </Button>
                  ) : (
                    <Button disabled fullWidth>
                      Free Forever
                    </Button>
                  )}
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>
        ))}
      </Layout>
    </Page>
  );
}
