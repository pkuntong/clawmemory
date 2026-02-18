import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const returnTo = url.searchParams.toString();
  const destination = returnTo ? `/app/setup?${returnTo}` : "/app/setup";
  throw redirect(destination);
};

export default function AdditionalRouteRedirect() {
  return null;
}
