/* eslint-disable @typescript-eslint/no-explicit-any */
import SalesPageClient from "@/components/dashboard/SalesPageClient";

// Minimal server wrapper. Use `any` for props to satisfy Next's generated PageProps checks.
export default function Page(props: any) {
  const params = props?.params ?? { storeId: undefined };
  return <SalesPageClient params={params} />;
}
