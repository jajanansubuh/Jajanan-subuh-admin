"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";

import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { columns, CustomersColumn } from "./columns";

interface CustomerClientProps {
  params: {
    storeId: string;
  };
}

export default function CustomerClient({
  params
}: CustomerClientProps) {
  const [customers, setCustomers] = useState<Array<CustomersColumn>>([]);
  

  const fetchCustomers = useCallback(async () => {
    try {
      // Debug: show which storeId we're requesting
      console.log('[CUSTOMER_CLIENT] fetching customers for storeId=', params.storeId);
      const response = await fetch(`/api/stores/${params.storeId}/customers`);
      // Log status for easier debugging
      console.log('[CUSTOMER_CLIENT] response status=', response.status);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        // If the server returned an error object, show it
        const isErrorShape = (v: unknown): v is { error?: unknown } =>
          typeof v === 'object' && v !== null && Object.prototype.hasOwnProperty.call(v, 'error');

        let msg = 'Failed to load customers';
        if (isErrorShape(data) && typeof (data as { error?: unknown }).error === 'string') {
          msg = String((data as { error?: unknown }).error);
        }

        console.error('[CUSTOMER_CLIENT] server error', data);
        toast.error(String(msg));
        setCustomers([]);
        return;
      }

      if (!Array.isArray(data)) {
        console.error('[CUSTOMER_CLIENT] unexpected response', data);
        toast.error('Unexpected response from server');
        setCustomers([]);
        return;
      }

      setCustomers(data);
    } catch {
      toast.error("Failed to load customers");
    }
  }, [params.storeId]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading
          title={`Customers (${customers.length})`}
          description="Manage your store customers"
        />
      </div>
      <Separator />
      <DataTable
        columns={columns}
        data={customers}
        searchKey="name"
      />
    </>
  );
}