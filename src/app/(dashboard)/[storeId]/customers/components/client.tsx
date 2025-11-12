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
  const [loading, setLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    try {
      const response = await fetch(`/api/stores/${params.storeId}/customers`);
      const data = await response.json();
      setCustomers(data);
      setLoading(false);
    } catch {
      toast.error("Failed to load customers");
      setLoading(false);
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