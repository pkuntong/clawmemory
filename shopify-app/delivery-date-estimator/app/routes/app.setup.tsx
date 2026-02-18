export default function SetupPage() {
  return (
    <s-page heading="Setup Guide">
      <s-section heading="Install Widget Block">
        <s-unordered-list>
          <s-list-item>Open Shopify Admin for your store.</s-list-item>
          <s-list-item>Go to Online Store, then Themes, then Customize.</s-list-item>
          <s-list-item>Open a product template and click Add block.</s-list-item>
          <s-list-item>Select Delivery Date Estimator.</s-list-item>
          <s-list-item>Save and preview on a live product page.</s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section heading="Recommended Defaults">
        <s-unordered-list>
          <s-list-item>Cutoff hour: 14 (2:00 PM local store time).</s-list-item>
          <s-list-item>Processing days: 1 business day.</s-list-item>
          <s-list-item>Shipping range: 3 to 5 business days.</s-list-item>
          <s-list-item>Exclude weekends: enabled.</s-list-item>
          <s-list-item>Countdown timer: enabled.</s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section heading="Validation Checklist">
        <s-unordered-list>
          <s-list-item>
            Test before and after cutoff to confirm the date changes as expected.
          </s-list-item>
          <s-list-item>
            Add at least one holiday date and verify it is skipped in estimates.
          </s-list-item>
          <s-list-item>
            Confirm styling and text render correctly on mobile and desktop.
          </s-list-item>
          <s-list-item>Check at least one theme other than Dawn if possible.</s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section slot="aside" heading="Documentation">
        <s-unordered-list>
          <s-list-item>
            <s-link
              href="https://shopify.dev/docs/apps/build/online-store/theme-app-extensions"
              target="_blank"
            >
              Theme app extension docs
            </s-link>
          </s-list-item>
          <s-list-item>
            <s-link href="/app/billing">Manage plans and billing</s-link>
          </s-list-item>
          <s-list-item>
            <s-link href="/app">Back to dashboard</s-link>
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}
