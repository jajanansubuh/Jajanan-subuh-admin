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
  const storeId = params?.storeId;

  // Defensive: if storeId is missing, avoid calling the customers API which
  // would request `/api/stores/undefined/customers` and return a 500.
  if (!storeId) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">No store selected. Please open this page from a store context.</p>
      </div>
    );
  }
  const [customers, setCustomers] = useState<Array<CustomersColumn>>([]);
  

  const fetchCustomers = useCallback(async () => {
    try {
      const response = await fetch(`/api/stores/${storeId}/customers`);
      const data = await response.json();
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