import "@shopify/shopify-app-react-router/adapters/node";
import type { BillingConfigSubscriptionLineItemPlan } from "@shopify/shopify-api";
import {
  ApiVersion,
  AppDistribution,
  BillingInterval,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

export const PLAN_FREE = "Free";
export const PLAN_PRO = "Pro";
export const PLAN_PREMIUM = "Premium";
export const PAID_PLAN_NAMES = [PLAN_PRO, PLAN_PREMIUM] as const;

const BILLING_TEST_MODE = process.env.SHOPIFY_BILLING_TEST_MODE !== "false";

export function isBillingTestMode() {
  return BILLING_TEST_MODE;
}

type BillingPlans = Record<
  (typeof PAID_PLAN_NAMES)[number],
  BillingConfigSubscriptionLineItemPlan
>;

export const BILLING_PLANS: BillingPlans = {
  [PLAN_PRO]: {
    lineItems: [
      {
        amount: 7.99,
        currencyCode: "USD",
        interval: BillingInterval.Every30Days,
      },
    ],
  },
  [PLAN_PREMIUM]: {
    lineItems: [
      {
        amount: 14.99,
        currencyCode: "USD",
        interval: BillingInterval.Every30Days,
      },
    ],
  },
};

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  billing: BILLING_PLANS,
  future: {
    expiringOfflineAccessTokens: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.October25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
