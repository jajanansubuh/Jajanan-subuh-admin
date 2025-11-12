import { Suspense } from 'react';
import CustomerClient from "./components/client";

export default async function CustomersPage(props: unknown) {
  const { params } = props as { params: { storeId: string } };

  return (
    <Suspense>
      <CustomerClient params={params} />
    </Suspense>
  );
}