import type { LoaderFunctionArgs } from "react-router";
import { redirect, Form, useLoaderData } from "react-router";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>Delivery Date Estimator & Countdown</h1>
        <p className={styles.text}>
          Show accurate delivery dates and urgency countdowns on product pages
          to increase conversion and reduce pre-sale shipping questions.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" />
              <span>Example: your-store.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Open Admin App
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>Reliable dates.</strong> Configure cutoff time, processing
            days, shipping range, and holidays in minutes.
          </li>
          <li>
            <strong>Urgency timer.</strong> Show Order within countdown copy
            that updates every second before cutoff.
          </li>
          <li>
            <strong>Theme friendly.</strong> Add as a product block in Theme
            Editor with no custom theme code.
          </li>
        </ul>
      </div>
    </div>
  );
}
